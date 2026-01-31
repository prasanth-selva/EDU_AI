from __future__ import annotations

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Attempt

router = APIRouter(prefix="/sync", tags=["sync"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/telegram")
def sync_telegram(payload: dict, db: Session = Depends(get_db)):
    student_id = payload.get("student_id", 0)
    quiz_id = payload.get("quiz_id", 0)
    score = payload.get("score", 0)
    total = payload.get("total", 0)
    answers = payload.get("answers", [])

    attempt = Attempt(
        student_id=student_id,
        quiz_id=quiz_id,
        score=score,
        total=total,
        answers_json=json.dumps(answers, ensure_ascii=False),
        weak_topics_json=json.dumps(payload.get("weak_topics", []), ensure_ascii=False),
    )
    db.add(attempt)
    db.commit()

    return {"status": "ok"}
