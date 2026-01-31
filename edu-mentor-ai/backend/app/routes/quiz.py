from __future__ import annotations

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Quiz, QuizQuestion, Attempt
from ..schemas import QuizGenerateRequest, QuizOut, QuizQuestionOut, QuizSubmitRequest, QuizSubmitResponse
from ..services.content_engine import ContentEngine
from ..services.quiz_engine import generate_questions
from ..services.progress import update_progress

router = APIRouter(prefix="/quiz", tags=["quiz"])
engine = ContentEngine()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate", response_model=QuizOut)
def generate_quiz(req: QuizGenerateRequest, db: Session = Depends(get_db)):
    lesson = None
    if req.lesson_id:
        lesson = engine.get_lesson(req.lesson_id)

    if lesson is None:
        lessons = engine.list_lessons(req.grade, req.subject, req.language)
        lesson = lessons[0] if lessons else {
            "lesson_id": None,
            "grade": req.grade,
            "subject": req.subject,
            "title": "",
            "lang": req.language,
            "summary": "",
            "content": "",
        }

    questions = generate_questions(lesson, req.difficulty, req.language, req.count)

    quiz = Quiz(lesson_id=lesson.get("lesson_id"), difficulty=req.difficulty, language=req.language)
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    q_out: list[QuizQuestionOut] = []
    for q in questions:
        options = q.get("options", [])
        question = QuizQuestion(
            quiz_id=quiz.id,
            q_type=q.get("q_type", "mcq"),
            question=q.get("question", ""),
            options_json=json.dumps(options, ensure_ascii=False),
            answer=q.get("answer", ""),
            explanation=q.get("explanation", ""),
        )
        db.add(question)
        db.flush()
        q_out.append(
            QuizQuestionOut(
                id=question.id,
                q_type=question.q_type,
                question=question.question,
                options=options,
            )
        )

    db.commit()

    return QuizOut(
        quiz_id=quiz.id,
        lesson_id=quiz.lesson_id,
        difficulty=quiz.difficulty,
        language=quiz.language,
        questions=q_out,
    )


@router.post("/submit", response_model=QuizSubmitResponse)
def submit_quiz(req: QuizSubmitRequest, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == req.quiz_id).first()
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == req.quiz_id).all()

    if quiz is None or not questions:
        return QuizSubmitResponse(score=0, total=0, accuracy=0.0, weak_topics=req.weak_topics)

    score = 0
    for idx, question in enumerate(questions):
        if idx < len(req.answers) and req.answers[idx].strip() == question.answer.strip():
            score += 1

    attempt = Attempt(
        student_id=req.student_id,
        quiz_id=quiz.id,
        score=score,
        total=len(questions),
        answers_json=json.dumps(req.answers, ensure_ascii=False),
        weak_topics_json=json.dumps(req.weak_topics, ensure_ascii=False),
    )
    db.add(attempt)

    update_progress(db, req.student_id, score, len(questions), req.weak_topics)
    db.commit()

    accuracy = 0.0 if len(questions) == 0 else round(score / len(questions), 2)
    return QuizSubmitResponse(score=score, total=len(questions), accuracy=accuracy, weak_topics=req.weak_topics)
