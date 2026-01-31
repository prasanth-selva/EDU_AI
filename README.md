# EDU MENTOR AI (Offline-First)

EDU MENTOR AI is an offline-first, low-end-device-friendly AI tutor for Tamil Nadu State Board students (LKG–12). It runs fully offline after installation and supports Tamil (primary) and English (secondary).

## 1) System Architecture (3 Components)

### A) Offline AI Tutor (Local)
- FastAPI backend + lightweight web UI.
- Uses local Ollama LLMs (quantized) with grade-based model packs.
- Offline content retrieval (RAG) from local syllabus JSON files.
- SQLite for student, quiz, and progress data.

### B) Telegram Bot (Low Data Mode)
- Delivers quizzes and basic learning when internet is available.
- Syncs quiz results back to the local backend when online.

### C) Web Platform (Model Download + Content)
- Provides UI for model packs and syllabus content.
- Same frontend as offline app, packaged for desktop/Android.

## 2) Folder Structure (Key)

- edu-mentor-ai/backend/app: FastAPI backend
- edu-mentor-ai/frontend: Offline web UI
- edu-mentor-ai/content: Offline syllabus JSON (class-wise)
- edu-mentor-ai/telegram-bot: Python Telegram bot

## 3) Model Packs (Ollama)

Grade-based packs (small quantized models only):

- Pack A (Grades 0–2): phi-3-mini / phi-2 (Q4)
- Pack B (Grades 3–5): phi-3-mini / gemma:2b (Q4)
- Pack C (Grades 6–8): gemma:2b / qwen:1.8b (Q4)
- Pack D (Grades 9–10): qwen:1.8b (Q4)
- Pack E (Grades 11–13): phi-3-mini / gemma:2b (Q4)

### Ollama Setup Commands

1) Install Ollama (desktop Linux):
	 - https://ollama.com/download

2) Pull small quantized models (example):
	 - ollama pull phi3:mini
	 - ollama pull gemma:2b
	 - ollama pull qwen:1.8b

3) Set model packs (optional):
	 - export MODEL_PACK_A=phi3:mini
	 - export MODEL_PACK_B=phi3:mini
	 - export MODEL_PACK_C=gemma:2b
	 - export MODEL_PACK_D=qwen:1.8b
	 - export MODEL_PACK_E=phi3:mini

## 4) Offline Syllabus Content Format

Path format:

edu-mentor-ai/content/class_<grade>/<subject>.json

Example:

{
	"items": [
		{
			"lesson_id": "c5_sc_plants",
			"grade": 5,
			"subject": "science",
			"title": "தாவரங்கள்",
			"lang": "ta",
			"summary": "...",
			"content": "..."
		}
	]
}

## 5) Backend (FastAPI)

### Install
```bash
cd edu-mentor-ai/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open http://127.0.0.1:8000 to load the frontend.

## 6) Telegram Bot

```bash
cd edu-mentor-ai/telegram-bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export BOT_TOKEN=YOUR_BOT_TOKEN
export BACKEND_URL=http://127.0.0.1:8000
python bot.py
```

## 7) Android Packaging (Offline)

Option A (Recommended): WebView Wrapper
- Build a small Android app with a WebView pointing to http://127.0.0.1:8000
- Bundle the backend and content assets inside the APK.

Option B: TWA (Trusted Web Activity)
- Use a local service and expose localhost.

### Ollama on Android
- Ollama does not officially support Android.
- Use one of these offline options:
	1) Termux + proot-distro (Ubuntu) + community ARM64 Ollama build.
	2) Use llama.cpp locally and point the backend to that HTTP server.
- Recommended for low-end devices: use very small Q4 models.

More details: [edu-mentor-ai/docs/ANDROID.md](edu-mentor-ai/docs/ANDROID.md)

## 8) Security & Child Safety

- No external browsing or web calls.
- No personal data collection.
- Offline-only by default.
- Tamil Nadu syllabus only.

## 9) Grade Mapping

- 0 = LKG
- 1 = UKG
- 2 = Std 1
- 3 = Std 2
- 4 = Std 3
- 5 = Std 4
- 6 = Std 5
- 7 = Std 6
- 8 = Std 7
- 9 = Std 8
- 10 = Std 9
- 11 = Std 10
- 12 = Std 11
- 13 = Std 12
