"""
RAG Pipeline — PDF → Chunks → FAISS → Ollama Answer
Strict RAG Mode enabled with deep logging and error propagation.
"""
import os, logging

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_DIR   = os.path.join(BASE_DIR, "db", "faiss_index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-minilm")
CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.rag")
logger.setLevel(logging.DEBUG) # Enforce deep logging


def _get_embeddings():
    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_HOST)


def _get_llm():
    from langchain_ollama import OllamaLLM
    # Lower temperature for strictly grounded answers
    return OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=0.1)


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

    logger.info(f"[INDEXING] Starting indexing for {filepath} under subject '{subject}'")
    
    try:
        os.makedirs(FAISS_DIR, exist_ok=True)
    except Exception as e:
        logger.error(f"[INDEXING FAIL] Could not create FAISS directory: {e}")
        raise ValueError(f"Failed to create database directory: {e}")

    loader = PyPDFLoader(filepath)
    pages  = loader.load()
    for p in pages:
        p.metadata["subject"] = subject

    # Enhanced chunking strategy for better context
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs     = splitter.split_documents(pages)
    
    if not docs or len(docs) == 0:
        logger.error(f"[INDEXING FAIL] No text extracted from {filepath}")
        raise ValueError("Could not extract any text from the PDF. It might be scanned or empty.")

    try:
        embeddings = _get_embeddings()
        idx_path = os.path.join(FAISS_DIR, "index.faiss")
        if os.path.exists(idx_path):
            vs = FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
            vs.add_documents(docs)
        else:
            vs = FAISS.from_documents(docs, embeddings)
        vs.save_local(FAISS_DIR)
        
        logger.info(f"[INDEXING SUCCESS] Indexed {len(docs)} chunks from {filepath}")
        return len(docs)
    except Exception as e:
        logger.error(f"[INDEXING FAIL] Failed to generate embeddings or save FAISS: {e}")
        raise ValueError(f"Embedding/Vector generation failed: {e}")


PROMPT_TEMPLATE = """You are Edu Mentor AI, a strict, factual educational assistant.

IMPORTANT RULES:
1. Answer ONLY using the retrieved textbook context provided below.
2. If the answer is not available inside the uploaded textbook context, reply EXACTLY with: "I couldn't find this answer in the uploaded syllabus."
3. Do not invent answers. Do not guess. Do not use external knowledge.

Textbook Context:
{context}

Student Question: {question}

Answer (strict, clear, and educational based on context):"""


def get_answer(question: str) -> str:
    """Retrieve relevant context and generate an answer strictly from it."""
    logger.debug(f"[RAG SEARCH] Searching for: '{question}'")
    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)

        if vs is None:
            logger.warning("[RAG] FAISS index is empty or not found.")
            return (
                "📚 No textbooks uploaded yet!\n\n"
                "Ask your teacher to upload PDF textbooks from the Teacher Dashboard. "
                "Once uploaded, I can answer questions from them!"
            )

        # Retrieve with similarity scores (lower distance = better match in FAISS)
        docs_and_scores = vs.similarity_search_with_score(question, k=4)
        
        if not docs_and_scores:
            logger.warning("[RAG] No chunks retrieved from FAISS.")
            return "I couldn't find this answer in the uploaded syllabus."

        context_parts = []
        for i, (doc, score) in enumerate(docs_and_scores):
            # Log exact retrieved chunks and their scores for auditing
            logger.debug(f"  [CHUNK {i+1}] Score: {score:.4f} | Source: {doc.metadata.get('source', 'unknown')} | Subject: {doc.metadata.get('subject', 'unknown')}")
            logger.debug(f"  [CHUNK {i+1} CONTENT] {doc.page_content[:150]}...")
            context_parts.append(doc.page_content)
            
        context = "\n\n---\n\n".join(context_parts)

        from langchain_core.prompts import PromptTemplate
        llm    = _get_llm()
        prompt = PromptTemplate(
            input_variables=["context", "question"],
            template=PROMPT_TEMPLATE
        )
        
        chain  = prompt | llm
        
        logger.debug(f"[LLM PROMPT GENERATED]\n{prompt.format(context=context, question=question)}")
        
        result = chain.invoke({"context": context, "question": question})
        answer = str(result).strip()
        
        logger.info(f"[RAG SUCCESS] Generated answer for question: '{question}'")
        return answer if answer else "I couldn't generate an answer. Please try again."

    except Exception as e:
        logger.exception("[RAG ERROR] Pipeline exception")
        return (
            f"⚠️ The AI Tutor encountered an error.\n\n"
            f"Please ensure Ollama is running: `ollama serve`\n\n"
            f"Error details: {str(e)}"
        )

def get_context_for_subject(subject: str, k: int = 4) -> str:
    """Retrieve highly relevant chunks for a specific subject to use in quiz generation."""
    logger.debug(f"[QUIZ CONTEXT] Fetching context for subject: '{subject}'")
    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)
        if vs is None:
            logger.warning("[QUIZ CONTEXT] FAISS index missing.")
            return ""
        
        # Search by subject name to pull broad concepts
        docs = vs.similarity_search(subject, k=k)
        
        # Strictly filter by metadata
        filtered_docs = [d for d in docs if d.metadata.get("subject", "") == subject]
        
        if not filtered_docs:
            logger.warning(f"[QUIZ CONTEXT] Metadata filter failed for '{subject}'. Falling back to raw search chunks.")
            filtered_docs = docs
            
        context_parts = []
        for i, doc in enumerate(filtered_docs):
            logger.debug(f"  [QUIZ CHUNK {i+1}] {doc.page_content[:100]}...")
            context_parts.append(doc.page_content)
            
        context = "\n\n---\n\n".join(context_parts)
        return context
    except Exception as e:
        logger.exception("[QUIZ CONTEXT ERROR]")
        return ""
