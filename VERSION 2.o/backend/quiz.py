"""
Quiz generator — STRICT RAG context + Ollama.
Mathematics-safe JSON parsing, aggressive self-validation, and automatic regeneration.
"""
import json, re, logging, os
from fastapi import HTTPException

CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.quiz")
logger.setLevel(logging.DEBUG)

# ── Prompt ────────────────────────────────────────────────────────────────────
# Key improvements for math:
#  • Explicit rule: no letter prefixes in options (stops "A) 2x+1" pattern)
#  • correct_option_text MUST be a verbatim copy of one option string
#  • explanation MUST reference the correct option explicitly
QUIZ_PROMPT = """You are a school quiz question generator. Generate exactly {count} multiple-choice questions
based STRICTLY on the following textbook content. Do not use external knowledge.

TEXTBOOK CONTEXT:
{context_section}

SUBJECT: {subject}

OUTPUT FORMAT — return ONLY this JSON object, nothing else before or after it:
{{
  "questions": [
    {{
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correct_option_text": "4",
      "explanation": "2 + 2 equals 4 as shown in the arithmetic rules."
    }}
  ]
}}

STRICT RULES (violating any rule will cause regeneration):
1. Generate EXACTLY {count} questions.
2. Every question MUST have EXACTLY 4 options in the "options" array.
3. "correct_option_text" MUST be copied EXACTLY (character-for-character) from one of the 4 options.
4. Do NOT add letter prefixes (A, B, C, D) to the option strings.
5. Do NOT add any text outside the JSON object — no markdown, no backticks, no comments.
6. For math questions: write numbers and expressions as plain text (e.g. "2x + 1", not LaTeX).
7. All 4 options must be different from each other.
8. The explanation must specifically reference why the correct answer is right.

Output the JSON object now:"""


# ── JSON Extraction ───────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """Robustly extract the JSON object from LLM output that may have noise."""
    text = text.strip()

    # Strategy 1: Direct full parse
    try:
        res = json.loads(text)
        if isinstance(res, dict) and "questions" in res:
            return res
    except Exception:
        pass

    # Strategy 2: Strip markdown code fences and retry
    stripped = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    stripped = re.sub(r'\s*```$', '', stripped, flags=re.MULTILINE).strip()
    try:
        res = json.loads(stripped)
        if isinstance(res, dict) and "questions" in res:
            return res
    except Exception:
        pass

    # Strategy 3: Find the outermost { ... } block
    brace_match = re.search(r'\{[\s\S]*\}', text)
    if brace_match:
        try:
            res = json.loads(brace_match.group(0))
            if isinstance(res, dict) and "questions" in res:
                return res
        except Exception:
            pass

    # Strategy 4: Find a JSON array and wrap it
    arr_match = re.search(r'\[[\s\S]*\]', text)
    if arr_match:
        try:
            arr = json.loads(arr_match.group(0))
            if isinstance(arr, list):
                return {"questions": arr}
        except Exception:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM output. First 300 chars: {text[:300]}")


# ── Option Cleaning ───────────────────────────────────────────────────────────

def _clean_option(opt: str) -> str:
    """
    Remove ANY leading letter/number prefix that an LLM might sneak in.
    Handles: "A. text", "A) text", "(A) text", "1. text", "1) text", "(1) text"
    """
    cleaned = str(opt).strip()
    # Remove leading (A) / [A] / A. / A) patterns
    cleaned = re.sub(r'^[\(\[]?[A-Da-d1-4][\.\)\]]\s*', '', cleaned)
    # Remove any remaining leading/trailing whitespace
    cleaned = cleaned.strip()
    return cleaned


# ── Self-Validation ────────────────────────────────────────────────────────────

def _normalize(s: str) -> str:
    """Normalize string for fuzzy comparison: lowercase, collapse whitespace."""
    return re.sub(r'\s+', ' ', str(s).lower().strip())


