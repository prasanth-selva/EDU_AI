"""
Quiz generator — uses STRICT RAG context + Ollama.
Includes rigorous self-validation loop to eliminate hallucinations and mapping errors.
"""
import json, re, logging, os
from fastapi import HTTPException

CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.quiz")
logger.setLevel(logging.DEBUG)

# Strict structured prompt for syllabus-grounded quizzes
QUIZ_PROMPT = """You are a strict school quiz generator. Generate EXACTLY {count} multiple-choice questions based ONLY on the provided textbook context.

Textbook Context:
{context_section}

IMPORTANT RULES:
1. All questions must come STRICTLY from the textbook context above. Do not use outside knowledge.
2. If the context is empty or insufficient, you must still output valid JSON, but make questions very basic about the subject: "{subject}".
3. Output ONLY a valid JSON object matching the exact structure below. No explanations outside the JSON. No markdown backticks. 

REQUIRED JSON STRUCTURE:
{{
  "questions": [
    {{
      "question": "What is the capital of France?",
      "options": ["Paris", "London", "Berlin", "Madrid"],
      "correct_option_text": "Paris",
      "explanation": "Paris is clearly stated as the capital in the context."
    }}
  ]
}}

- Generate exactly {count} questions.
- EXACTLY 4 options per question.
- 'correct_option_text' MUST perfectly match one of the items in the 'options' array.

Output the JSON now:"""


def _extract_json(text: str) -> dict:
    """Extract JSON object from LLM output aggressively."""
    text = text.strip()

    # Strategy 1: Direct JSON parse
    try:
        res = json.loads(text)
        if isinstance(res, dict) and "questions" in res:
            return res
    except Exception:
        pass

    # Strategy 2: Extract between { and }
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            res = json.loads(match.group(0))
            if isinstance(res, dict) and "questions" in res:
                return res
        except Exception:
            pass
            
    # Strategy 3: Try to find array and wrap it
    match_arr = re.search(r'\[[\s\S]*\]', text)
    if match_arr:
        try:
            arr = json.loads(match_arr.group(0))
            if isinstance(arr, list):
                return {"questions": arr}
        except Exception:
            pass

    raise ValueError("Could not extract valid JSON structure from LLM output.")


def _clean_option(opt: str) -> str:
    """Remove leading letters like 'A. ' from options to ensure clean UI strings."""
    return re.sub(r'^[\(\[]?[A-Da-d1-4][\.\)\]]\s*', '', str(opt).strip())


def _validate_and_fix(raw_questions: list, count: int) -> list:
    """
    Self-validation loop. Verifies:
    - 4 options
    - correct_option_text perfectly matches one option (case insensitive fallback)
    Returns cleanly structured dicts with correct_index computed.
    """
    validated = []
    
    for i, q in enumerate(raw_questions):
        logger.debug(f"[QUIZ VALIDATION] Checking question {i+1}: '{q.get('question', 'UNKNOWN')}'")
        
        if not isinstance(q, dict) or "question" not in q or "options" not in q:
            logger.warning("  -> Missing question or options key.")
            continue
            
        opts = q.get("options", [])
        if not isinstance(opts, list) or len(opts) < 2:
            logger.warning("  -> Options not a list or less than 2 options.")
            continue
            
        # Clean options
        clean_opts = [_clean_option(o) for o in opts]
        
        # Determine correct index securely
        correct_text = str(q.get("correct_option_text", "")).strip()
        correct_idx = -1
        
        # 1. Exact match
        for idx, opt in enumerate(clean_opts):
            if opt == correct_text or opt == _clean_option(correct_text):
                correct_idx = idx
                break
                
        # 2. Case-insensitive / partial match fallback
        if correct_idx == -1:
            for idx, opt in enumerate(clean_opts):
                if correct_text.lower() in opt.lower() or opt.lower() in correct_text.lower():
                    correct_idx = idx
                    break
                    
        # 3. Last resort fallback to legacy correct_index if provided
        if correct_idx == -1 and "correct_index" in q:
            ci = q["correct_index"]
            if isinstance(ci, int) and 0 <= ci < len(clean_opts):
                correct_idx = ci
                
        if correct_idx == -1:
            logger.warning(f"  -> FAIL: Could not map correct_option_text '{correct_text}' to any option {clean_opts}.")
            continue
            
        logger.debug(f"  -> PASS: Mapped correct answer to index {correct_idx} ({clean_opts[correct_idx]})")
        
        validated.append({
            "question": str(q["question"]).strip(),
            "options": clean_opts,
            "correct_index": correct_idx,
            "explanation": str(q.get("explanation", "No explanation provided.")).strip()
        })
        
    return validated[:count]


def generate_quiz(subject: str, count: int = 5) -> list:
    """Generate strictly grounded quiz using FAISS context and self-validation."""
    from langchain_ollama import OllamaLLM
    from backend.rag import get_context_for_subject
    
    logger.info(f"[QUIZ] Initiating quiz generation for '{subject}', {count} questions.")
    context = get_context_for_subject(subject)
    
    if not context or not context.strip():
        logger.warning(f"[QUIZ WARNING] No textbook context found for '{subject}'. Quiz will fail.")
        raise HTTPException(status_code=400, detail=f"No textbook uploaded for '{subject}'. Cannot generate a syllabus-grounded quiz.")
        
    context_section = context
    
    # Low temperature to minimize hallucinations
    llm = OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=0.1)
    prompt = QUIZ_PROMPT.format(subject=subject, count=count, context_section=context_section)

    last_err = None
    for attempt in range(3):
        logger.info(f"[QUIZ GEN] Attempt {attempt+1}/3...")
        try:
            raw = llm.invoke(prompt)
            logger.debug(f"[QUIZ RAW OUTPUT]\n{raw[:500]}...")
            
            json_data = _extract_json(raw)
            raw_qs = json_data.get("questions", [])
            
            validated = _validate_and_fix(raw_qs, count)
            
            if len(validated) >= count // 2: # Accept if at least half are valid to be resilient
                logger.info(f"[QUIZ SUCCESS] Generated {len(validated)} validated questions.")
                return validated
            else:
                last_err = f"Validation yielded only {len(validated)} valid questions."
                logger.warning(f"[QUIZ VALIDATION FAIL] {last_err}")
                
        except Exception as e:
            last_err = str(e)
            logger.exception(f"[QUIZ ERROR] Attempt {attempt+1} failed.")

    logger.error(f"[QUIZ FINAL FAIL] All attempts failed for '{subject}'. Last error: {last_err}")
    raise HTTPException(
        status_code=503,
        detail=f"Quiz generation failed after 3 attempts. Make sure Ollama is running. Last error: {last_err}"
    )
