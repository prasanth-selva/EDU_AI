"""
RAG Pipeline — PDF → Chunks → FAISS → Ollama Answer
Production-grade with proper error handling.
"""
import os, logging

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_DIR   = os.path.join(BASE_DIR, "db", "faiss_index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-minilm")
CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.rag")


def _get_embeddings():
    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_HOST)


def _get_llm():
    from langchain_ollama import OllamaLLM
    return OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=0.2)


def _get_vectorstore(embeddings):
    from langchain_community.vectorstores import FAISS
    idx = os.path.join(FAISS_DIR, "index.faiss")
    if os.path.exists(idx):
        return FAISS.load_local(
            FAISS_DIR, embeddings,
            allow_dangerous_deserialization=True
        )
    return None


def process_pdf_and_index(filepath: str, subject: str = "General") -> int:
    """Load PDF → chunk → embed → save/update FAISS index. Returns chunk count."""
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS

    os.makedirs(FAISS_DIR, exist_ok=True)

    loader = PyPDFLoader(filepath)
    pages  = loader.load()
    for p in pages:
        p.metadata["subject"] = subject

    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    docs     = splitter.split_documents(pages)
    if not docs:
        logger.warning(f"No text extracted from {filepath}")
        return 0

    embeddings = _get_embeddings()
    idx_path = os.path.join(FAISS_DIR, "index.faiss")
    if os.path.exists(idx_path):
        vs = FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
        vs.add_documents(docs)
    else:
        vs = FAISS.from_documents(docs, embeddings)
    vs.save_local(FAISS_DIR)
    logger.info(f"Indexed {len(docs)} chunks from {filepath}")
    return len(docs)


PROMPT_TEMPLATE = """You are a helpful, encouraging AI tutor for school students.
Use the textbook context below to answer the student's question clearly and simply.
If the context doesn't contain the answer, say so honestly and give a brief general answer.

Textbook Context:
{context}

Student Question: {question}

Answer (be clear, friendly, and educational):"""


def get_answer(question: str) -> str:
    """Retrieve relevant context and generate an answer via Ollama."""
    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)

        if vs is None:
            return (
                "📚 No textbooks uploaded yet!\n\n"
                "Ask your teacher to upload PDF textbooks from the Teacher Dashboard. "
                "Once uploaded, I can answer questions from them!"
            )

        docs    = vs.similarity_search(question, k=4)
        context = "\n\n---\n\n".join(d.page_content for d in docs)

        from langchain_core.prompts import PromptTemplate
        llm    = _get_llm()
        prompt = PromptTemplate(
            input_variables=["context", "question"],
            template=PROMPT_TEMPLATE
        )
        chain  = prompt | llm
        result = chain.invoke({"context": context, "question": question})
        answer = str(result).strip()
        return answer if answer else "I couldn't generate an answer. Please try again."

    except Exception as e:
        logger.exception("RAG pipeline error")
        return (
            f"⚠️ The AI Tutor encountered an error.\n\n"
            f"Please ensure Ollama is running: `ollama serve`\n\n"
            f"Error details: {str(e)}"
        )

def get_context_for_subject(subject: str, k: int = 4) -> str:
    """Retrieve random context chunks for a specific subject to use in quiz generation."""
    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)
        if vs is None:
            return ""
        
        # We can just search for the subject name to get relevant chunks
        docs = vs.similarity_search(subject, k=k)
        
        # Filter by metadata if it exists
        filtered_docs = [d for d in docs if d.metadata.get("subject", "") == subject]
        if not filtered_docs:
            filtered_docs = docs # Fallback if metadata is missing or wrong
            
        context = "\n\n---\n\n".join(d.page_content for d in filtered_docs)
        return context
    except Exception as e:
        logger.exception("RAG pipeline error getting context")
        return ""