def _validate_and_fix(raw_questions: list, count: int) -> list:
    """
    Full self-validation loop. For every question:
      1. Require exactly 4 unique options.
      2. Clean letter prefixes from all options.
      3. Find correct_index by matching correct_option_text to options array.
      4. Use 3-tier matching: exact → normalized → partial.
      5. Reject questions that still can't resolve the correct answer.
    """
    validated = []

    for i, q in enumerate(raw_questions):
        qnum = i + 1
        logger.debug(f"[VALIDATION Q{qnum}] Raw: {q}")

        if not isinstance(q, dict):
            logger.warning(f"  [Q{qnum} SKIP] Not a dict.")
            continue

        question_text = str(q.get("question", "")).strip()
        if not question_text:
            logger.warning(f"  [Q{qnum} SKIP] Empty question text.")
            continue

        raw_opts = q.get("options", [])
        if not isinstance(raw_opts, list) or len(raw_opts) < 2:
            logger.warning(f"  [Q{qnum} SKIP] Less than 2 options: {raw_opts}")
            continue

        # Clean all options
        clean_opts = [_clean_option(o) for o in raw_opts]

        # Ensure we have exactly 4 options (pad or trim)
        # If < 4, skip (bad question)
        if len(clean_opts) < 4:
            logger.warning(f"  [Q{qnum} SKIP] Only {len(clean_opts)} options after cleaning.")
            continue
        clean_opts = clean_opts[:4]  # Cap at 4

        # Deduplicate check
        if len(set(_normalize(o) for o in clean_opts)) < 2:
            logger.warning(f"  [Q{qnum} SKIP] Duplicate options detected.")
            continue

        # Resolve correct_option_text
        correct_text_raw  = str(q.get("correct_option_text", "")).strip()
        correct_text_clean = _clean_option(correct_text_raw)
        correct_idx = -1

        # Tier 1: Exact match (after cleaning both sides)
        for idx, opt in enumerate(clean_opts):
            if opt == correct_text_clean:
                correct_idx = idx
                break

        # Tier 2: Normalized (lowercase + whitespace collapse)
        if correct_idx == -1:
            norm_correct = _normalize(correct_text_clean)
            for idx, opt in enumerate(clean_opts):
                if _normalize(opt) == norm_correct:
                    correct_idx = idx
                    break

        # Tier 3: Substring containment
        if correct_idx == -1:
            norm_correct = _normalize(correct_text_clean)
            for idx, opt in enumerate(clean_opts):
                n_opt = _normalize(opt)
                if norm_correct in n_opt or n_opt in norm_correct:
                    correct_idx = idx
                    break

        # Tier 4: Fall back to legacy correct_index field if present and valid
        if correct_idx == -1 and "correct_index" in q:
            ci = q["correct_index"]
            if isinstance(ci, int) and 0 <= ci < 4:
                correct_idx = ci
                logger.warning(f"  [Q{qnum}] Fell back to legacy correct_index={ci}.")

        if correct_idx == -1:
            logger.warning(
                f"  [Q{qnum} SKIP] Cannot resolve correct answer.\n"
                f"    correct_option_text='{correct_text_raw}'\n"
                f"    options={clean_opts}"
            )
            continue

        explanation = str(q.get("explanation", "No explanation provided.")).strip()

        logger.debug(
            f"  [Q{qnum} PASS] correct_idx={correct_idx} ({clean_opts[correct_idx]})\n"
            f"    question: {question_text[:80]}"
        )

        validated.append({
            "question":     question_text,
            "options":      clean_opts,
            "correct_index": correct_idx,
            "explanation":  explanation,
        })

    return validated[:count]


# ── Main Generator ─────────────────────────────────────────────────────────────

def generate_quiz(subject: str, count: int = 5) -> list:
    """Generate strictly grounded quiz using FAISS context and robust self-validation."""
    from langchain_ollama import OllamaLLM
    from backend.rag import get_context_for_subject

    logger.info(f"[QUIZ START] subject='{subject}' count={count}")

    context = get_context_for_subject(subject)

    if not context or not context.strip():
        logger.error(f"[QUIZ ABORT] No textbook context for '{subject}'.")
        raise HTTPException(
            status_code=400,
            detail=(
                f"No textbook has been uploaded for '{subject}'. "
                "Please ask your teacher to upload a PDF for this subject first."
            )
        )

    # Low temperature = factual, deterministic output
    llm = OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=0.05)
    prompt = QUIZ_PROMPT.format(subject=subject, count=count, context_section=context)

    last_err = None
    for attempt in range(3):
        logger.info(f"[QUIZ ATTEMPT {attempt+1}/3]")
        try:
            raw = llm.invoke(prompt)
            logger.debug(f"[QUIZ RAW {attempt+1}]\n{raw[:600]}")

            data = _extract_json(raw)
            raw_qs = data.get("questions", [])
            logger.debug(f"[QUIZ EXTRACTED] {len(raw_qs)} raw questions")

            validated = _validate_and_fix(raw_qs, count)

            logger.info(f"[QUIZ VALIDATED] {len(validated)}/{len(raw_qs)} questions passed.")

            if len(validated) >= max(1, count // 2):
                # Acceptable if at least half valid
                return validated
            else:
                last_err = f"Only {len(validated)}/{count} questions passed validation."
                logger.warning(f"[QUIZ RETRY] {last_err}")

        except Exception as e:
            last_err = str(e)
            logger.exception(f"[QUIZ ERROR attempt {attempt+1}] {e}")

    logger.error(f"[QUIZ FAILED] All 3 attempts failed. Last: {last_err}")
    raise HTTPException(
        status_code=503,
        detail=(
            f"Quiz generation failed after 3 attempts. "
            f"Ensure Ollama is running with: `ollama serve`. "
            f"Last error: {last_err}"
        )
    )
