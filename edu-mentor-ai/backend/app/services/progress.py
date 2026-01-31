from __future__ import annotations

import json
from sqlalchemy.orm import Session
from ..models import Progress


def update_progress(db: Session, student_id: int, score: int, total: int, weak_topics: list[str]) -> Progress:
    accuracy = 0.0 if total == 0 else round(score / total, 2)
    progress = db.query(Progress).filter(Progress.student_id == student_id).first()
    if progress is None:
        progress = Progress(student_id=student_id)
        db.add(progress)

    progress.accuracy = str(accuracy)
    progress.weak_topics_json = json.dumps(weak_topics, ensure_ascii=False)
    progress.streak = progress.streak + 1
    return progress
