"""
RAG Pipeline — PDF → Chunks → FAISS → Strict Ollama Answer
STRICT MODE: Only answers from uploaded textbooks. Verified with similarity threshold.
"""
import os, logging

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_DIR   = os.path.join(BASE_DIR, "db", "faiss_index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-minilm")
CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

# FAISS L2 distance threshold — scores ABOVE this mean the retrieved chunks
# are too dissimilar to the question, so we refuse to answer.
# all-minilm L2 distance: 0.0 = identical, ~1.0 = very different.
# Typical range for "relevant" content is < 0.8.
SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.85"))

logger = logging.getLogger("edumentor.rag")
logger.setLevel(logging.DEBUG)

NO_CONTEXT_REPLY = "This answer was not found in the uploaded textbook."


def _get_embeddings():
    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_HOST)


def _get_llm():
    from langchain_ollama import OllamaLLM
    # Very low temperature = factual, no creative hallucination
    return OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=0.05)


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
    """
    Load PDF → chunk → embed → save/update FAISS index.
    Returns chunk count. Raises ValueError on failure.
    """
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS

    logger.info(f"[INDEXING START] file='{filepath}' subject='{subject}'")

    try:
        os.makedirs(FAISS_DIR, exist_ok=True)
    except Exception as e:
        logger.error(f"[INDEXING] Cannot create FAISS dir: {e}")
        raise ValueError(f"Failed to create database directory: {e}")

    loader = PyPDFLoader(filepath)
    pages  = loader.load()

    if not pages:
        raise ValueError("PDF appears to be empty or unreadable (no pages found).")

    logger.info(f"[INDEXING] Loaded {len(pages)} pages from PDF.")

    for p in pages:
        p.metadata["subject"] = subject
        p.metadata["source"]  = os.path.basename(filepath)

    # Larger chunks with good overlap to preserve paragraph context
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    docs = splitter.split_documents(pages)

    if not docs:
        raise ValueError("No text could be extracted from the PDF. It may be a scanned image PDF.")

    logger.info(f"[INDEXING] Created {len(docs)} chunks.")

    try:
        embeddings  = _get_embeddings()
        idx_path    = os.path.join(FAISS_DIR, "index.faiss")
        if os.path.exists(idx_path):
            vs = FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
            vs.add_documents(docs)
            logger.info(f"[INDEXING] Appended to existing FAISS index.")
        else:
            vs = FAISS.from_documents(docs, embeddings)
            logger.info(f"[INDEXING] Created new FAISS index.")
        vs.save_local(FAISS_DIR)
        logger.info(f"[INDEXING SUCCESS] {len(docs)} chunks indexed for '{subject}' from '{filepath}'")
        return len(docs)
    except Exception as e:
        logger.error(f"[INDEXING FAIL] Embedding/FAISS error: {e}")
        raise ValueError(f"Embedding or vector storage failed: {e}")


# ── Strict RAG Prompt ─────────────────────────────────────────────────────────
PROMPT_TEMPLATE = """You are Edu Mentor AI, a strict educational assistant for school students.

CRITICAL RULES:
1. Answer ONLY using information found in the TEXTBOOK CONTEXT section below.
2. If the textbook context does not contain the answer, reply ONLY with:
   "This answer was not found in the uploaded textbook."
3. Do NOT invent facts. Do NOT use your own general knowledge.
4. Keep your answer clear and age-appropriate for school students.

TEXTBOOK CONTEXT:
{context}

STUDENT QUESTION: {question}

ANSWER (strictly from textbook context):"""


