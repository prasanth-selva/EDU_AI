"""
Quiz generator using Ollama with a JSON-strict prompt.
Falls back to built-in demo questions if Ollama is unavailable.
"""
import json, logging, os

CHAT_MODEL  = os.getenv("CHAT_MODEL",  "qwen2.5:1.5b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

logger = logging.getLogger("edumentor.quiz")

FALLBACK_QUESTIONS = {
    "default": [
        {"question": "What is photosynthesis?",
         "options": ["Making food from light energy", "Breaking down food for energy", "Absorbing water through roots", "Releasing oxygen only"],
         "correct_index": 0},
        {"question": "Which planet is closest to the Sun?",
         "options": ["Earth", "Venus", "Mercury", "Mars"],
         "correct_index": 2},
        {"question": "What does H₂O stand for?",
         "options": ["Salt water", "Water", "Hydrogen peroxide", "Oxygen"],
         "correct_index": 1},
        {"question": "How many sides does a hexagon have?",
         "options": ["5", "6", "7", "8"],
         "correct_index": 1},
        {"question": "What is the powerhouse of the cell?",
         "options": ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"],
         "correct_index": 2},
    ]
}

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
        from langchain_community.llms import Ollama
        llm      = Ollama(model=CHAT_MODEL, base_url=OLLAMA_HOST)
        raw      = llm.invoke(QUIZ_PROMPT.format(subject=subject))
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
    except Exception as e:
        logger.warning(f"Quiz generation failed ({e}), using fallback")
    return FALLBACK_QUESTIONS.get(subject.lower(), FALLBACK_QUESTIONS["default"])[:count]
