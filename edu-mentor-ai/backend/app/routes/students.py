from __future__ import annotations

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Student, Progress
from ..schemas import StudentCreate, StudentOut, ProgressOut

router = APIRouter(prefix="/students", tags=["students"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=StudentOut)
def create_student(req: StudentCreate, db: Session = Depends(get_db)):
    student = Student(name=req.name, grade=req.grade, language=req.language)
    db.add(student)
    db.commit()
    db.refresh(student)
    progress = Progress(student_id=student.id)
    db.add(progress)
    db.commit()
    return student


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        return StudentOut(id=0, name="", grade=0, language="ta")
    return student


@router.get("/{student_id}/progress", response_model=ProgressOut)
def get_progress(student_id: int, db: Session = Depends(get_db)):
    progress = db.query(Progress).filter(Progress.student_id == student_id).first()
    if progress is None:
        return ProgressOut(student_id=student_id, accuracy="0", weak_topics=[], streak=0)
    weak_topics = json.loads(progress.weak_topics_json or "[]")
    return ProgressOut(
        student_id=student_id,
        accuracy=progress.accuracy,
        weak_topics=weak_topics,
        streak=progress.streak,
    )
