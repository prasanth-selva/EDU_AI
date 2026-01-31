from __future__ import annotations


def pick_lang(text_ta: str, text_en: str, lang: str) -> str:
    return text_ta if lang == "ta" else text_en
