"""
Quiz generator — uses RAG context + Ollama.
Robust JSON extraction with regex fallback.
"""
import json, re, logging, os
from fastapi import HTTPException

CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.quiz")

# Strict prompt — triple-backtick JSON block
QUIZ_PROMPT = """You are a school quiz generator. Generate exactly {count} multiple-choice questions about the topic: "{subject}".

{context_section}

IMPORTANT: Output ONLY a JSON array. No explanation. No markdown text before or after. Start with [ and end with ].

Format:
[
  {{"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0}},
  {{"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 2}}
]

Rules:
- correct_index is 0-based (0 = first option)
- Each question has EXACTLY 4 options
- Generate {count} questions total
- If context is provided above, try to base questions on it. Otherwise, use general knowledge.

Output the JSON array now:"""


def _extract_json_array(text: str) -> list:
    """Try multiple strategies to pull a JSON array from LLM output."""
    text = text.strip()

    # Strategy 1: direct parse
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
    except Exception:
        pass

    # Strategy 2: strip markdown fences
    fenced = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', text)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except Exception:
            pass

    # Strategy 3: find the first [ ... ] block
    bracket_match = re.search(r'\[[\s\S]*\]', text)
    if bracket_match:
        try:
            return json.loads(bracket_match.group(0))
        except Exception:
            pass

    # Strategy 4: reconstruct from line-by-line question+options pattern
    questions = []
    q_blocks = re.split(r'\n(?=\d+[\.\)])', text)
    for block in q_blocks:
        lines = [l.strip() for l in block.strip().splitlines() if l.strip()]
        if not lines:
            continue
        q_text = re.sub(r'^\d+[\.\)]\s*', '', lines[0])
        opts = []
        correct = 0
        for i, line in enumerate(lines[1:]):
            m = re.match(r'^[A-Da-d][\.\)]\s*(.*)', line)
            if m:
                opts.append(m.group(1).strip())
        if q_text and len(opts) >= 4:
            questions.append({
                "question": q_text,
                "options": opts[:4],
                "correct_index": correct,
            })
    if questions:
        return questions

    raise ValueError("Could not extract JSON from LLM output")


def _clean_option(opt: str) -> str:
    """Remove leading letter labels like 'A. ', 'A) ', '1. ', '(A) ' from options."""
    import re as _re
    return _re.sub(r'^[\(\[]?[A-Da-d1-4][\.\)\]]\s*', '', str(opt).strip())


def _validate(questions: list, count: int) -> list:
    validated = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        if not all(k in q for k in ("question", "options", "correct_index")):
            continue
        opts = q.get("options", [])
        if not isinstance(opts, list) or len(opts) < 2:
            continue
        # Clean letter prefixes from options
        q["options"] = [_clean_option(o) for o in opts]
        ci = q.get("correct_index", 0)
        if not isinstance(ci, int) or ci < 0 or ci >= len(q["options"]):
            q["correct_index"] = 0
        validated.append(q)
    return validated[:count]


def generate_quiz(subject: str, count: int = 5) -> list:
    """Generate quiz questions using Ollama. Raises HTTPException on total failure."""
    from langchain_ollama import OllamaLLM
    from backend.rag import get_context_for_subject
    
    context = get_context_for_subject(subject)
    context_section = f"Use this textbook context to create questions:\n{context}\n" if context else ""
    
    llm = OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST, temperature=0.3)

    prompt = QUIZ_PROMPT.format(subject=subject, count=count, context_section=context_section)

    last_err = None
    for attempt in range(3):
        try:
            raw = llm.invoke(prompt)
            logger.debug(f"Quiz raw output (attempt {attempt+1}): {raw[:300]}")
            arr = _extract_json_array(raw)
            validated = _validate(arr, count)
            if validated:
                logger.info(f"Generated {len(validated)} quiz questions for '{subject}'")
                return validated
            else:
                last_err = "No valid questions after validation"
        except Exception as e:
            last_err = str(e)
            logger.warning(f"Quiz attempt {attempt+1} failed: {e}")

    logger.error(f"All quiz generation attempts failed for '{subject}': {last_err}")
    raise HTTPException(
        status_code=503,
        detail=f"Quiz generation failed after 3 attempts. Last error: {last_err}. "
               "Make sure Ollama is running: `ollama serve`"
    )
