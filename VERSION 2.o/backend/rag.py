"""
RAG Pipeline — PDF → Chunks → FAISS → Ollama Answer
Falls back gracefully if Ollama is not available.
"""
import os, logging

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_DIR     = os.path.join(BASE_DIR, "db", "faiss_index")
EMBED_MODEL   = os.getenv("EMBED_MODEL", "all-minilm")
CHAT_MODEL    = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST   = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.rag")

# ---- Lazy imports so the app starts even if langchain not installed yet ----
def _get_embeddings():
    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_HOST)

def _get_llm():
    from langchain_ollama import OllamaLLM
    return OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST)

def _get_vectorstore(embeddings):
    from langchain_community.vectorstores import FAISS
    if os.path.exists(os.path.join(FAISS_DIR, "index.faiss")):
        return FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
    return None

def process_pdf_and_index(filepath: str, subject: str = "General") -> int:
    """Load PDF, chunk, embed, and save/update the FAISS index. Returns chunk count."""
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS

    os.makedirs(FAISS_DIR, exist_ok=True)
    loader   = PyPDFLoader(filepath)
    pages    = loader.load()
    for p in pages:
        p.metadata["subject"] = subject

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=80)
    docs     = splitter.split_documents(pages)
    if not docs:
        return 0

    embeddings = _get_embeddings()
    if os.path.exists(os.path.join(FAISS_DIR, "index.faiss")):
        vs = FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
        vs.add_documents(docs)
    else:
        vs = FAISS.from_documents(docs, embeddings)
    vs.save_local(FAISS_DIR)
    logger.info(f"Indexed {len(docs)} chunks from {filepath}")
    return len(docs)

PROMPT_TEMPLATE = """You are a helpful, encouraging AI tutor for school students.
Answer the student's question using the context from their textbooks below.
Be clear, simple, and friendly. If the context doesn't contain the answer, say so honestly.

Context from textbooks:
{context}

Student's Question: {question}

Answer:"""

def get_answer(question: str) -> str:
    """Retrieve relevant context and generate an answer via Ollama."""
    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)
        if vs is None:
            return ("📚 No books uploaded yet! Ask your teacher to upload textbook PDFs "
                    "via the Teacher Dashboard first.")

        docs = vs.similarity_search(question, k=4)
        context = "\n\n".join(d.page_content for d in docs)

        from langchain.prompts import PromptTemplate
        from langchain.chains import LLMChain
        llm    = _get_llm()
        prompt = PromptTemplate(input_variables=["context","question"], template=PROMPT_TEMPLATE)
        chain  = LLMChain(llm=llm, prompt=prompt)
        result = chain.run(context=context, question=question)
        return result.strip()
    except Exception as e:
        logger.exception("RAG error")
        return (f"⚠️ The AI Tutor is unavailable right now. "
                f"Please make sure Ollama is running with: `ollama serve`\n\nError: {e}")
