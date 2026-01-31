from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    name: str
    grade: int = Field(ge=0, le=13)
    language: Literal["ta", "en"] = "ta"


class StudentOut(BaseModel):
    id: int
    name: str
    grade: int
    language: str

    class Config:
        from_attributes = True


class LessonItem(BaseModel):
    lesson_id: str
    grade: int
    subject: str
    title: str
    lang: str
    summary: str


class LessonOut(BaseModel):
    lesson_id: str
    grade: int
    subject: str
    title: str
    lang: str
    content: str
    summary: str


class ExplainRequest(BaseModel):
    lesson_id: str | None = None
    text: str | None = None
    grade: int = Field(ge=0, le=13)
    subject: str | None = None
    language: Literal["ta", "en"] = "ta"


class ExplainResponse(BaseModel):
    reply: str
    model: str


class QuizGenerateRequest(BaseModel):
    lesson_id: str | None = None
    grade: int = Field(ge=0, le=13)
    subject: str
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    language: Literal["ta", "en"] = "ta"
    count: int = Field(default=5, ge=3, le=10)


class QuizQuestionOut(BaseModel):
    id: int | None = None
    q_type: str
    question: str
    options: list[str]


class QuizOut(BaseModel):
    quiz_id: int
    lesson_id: str | None
    difficulty: str
    language: str
    questions: list[QuizQuestionOut]


class QuizSubmitRequest(BaseModel):
    student_id: int
    quiz_id: int
    answers: list[str]
    weak_topics: list[str] = []


class QuizSubmitResponse(BaseModel):
    score: int
    total: int
    accuracy: float
    weak_topics: list[str]


class ProgressOut(BaseModel):
    student_id: int
    accuracy: str
    weak_topics: list[str]
    streak: int


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    grade: int = Field(ge=0, le=13)
    subject: str | None = None
    language: Literal["ta", "en"] = "ta"
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    model: str
    used_subject: str | None = None
    used_grade: int | None = None
    context_snippets: list[str] = []
