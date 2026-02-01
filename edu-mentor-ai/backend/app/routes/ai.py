from __future__ import annotations

from pathlib import Path
import re
from fastapi import APIRouter

from ..schemas import ExplainRequest, ExplainResponse, ChatRequest, ChatResponse
from ..services.content_engine import ContentEngine
from ..services.ollama_client_enhanced import ollama_generate, check_ollama_health
from ..services.rag_engine import get_rag_engine
from ..utils.lang import pick_lang

router = APIRouter(prefix="/ai", tags=["ai"])
engine = ContentEngine()
PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"


def _load_system_prompt(lang: str) -> str:
    prompt_file = PROMPT_DIR / ("system_ta.txt" if lang == "ta" else "system_en.txt")
    if prompt_file.exists():
        return prompt_file.read_text(encoding="utf-8").strip()
    return pick_lang(
        "நீ EDU MENTOR AI. எளிய தமிழ் பதில் கொடு.",
        "You are EDU MENTOR AI. Give a simple answer.",
        lang,
    )


def _solve_simple_math(text: str) -> str | None:
    match = re.search(r"(\d+)\s*([+\-x×*/÷])\s*(\d+)", text)
    if not match:
        return None
    a = int(match.group(1))
    op = match.group(2)
    b = int(match.group(3))
    if op in {"+"}:
        return str(a + b)
    if op in {"-"}:
        return str(a - b)
    if op in {"x", "×", "*"}:
        return str(a * b)
    if op in {"/", "÷"}:
        return "முழு எண்ணாகப் பெறவில்லை" if b == 0 else str(round(a / b, 2))
    return None


def _fallback_from_context(lang: str, context_text: str) -> str:
    if not context_text:
        return pick_lang(
            "இதற்கான பாடத் தகவல் இல்லை. ஒரு எளிய கேள்வி கேளுங்கள்.",
            "No syllabus content found. Please ask a simpler question.",
            lang,
        )
    lines = [line.strip() for line in context_text.splitlines() if line.strip()]
    summary_lines = lines[:4]
    if lang == "ta":
        return "சுருக்கம்: " + " ".join(summary_lines)
    return "Summary: " + " ".join(summary_lines)


@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest):
    lesson_text = ""
    if req.lesson_id:
        lesson = engine.get_lesson(req.lesson_id)
        if lesson:
            lesson_text = lesson.get("content", "")

    user_text = req.text or lesson_text
    if not user_text:
        reply = pick_lang("பாடத்தை தேர்ந்தெடுக்கவும்.", "Please choose a lesson.", req.language)
        return ExplainResponse(reply=reply, model="offline")

    system_prompt = _load_system_prompt(req.language)
    context = engine.retrieve_context(req.grade, req.subject, req.language, user_text)

    user_prompt = (
        f"Grade: {req.grade}\n"
        f"Language: {req.language}\n"
        f"Subject: {context.subject or req.subject or ''}\n"
        f"Question: {user_text}\n"
        f"Relevant syllabus content:\n{context.text}\n"
        "Explain simply with short sentences and a small story example."
        "Answer clearly and include the final answer after 'பதில்:' if it is a direct question."
    )

    response, model = ollama_generate(
        system_prompt, 
        user_prompt, 
        grade=req.grade,
        subject=req.subject,
        lang=req.language,
        use_rag=True
    )
    if not response.strip():
        response = pick_lang(
            "இப்போது AI கிடைக்கவில்லை. எளிய விளக்கம்: " + user_text[:200],
            "AI is not available now. Simple explanation: " + user_text[:200],
            req.language,
        )
        model = "offline"

    return ExplainResponse(reply=response.strip(), model=model)


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.message.strip():
        reply = pick_lang("கேள்வி கேளுங்கள்.", "Please ask a question.", req.language)
        return ChatResponse(reply=reply, model="offline")

    system_prompt = _load_system_prompt(req.language)
    
    # Use RAG-enhanced generation
    response, model = ollama_generate(
        system_prompt,
        req.message,
        grade=req.grade,
        subject=req.subject,
        lang=req.language,
        use_rag=True
    )

    if not response.strip():
        response = pick_lang(
            "மன்னிக்கவும், இப்போது பதில் தர முடியவில்லை.",
            "Sorry, I cannot answer right now.",
            req.language,
        )
        model = "offline"

    return ChatResponse(reply=response.strip(), model=model)


@router.get("/health")
def ai_health():
    """Check AI system health"""
    return check_ollama_health()
    if not req.message.strip():
        return ChatResponse(reply="", model="offline", used_subject=req.subject, used_grade=req.grade)

    system_prompt = _load_system_prompt(req.language)
    context = engine.retrieve_context(req.grade, req.subject, req.language, req.message)

    history_text = "\n".join([f"{m.role}: {m.content}" for m in req.history[-6:]])
    user_prompt = (
        f"Grade: {req.grade}\n"
        f"Language: {req.language}\n"
        f"Subject: {context.subject or req.subject or ''}\n"
        f"Relevant syllabus content:\n{context.text}\n"
        f"Recent chat:\n{history_text}\n"
        f"User: {req.message}\n"
        "Assistant:"
    )

    response, model = ollama_generate(system_prompt, user_prompt, grade=req.grade)
    if not response.strip():
        response = pick_lang(
            "இப்போது AI கிடைக்கவில்லை. நான் எளிய முறையில் சொல்கிறேன்: " + req.message[:200],
            "AI is not available now. Simple response: " + req.message[:200],
            req.language,
        )
        model = "offline"

    if "AI கிடைக்கவில்லை" in response or "AI is not available" in response:
        response = _fallback_from_context(req.language, context.text)
        model = "offline"

    detected_subject = context.subject or req.subject
    if req.language == "ta" and (detected_subject == "maths" or engine.detect_subject(req.message, req.language) == "maths"):
        fallback = _solve_simple_math(req.message)
        if fallback and ("பதில்" not in response and fallback not in response):
            response = f"பதில்: {fallback}."
            model = model or "offline"
        elif fallback and "AI கிடைக்கவில்லை" in response:
            response = f"பதில்: {fallback}."
            model = model or "offline"

    return ChatResponse(
        reply=response.strip(),
        model=model,
        used_subject=context.subject or req.subject,
        used_grade=req.grade,
        context_snippets=context.snippets,
    )
