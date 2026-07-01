"""
RAG Pipeline — PDF → Chunks → FAISS → Hybrid Ollama Answer
HYBRID MODE: Answers from uploaded textbooks when possible. Falls back to General AI if no context found.
"""
import os, logging, json

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_DIR   = os.path.join(BASE_DIR, "db", "faiss_index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-minilm")
CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

# FAISS L2 distance threshold — scores ABOVE this mean the retrieved chunks
# are too dissimilar to the question, so we fallback to the general LLM.
# all-minilm L2 distance typically ranges from 0 to 2.
SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "1.1"))

logger = logging.getLogger("edumentor.rag")
logger.setLevel(logging.DEBUG)


def _get_embeddings():
    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=EMBED_MODEL, base_url=OLLAMA_HOST)


def _get_llm(temperature=0.05):
    from langchain_ollama import OllamaLLM
    return OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=temperature)


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


# ── Strict RAG Prompt (Textbook Context) ──────────────────────────────────────
STRICT_PROMPT_TEMPLATE = """You are Edu Mentor AI, an educational assistant for school students.

CRITICAL RULES:
1. Answer ONLY using information found in the TEXTBOOK CONTEXT section below.
2. Do NOT invent facts. Do NOT use your own general knowledge.
3. Keep your answer clear and age-appropriate for school students.

TEXTBOOK CONTEXT:
{context}

STUDENT QUESTION: {question}

ANSWER (strictly from textbook context):"""

# ── General Fallback Prompt ───────────────────────────────────────────────────
GENERAL_PROMPT_TEMPLATE = """You are Edu Mentor AI, a friendly and knowledgeable educational assistant for school students.

The student has asked a question that is not covered in their uploaded textbooks.
Answer the question using your general knowledge.

CRITICAL RULES:
1. Keep the answer highly accurate and age-appropriate for a school student.
2. Explain concepts simply and clearly.
3. Be encouraging and helpful.

STUDENT QUESTION: {question}

ANSWER:"""


def get_answer(question: str) -> dict:
    """
    Retrieve relevant context using FAISS. 
    If a good match exists, answer STRICTLY from it.
    If similarity score is above threshold (no good match), fall back to General AI.
    
    Returns: {"answer": str, "source_type": "textbook" | "general", "sources": list}
    """
    logger.info(f"[RAG QUERY] '{question}'")
    
    result_dict = {
        "answer": "",
        "source_type": "general",
        "sources": []
    }

    try:
        embeddings = _get_embeddings()
        vs = _get_vectorstore(embeddings)

        docs_and_scores = []
        if vs is not None:
            docs_and_scores = vs.similarity_search_with_score(question, k=5)
            
        if not docs_and_scores:
            logger.warning("[RAG] No chunks retrieved or index missing. Falling back to General AI.")
            # Fallback to general LLM directly
            result_dict = _generate_general_answer(question)
            return result_dict

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

        # Hard threshold check: if best match is too dissimilar, fallback
        best_score = docs_and_scores[0][1]
        if best_score > SIMILARITY_THRESHOLD:
            logger.warning(
                f"[RAG THRESHOLD] Best score {best_score:.4f} > threshold {SIMILARITY_THRESHOLD}. "
                "No relevant context found. Falling back to General AI."
            )
            result_dict = _generate_general_answer(question)
            return result_dict

        # Use only chunks below threshold
        relevant_docs = [(doc, score) for doc, score in docs_and_scores if score <= SIMILARITY_THRESHOLD]
        context = "\n\n---\n\n".join(doc.page_content for doc, _ in relevant_docs)

        # Extract unique sources
        sources = list(set([doc.metadata.get('source', 'unknown') for doc, _ in relevant_docs]))

        logger.info(f"[RAG] Using {len(relevant_docs)} relevant chunks. Sources: {sources}")

        from langchain_core.prompts import PromptTemplate
        llm    = _get_llm(temperature=0.05) # Low temp for factual textbook extraction
        prompt = PromptTemplate(input_variables=["context", "question"], template=STRICT_PROMPT_TEMPLATE)
        chain  = prompt | llm

        answer = chain.invoke({"context": context, "question": question})
        
        result_dict["answer"] = str(answer).strip()
        result_dict["source_type"] = "textbook"
        result_dict["sources"] = sources
        
        if not result_dict["answer"]:
             logger.warning("[RAG] Textbook extraction returned empty. Falling back to General AI.")
             return _generate_general_answer(question)

        logger.info(f"[RAG SUCCESS] Textbook Answer generated ({len(result_dict['answer'])} chars).")
        return result_dict

    except Exception as e:
        logger.exception("[RAG ERROR]")
        result_dict["answer"] = (
            f"⚠️ The AI Tutor encountered an error.\n\n"
            f"Please ensure Ollama is running: `ollama serve`\n\n"
            f"Error: {str(e)}"
        )
        return result_dict

def _generate_general_answer(question: str) -> dict:
    """Helper to generate an answer using the general LLM fallback."""
    from langchain_core.prompts import PromptTemplate
    try:
        # Slightly higher temperature for general conversational knowledge
        llm = _get_llm(temperature=0.4)
        prompt = PromptTemplate(input_variables=["question"], template=GENERAL_PROMPT_TEMPLATE)
        chain = prompt | llm
        
        answer = chain.invoke({"question": question})
        return {
            "answer": str(answer).strip(),
            "source_type": "general",
            "sources": []
        }
    except Exception as e:
         logger.exception("[RAG GENERAL ERROR]")
         return {
            "answer": f"⚠️ General AI fallback failed. Error: {str(e)}",
            "source_type": "general",
            "sources": []
        }


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

        # Try to use metadata-matched chunks first
        subject_matched = [d for d, _ in docs_and_scores if d.metadata.get("subject") == subject]
        if subject_matched:
            chosen = subject_matched
        else:
            chosen = [d for d, _ in docs_and_scores]

        context = "\n\n---\n\n".join(d.page_content for d in chosen)
        return context

    except Exception as e:
        logger.exception(f"[QUIZ CTX ERROR] {e}")
        return ""
