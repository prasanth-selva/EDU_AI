from __future__ import annotations

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine
from .routes import content, ai, quiz, students, sync

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EDU Mentor AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(content.router)
app.include_router(ai.router)
app.include_router(quiz.router)
app.include_router(students.router)
app.include_router(sync.router)

frontend_path = Path(__file__).resolve().parents[2] / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")


@app.get("/health")
def health_check():
    return {"status": "ok"}
