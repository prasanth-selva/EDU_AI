"""
Quiz generator using Ollama with a JSON-strict prompt.
Strictly relies on the AI.
"""
import json, logging, os
from fastapi import HTTPException

CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.quiz")

QUIZ_PROMPT = """You are a school quiz generator. Create exactly 5 multiple-choice questions about "{subject}".

Rules:
- Each question must have exactly 4 answer options.
- correct_index is 0-based (0=first option, 1=second, etc.)
- Output ONLY a valid JSON array. No extra text, no markdown, no code fences.

JSON format:
[
  {{
    "question": "question text here",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_index": 0
  }}
]

Generate 5 questions about {subject} now:"""

def generate_quiz(subject: str, count: int = 5) -> list:
    try:
        from langchain_ollama import OllamaLLM
        llm = OllamaLLM(model=CHAT_MODEL, base_url=OLLAMA_HOST)
        raw = llm.invoke(QUIZ_PROMPT.format(subject=subject))
        # Strip any accidental markdown
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        questions = json.loads(raw.strip())
        # Validate structure
        validated = []
        for q in questions[:count]:
            if all(k in q for k in ("question","options","correct_index")):
                validated.append(q)
        if validated:
            return validated
        else:
            raise ValueError("No valid questions parsed from AI output.")
    except Exception as e:
        logger.exception(f"Quiz generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI Quiz Generation failed: {str(e)}")
