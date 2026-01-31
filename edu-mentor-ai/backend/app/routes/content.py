from __future__ import annotations

from fastapi import APIRouter, Query

from ..schemas import LessonItem, LessonOut
from ..services.content_engine import ContentEngine

router = APIRouter(prefix="/content", tags=["content"])
engine = ContentEngine()


@router.get("/lessons", response_model=list[LessonItem])
def list_lessons(grade: int | None = Query(default=None), subject: str | None = None, lang: str | None = None):
    lessons = engine.list_lessons(grade, subject, lang)
    return [
        LessonItem(
            lesson_id=l.get("lesson_id"),
            grade=l.get("grade"),
            subject=l.get("subject"),
            title=l.get("title"),
            lang=l.get("lang"),
            summary=l.get("summary", ""),
        )
        for l in lessons
    ]


@router.get("/lesson/{lesson_id}", response_model=LessonOut)
def get_lesson(lesson_id: str):
    lesson = engine.get_lesson(lesson_id)
    if lesson is None:
        return LessonOut(
            lesson_id=lesson_id,
            grade=0,
            subject="",
            title="",
            lang="ta",
            content="Lesson not found",
            summary="",
        )
    return LessonOut(**lesson)
