from __future__ import annotations

import datetime as dt
from sqlalchemy import Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="ta")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    attempts: Mapped[list[Attempt]] = relationship("Attempt", back_populates="student")


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lesson_id: Mapped[str] = mapped_column(String(64), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(16), default="easy")
    language: Mapped[str] = mapped_column(String(10), default="ta")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    questions: Mapped[list[QuizQuestion]] = relationship("QuizQuestion", back_populates="quiz")
    attempts: Mapped[list[Attempt]] = relationship("Attempt", back_populates="quiz")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    q_type: Mapped[str] = mapped_column(String(16), default="mcq")
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[str] = mapped_column(Text, default="[]")
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="")

    quiz: Mapped[Quiz] = relationship("Quiz", back_populates="questions")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    answers_json: Mapped[str] = mapped_column(Text, default="[]")
    weak_topics_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    student: Mapped[Student] = relationship("Student", back_populates="attempts")
    quiz: Mapped[Quiz] = relationship("Quiz", back_populates="attempts")


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, unique=True)
    accuracy: Mapped[str] = mapped_column(String(16), default="0")
    weak_topics_json: Mapped[str] = mapped_column(Text, default="[]")
    streak: Mapped[int] = mapped_column(Integer, default=0)
    last_updated: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
