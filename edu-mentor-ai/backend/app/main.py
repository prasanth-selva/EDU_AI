from __future__ import annotations

from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

# Custom static file serving with no-cache headers
@app.get("/{path:path}")
async def serve_frontend(path: str):
    if not path or path == "/":
        path = "index.html"
    
    file_path = frontend_path / path
    if file_path.exists() and file_path.is_file():
        response = FileResponse(str(file_path))
        # Disable caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    
    # Fallback to index.html for SPA
    index_path = frontend_path / "index.html"
    if index_path.exists():
        response = FileResponse(str(index_path))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
    
    return {"error": "Not found"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

