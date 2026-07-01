from backend.rag import llm
import json

def generate_quiz(subject: str, difficulty: str = "easy"):
    """
    Generates a 3-question quiz using Ollama based on the requested subject.
    """
    prompt = f"""You are an educational AI. Create a multiple choice quiz about {subject} at a {difficulty} level.
It MUST contain exactly 3 questions.
Output ONLY a valid JSON array of objects, with no markdown formatting or extra text.
Each object should have:
- "question": the question text
- "options": an array of 4 possible string answers
- "correct_index": an integer (0-3) for the correct answer

Example JSON structure:
[
  {{
    "question": "What is 2+2?",
    "options": ["1", "2", "3", "4"],
    "correct_index": 3
  }}
]
"""
    try:
        response = llm.invoke(prompt)
        # Attempt to parse json. Sometimes LLMs add backticks.
        clean_json = response.replace('```json', '').replace('```', '').strip()
        quiz_data = json.loads(clean_json)
        return quiz_data
    except Exception as e:
        print(f"Failed to generate quiz: {e}")
        # Fallback quiz
        return [
            {
                "question": "What is the process by which plants convert sunlight into energy?",
                "options": ["Respiration", "Photosynthesis", "Transpiration", "Germination"],
                "correct_index": 1
            }
        ]
