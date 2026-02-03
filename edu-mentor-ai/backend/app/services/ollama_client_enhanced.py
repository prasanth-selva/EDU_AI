"""
Enhanced Ollama Client with RAG Integration
Supports grade-specific models, safety guardrails, and offline-first operation
"""

from __future__ import annotations

import os
import re
import requests
from typing import Any

from .rag_engine import get_rag_engine, RAGResult

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "180"))
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.85"))
OLLAMA_TOP_K = int(os.getenv("OLLAMA_TOP_K", "35"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "300"))

# Grade-specific model selection (Using qwen:1.8b - Fastest Model)
MODEL_LKG_UKG = os.getenv("MODEL_LKG_UKG", "qwen:1.8b")  # Fastest for young kids
MODEL_GRADE_1_3 = os.getenv("MODEL_GRADE_1_3", "qwen:1.8b")  # Fast and efficient
MODEL_GRADE_4_6 = os.getenv("MODEL_GRADE_4_6", "qwen:1.8b")  # Same for all
MODEL_DEFAULT = os.getenv("OLLAMA_MODEL", "qwen:1.8b")


# Safety filters
UNSAFE_PATTERNS = [
    r'\b(kill|murder|死|கொல்|கொலை)\b',
    r'\b(weapon|gun|knife|bomb|ஆயுதம்)\b',
    r'\b(drug|alcohol|போதை)\b',
    r'\b(sex|porn|செக்ஸ்)\b',
    r'\b(steal|theft|திருட)\b',
]

# Grade restrictions
MAX_GRADE = 7  # LKG-6th (0-7 in our system, where 0=LKG, 1=UKG, 2=1st, ..., 7=6th)


def select_model_for_grade(grade: int | None) -> str:
    """
    Select appropriate model based on student grade
    
    Args:
        grade: Student grade (0=LKG, 1=UKG, 2=1st, ..., 7=6th)
    
    Returns:
        Model name for Ollama
    """
    if grade is None:
        return MODEL_DEFAULT
    
    if grade <= 1:  # LKG, UKG
        return MODEL_LKG_UKG
    elif 2 <= grade <= 4:  # 1st-3rd
        return MODEL_GRADE_1_3
    elif 5 <= grade <= 7:  # 4th-6th
        return MODEL_GRADE_4_6
    else:
        # Fallback for higher grades (should not happen per requirements)
        return MODEL_DEFAULT


def check_safety(text: str) -> tuple[bool, str]:
    """
    Check if text contains unsafe content
    
    Args:
        text: Text to check
    
    Returns:
        (is_safe, reason)
    """
    text_lower = text.lower()
    
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return False, "கேள்வி பாதுகாப்பற்றது / Question contains unsafe content"
    
    return True, ""


def enforce_grade_limit(grade: int | None) -> int:
    """Enforce grade limits (LKG-6th only)"""
    if grade is None:
        return 5  # Default to 4th grade
    
    return max(0, min(MAX_GRADE, grade))


def build_rag_context(
    query: str,
    grade: int,
    subject: str | None,
    lang: str | None,
    top_k: int = 3
) -> str:
    """
    Retrieve relevant content from RAG system
    
    Args:
        query: User's question
        grade: Student grade
        subject: Subject filter
        lang: Language preference
        top_k: Number of results
    
    Returns:
        Formatted context string
    """
    try:
        rag = get_rag_engine(use_vectors=True)
        results = rag.retrieve(
            query=query,
            grade=grade,
            subject=subject,
            lang=lang,
            top_k=top_k,
            method="hybrid"
        )
        
        if not results:
            return ""
        
        context_parts = []
        for i, result in enumerate(results, 1):
            context_parts.append(
                f"[பாடம் {i}]\n"
                f"தரம்: {result.grade}\n"
                f"பாடம்: {result.subject}\n"
                f"உள்ளடக்கம்:\n{result.content}\n"
            )
        
        return "\n---\n".join(context_parts)
    
    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return ""


