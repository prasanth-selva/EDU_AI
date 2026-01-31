from __future__ import annotations

import os
import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "180"))
OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
OLLAMA_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.9"))
OLLAMA_TOP_K = int(os.getenv("OLLAMA_TOP_K", "40"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "256"))

MODEL_PACK_A = os.getenv("MODEL_PACK_A", "phi3:mini")
MODEL_PACK_B = os.getenv("MODEL_PACK_B", "phi3:mini")
MODEL_PACK_C = os.getenv("MODEL_PACK_C", "gemma:2b")
MODEL_PACK_D = os.getenv("MODEL_PACK_D", "qwen:1.8b")
MODEL_PACK_E = os.getenv("MODEL_PACK_E", "phi3:mini")


def select_model_for_grade(grade: int | None) -> str:
    if grade is None:
        return os.getenv("OLLAMA_MODEL", MODEL_PACK_B)
    if grade <= 2:
        return MODEL_PACK_A
    if 3 <= grade <= 5:
        return MODEL_PACK_B
    if 6 <= grade <= 8:
        return MODEL_PACK_C
    if 9 <= grade <= 10:
        return MODEL_PACK_D
    return MODEL_PACK_E


def ollama_generate(system_prompt: str, user_prompt: str, grade: int | None = None) -> tuple[str, str]:
    model = select_model_for_grade(grade)
    payload = {
        "model": model,
        "prompt": user_prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": OLLAMA_TEMPERATURE,
            "top_p": OLLAMA_TOP_P,
            "top_k": OLLAMA_TOP_K,
            "num_predict": OLLAMA_NUM_PREDICT,
        },
    }

    try:
        resp = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=OLLAMA_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", ""), model
    except Exception:
        return "", model