def get_answer(question: str) -> str:
    """
    Retrieve relevant context using FAISS and answer STRICTLY from it.
    If similarity score is above threshold, refuse to answer.
    """
    logger.info(f"[RAG QUERY] '{question}'")

    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)

        if vs is None:
            logger.warning("[RAG] FAISS index does not exist.")
            return (
                "📚 No textbooks uploaded yet!\n\n"
                "Ask your teacher to upload PDF textbooks from the Teacher Dashboard. "
                "Once uploaded, I can answer questions directly from them."
            )

        # Retrieve with scores (FAISS L2: lower = more similar)
        docs_and_scores = vs.similarity_search_with_score(question, k=5)

        if not docs_and_scores:
            logger.warning("[RAG] No chunks retrieved.")
            return NO_CONTEXT_REPLY

        # Log every retrieved chunk for auditing
        logger.info(f"[RAG RETRIEVAL] {len(docs_and_scores)} chunks retrieved:")
        for i, (doc, score) in enumerate(docs_and_scores):
            logger.info(
                f"  [CHUNK {i+1}] score={score:.4f} | "
                f"source='{doc.metadata.get('source', 'unknown')}' | "
                f"subject='{doc.metadata.get('subject', 'unknown')}' | "
                f"page={doc.metadata.get('page', '?')}"
            )
            logger.debug(f"  [CHUNK {i+1} TEXT] {doc.page_content[:200]}")

        # Hard threshold check: if best match is too dissimilar, refuse
        best_score = docs_and_scores[0][1]
        if best_score > SIMILARITY_THRESHOLD:
            logger.warning(
                f"[RAG THRESHOLD] Best score {best_score:.4f} > threshold {SIMILARITY_THRESHOLD}. "
                "No relevant context found. Refusing to answer."
            )
            return NO_CONTEXT_REPLY

        # Use only chunks below threshold
        relevant_docs = [(doc, score) for doc, score in docs_and_scores if score <= SIMILARITY_THRESHOLD]
        context = "\n\n---\n\n".join(doc.page_content for doc, _ in relevant_docs)

        logger.info(f"[RAG] Using {len(relevant_docs)} relevant chunks for answer generation.")

        from langchain_core.prompts import PromptTemplate
        llm    = _get_llm()
        prompt = PromptTemplate(input_variables=["context", "question"], template=PROMPT_TEMPLATE)
        chain  = prompt | llm

        result = chain.invoke({"context": context, "question": question})
        answer = str(result).strip()

        if not answer:
            return NO_CONTEXT_REPLY

        logger.info(f"[RAG SUCCESS] Answer generated ({len(answer)} chars).")
        return answer

    except Exception as e:
        logger.exception("[RAG ERROR]")
        return (
            f"⚠️ The AI Tutor encountered an error.\n\n"
            f"Please ensure Ollama is running: `ollama serve`\n\n"
            f"Error: {str(e)}"
        )


def get_context_for_subject(subject: str, k: int = 5) -> str:
    """
    Retrieve relevant textbook chunks for a specific subject (for quiz generation).
    Returns empty string if no index exists or no relevant content found.
    """
    logger.debug(f"[QUIZ CTX] Fetching context for subject='{subject}'")
    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)
        if vs is None:
            logger.warning("[QUIZ CTX] FAISS index does not exist.")
            return ""

        # Search for subject-related content
        docs_and_scores = vs.similarity_search_with_score(subject, k=k)

        if not docs_and_scores:
            logger.warning(f"[QUIZ CTX] No chunks for '{subject}'.")
            return ""

        # Log retrieved chunks
        for i, (doc, score) in enumerate(docs_and_scores):
            logger.debug(
                f"  [QUIZ CHUNK {i+1}] score={score:.4f} | "
                f"source='{doc.metadata.get('source', 'unknown')}' | "
                f"subject_meta='{doc.metadata.get('subject', 'unknown')}'"
            )
            logger.debug(f"  [QUIZ CHUNK {i+1} TEXT] {doc.page_content[:150]}")

        # Try to use metadata-matched chunks first
        subject_matched = [d for d, _ in docs_and_scores if d.metadata.get("subject") == subject]
        if subject_matched:
            logger.info(f"[QUIZ CTX] {len(subject_matched)} metadata-matched chunks for '{subject}'.")
            chosen = subject_matched
        else:
            logger.info(f"[QUIZ CTX] No metadata match for '{subject}'; using top similarity results.")
            chosen = [d for d, _ in docs_and_scores]

        context = "\n\n---\n\n".join(d.page_content for d in chosen)
        return context

    except Exception as e:
        logger.exception(f"[QUIZ CTX ERROR] {e}")
        return ""