def ollama_generate(
    system_prompt: str,
    user_prompt: str,
    grade: int | None = None,
    subject: str | None = None,
    lang: str | None = None,
    use_rag: bool = True
) -> tuple[str, str]:
    """
    Generate AI response using Ollama with RAG enhancement
    
    Args:
        system_prompt: System instruction
        user_prompt: User's query
        grade: Student grade
        subject: Subject context
        lang: Language preference
        use_rag: Enable RAG context retrieval
    
    Returns:
        (response_text, model_name)
    """
    # Enforce safety and grade limits
    grade = enforce_grade_limit(grade)
    
    is_safe, safety_reason = check_safety(user_prompt)
    if not is_safe:
        return safety_reason, "safety_filter"
    
    # Select appropriate model
    model = select_model_for_grade(grade)
    
    # Build RAG context if enabled
    rag_context = ""
    if use_rag:
        rag_context = build_rag_context(user_prompt, grade, subject, lang, top_k=3)
    
    # Enhance user prompt with RAG context
    enhanced_prompt = user_prompt
    if rag_context:
        enhanced_prompt = (
            f"பாடநூல் குறிப்புகள் / Syllabus References:\n\n"
            f"{rag_context}\n\n"
            f"---\n\n"
            f"மாணவர் கேள்வி / Student Question:\n{user_prompt}\n\n"
            f"மேற்கண்ட பாடநூல் குறிப்புகளை மட்டும் பயன்படுத்தி எளிதாக விளக்கு.\n"
            f"Use ONLY the above syllabus references to explain simply."
        )
    
    # Prepare Ollama payload
    payload = {
        "model": model,
        "prompt": enhanced_prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": OLLAMA_TEMPERATURE,
            "top_p": OLLAMA_TOP_P,
            "top_k": OLLAMA_TOP_K,
            "num_predict": OLLAMA_NUM_PREDICT,
            "repeat_penalty": 1.1,
        },
    }
    
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=OLLAMA_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        response_text = data.get("response", "")
        
        # Post-process response for safety
        if not response_text.strip():
            return _fallback_response(lang or "ta"), model
        
        # Check response safety
        is_safe, _ = check_safety(response_text)
        if not is_safe:
            return _fallback_response(lang or "ta"), model
        
        return response_text.strip(), model
    
    except requests.exceptions.Timeout:
        return _timeout_response(lang or "ta"), model
    except Exception as e:
        print(f"Ollama error: {e}")
        return _error_response(lang or "ta"), model


def _fallback_response(lang: str) -> str:
    """Fallback response when AI fails"""
    if lang == "ta":
        return (
            "மன்னிக்கவும், இப்போது எனக்கு இந்தக் கேள்விக்கு பதில் தெரியவில்லை. "
            "வேறு எளிய கேள்வி கேளுங்கள் அல்லது ஆசிரியரிடம் கேளுங்கள்."
        )
    return (
        "Sorry, I don't know the answer to this question right now. "
        "Please ask a simpler question or consult your teacher."
    )


def _timeout_response(lang: str) -> str:
    """Response when request times out"""
    if lang == "ta":
        return "AI சிந்திக்க அதிக நேரம் ஆகிறது. எளிய கேள்வி கேளுங்கள்."
    return "AI is taking too long to respond. Please ask a simpler question."


def _error_response(lang: str) -> str:
    """Response on error"""
    if lang == "ta":
        return "AI இப்போது கிடைக்கவில்லை. பின்னர் முயற்சி செய்யுங்கள்."
    return "AI is not available right now. Please try again later."


def check_ollama_health() -> dict[str, Any]:
    """
    Check if Ollama is running and accessible
    
    Returns:
        Health status dict
    """
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        models = resp.json().get("models", [])
        
        return {
            "status": "healthy",
            "url": OLLAMA_URL,
            "models_available": len(models),
            "models": [m.get("name") for m in models]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "url": OLLAMA_URL,
            "error": str(e)
        }
