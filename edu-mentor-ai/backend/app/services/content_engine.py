from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

LESSON_DIR = Path(__file__).resolve().parents[2] / "data" / "lessons"
CONTENT_DIR = Path(__file__).resolve().parents[2] / "content"


def _load_lessons_from_dir(path: Path) -> list[dict[str, Any]]:
    lessons: list[dict[str, Any]] = []
    if not path.exists():
        return lessons
    for file_path in path.glob("**/*.json"):
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                lessons.extend(data)
            elif isinstance(data, dict):
                if "items" in data and isinstance(data["items"], list):
                    lessons.extend(data["items"])
                else:
                    lessons.append(data)
        except Exception:
            continue
    return lessons


def _load_all_lessons() -> list[dict[str, Any]]:
    lessons: list[dict[str, Any]] = []
    lessons.extend(_load_lessons_from_dir(CONTENT_DIR))
    lessons.extend(_load_lessons_from_dir(LESSON_DIR))
    return lessons


@dataclass
class ContextResult:
    subject: str | None
    text: str
    snippets: list[str]


class ContentEngine:
    def __init__(self) -> None:
        self._cache: list[dict[str, Any]] | None = None

    def _ensure_cache(self) -> None:
        if self._cache is None:
            self._cache = _load_all_lessons()

    def list_lessons(self, grade: int | None, subject: str | None, lang: str | None) -> list[dict[str, Any]]:
        self._ensure_cache()
        lessons = self._cache or []
        if grade is not None:
            lessons = [l for l in lessons if l.get("grade") == grade]
        if subject:
            lessons = [l for l in lessons if l.get("subject") == subject]
        if lang:
            lessons = [l for l in lessons if l.get("lang") == lang]
        return lessons

    def get_lesson(self, lesson_id: str) -> dict[str, Any] | None:
        self._ensure_cache()
        for lesson in self._cache or []:
            if lesson.get("lesson_id") == lesson_id:
                return lesson
        return None

    def detect_subject(self, text: str, lang: str) -> str | None:
        lowered = text.lower()
        subject_keywords = {
            "tamil": ["தமிழ்", "கவிதை", "எழுத்து", "இலக்கணம்"],
            "english": ["english", "grammar", "sentence", "word"],
            "maths": ["கணக்கு", "கணிதம்", "எண்", "எண்ணிக்கை", "add", "plus", "minus", "multiply", "divide"],
            "science": ["அறிவியல்", "இயற்கை", "உயிர்", "தாவரம்", "செல்", "physics", "chemistry", "biology"],
            "social": ["சமூக", "புவியியல்", "வரலாறு", "civics", "history", "geography"],
            "evs": ["சுற்றுச்சூழல்", "evs", "environment"],
            "computer": ["கணினி", "computer", "code", "program"],
        }
        for subject, keywords in subject_keywords.items():
            for kw in keywords:
                if kw.lower() in lowered:
                    return subject
        return None

    def retrieve_context(self, grade: int, subject: str | None, lang: str, question: str) -> ContextResult:
        self._ensure_cache()
        chosen_subject = subject or self.detect_subject(question, lang)

        lessons = self.list_lessons(grade, chosen_subject, lang)
        if not lessons and chosen_subject:
            lessons = self.list_lessons(grade, None, lang)
        if not lessons:
            lessons = self.list_lessons(None, chosen_subject, lang) if chosen_subject else (self._cache or [])

        snippets: list[str] = []
        for lesson in lessons[:3]:
            title = lesson.get("title", "")
            summary = lesson.get("summary", "")
            content = lesson.get("content", "")
            snippet = f"Title: {title}\nSummary: {summary}\nContent: {content}".strip()
            if snippet:
                snippets.append(snippet)

        text = "\n\n".join(snippets) if snippets else ""
        return ContextResult(subject=chosen_subject, text=text, snippets=snippets)
