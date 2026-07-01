import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db")
FAISS_INDEX_PATH = os.path.join(DB_DIR, "faiss_index")

# Using nomic-embed-text for fast, local embedding
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Using qwen2.5:1.5b for chat by default (fast and small)
llm = Ollama(model="qwen2.5:1.5b")

def process_pdf_and_index(filepath: str, subject: str = "General"):
    """
    Loads a PDF, splits it into chunks, and adds it to the FAISS vector store.
    """
    loader = PyPDFLoader(filepath)
    pages = loader.load()
    
    # Add metadata
    for page in pages:
        page.metadata["subject"] = subject
        
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.split_documents(pages)
    
    if os.path.exists(FAISS_INDEX_PATH):
        vectorstore = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
        vectorstore.add_documents(docs)
    else:
        vectorstore = FAISS.from_documents(docs, embeddings)
        
    vectorstore.save_local(FAISS_INDEX_PATH)
    return len(docs)

def get_answer(question: str) -> str:
    """
    Retrieves relevant chunks and generates an answer using Ollama.
    """
    if not os.path.exists(FAISS_INDEX_PATH):
        return "I haven't read any books yet! Please ask your teacher to upload some PDFs."
        
    vectorstore = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    template = """You are an offline AI Tutor for students. 
Answer the following question clearly and simply based on the provided context from their textbooks. 
If the answer is not in the context, just say that you don't know based on the current books.

Context:
{context}

Question: {question}

Helpful Answer:"""
    
    QA_CHAIN_PROMPT = PromptTemplate(input_variables=["context", "question"], template=template)
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": QA_CHAIN_PROMPT}
    )
    
    try:
        response = qa_chain.invoke({"query": question})
        return response.get("result", "Sorry, I couldn't process that.")
    except Exception as e:
        print(f"Error querying Ollama: {e}")
        return "Oops, something went wrong. Make sure Ollama is running in the background!"
