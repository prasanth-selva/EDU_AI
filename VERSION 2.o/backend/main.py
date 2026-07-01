"""
Edu Mentor AI — FastAPI Backend  (Production-ready)
All endpoints wired, CORS enabled, SPA served.
"""
import os, shutil, logging
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import init_db, get_db, Student, SubjectProgress, Document

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s — %(message)s"
)
logger = logging.getLogger("edumentor")

BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
PDFS_DIR     = os.path.join(BASE_DIR, "pdfs")
os.makedirs(PDFS_DIR, exist_ok=True)

app = FastAPI(title="Edu Mentor AI", version="2.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# ── Pydantic Schemas ──────────────────────────────────────────
class RegisterReq(BaseModel):
    name: str
    grade: str

class TeacherLoginReq(BaseModel):
    username: str
    password: str

class AskReq(BaseModel):
    question: str
    student_id: Optional[int] = 1

class QuizReq(BaseModel):
    subject: str
    count: Optional[int] = 5

class QuizSubmitReq(BaseModel):
    student_id: int
    subject: str
    score: float   # percentage 0-100

class DeleteDocReq(BaseModel):
    doc_id: int

# ── Health ────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0", "message": "Edu Mentor AI is running 🎓"}

# ── Students ──────────────────────────────────────────────────
@app.post("/api/student/register")
def register_student(req: RegisterReq, db: Session = Depends(get_db)):
    student = Student(name=req.name.strip(), grade=req.grade)
    db.add(student)
    db.commit()
    db.refresh(student)
    logger.info(f"New student: {student.name} (class {student.grade})")
    return {"student_id": student.id, "name": student.name}

@app.get("/api/students")
def list_students(db: Session = Depends(get_db)):
    students = db.query(Student).order_by(Student.created_at.desc()).all()
    return {"students": [{"id": s.id, "name": s.name, "grade": s.grade} for s in students]}

# ── Teacher ───────────────────────────────────────────────────
TEACHER_USERNAME = os.getenv("TEACHER_USER", "admin")
TEACHER_PASSWORD = os.getenv("TEACHER_PASS", "admin123")

@app.post("/api/teacher/login")
def teacher_login(req: TeacherLoginReq):
    if req.username == TEACHER_USERNAME and req.password == TEACHER_PASSWORD:
        return {"success": True, "message": "Welcome back, Teacher!"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/api/teacher/stats")
def teacher_stats(db: Session = Depends(get_db)):
    students  = db.query(Student).count()
    documents = db.query(Document).count()
    return {"students": students, "documents": documents}

# ── Documents ─────────────────────────────────────────────────
@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.upload_time.desc()).all()
    return {"documents": [
        {
            "id": d.id,
            "filename": d.filename,
            "subject": d.subject,
            "status": d.status,
            "upload_time": d.upload_time.isoformat()
        }
        for d in docs
    ]}

@app.post("/api/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    subject: str = Form("General"),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Sanitize filename
    safe_name = os.path.basename(file.filename)
    filepath  = os.path.join(PDFS_DIR, safe_name)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    doc = Document(filename=safe_name, filepath=filepath, subject=subject, status="indexing")
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        from backend.rag import process_pdf_and_index
        chunks     = process_pdf_and_index(filepath, subject)
        doc.status = "indexed"
        db.commit()
        logger.info(f"Indexed {safe_name}: {chunks} chunks")
        return {"message": f"Successfully indexed {chunks} chunks from '{safe_name}'", "doc_id": doc.id}
    except Exception as e:
        doc.status = "error"
        db.commit()
        logger.error(f"Indexing error for {safe_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

@app.post("/api/documents/delete")
def delete_document(req: DeleteDocReq, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == req.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    try:
        if doc.filepath and os.path.exists(doc.filepath):
            os.remove(doc.filepath)
    except OSError:
        pass
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully."}

# ── AI Tutor ──────────────────────────────────────────────────
@app.post("/api/ask")
def ask_tutor(req: AskReq):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    from backend.rag import get_answer
    answer = get_answer(req.question.strip())
    return {"answer": answer}

# ── Quiz ──────────────────────────────────────────────────────
@app.post("/api/quiz/generate")
def generate_quiz_route(req: QuizReq):
    if not req.subject or not req.subject.strip():
        raise HTTPException(status_code=400, detail="Subject cannot be empty.")
    from backend.quiz import generate_quiz
    questions = generate_quiz(req.subject.strip(), req.count or 5)
    return {"quiz": questions, "subject": req.subject, "count": len(questions)}

@app.post("/api/quiz/submit")
def submit_quiz(req: QuizSubmitReq, db: Session = Depends(get_db)):
    prog = db.query(SubjectProgress).filter_by(
        student_id=req.student_id, subject=req.subject
    ).first()

    if not prog:
        prog = SubjectProgress(
            student_id=req.student_id,
            subject=req.subject,
            completion_percentage=req.score,
            streak_days=1,
        )
        db.add(prog)
    else:
        # Rolling average
        prog.completion_percentage = round(
            (prog.completion_percentage * 0.6 + req.score * 0.4), 1
        )
        prog.streak_days += 1

    db.commit()
    return {
        "message": "Progress saved!",
        "score": prog.completion_percentage,
        "streak": prog.streak_days,
    }

# ── Progress ──────────────────────────────────────────────────
@app.get("/api/progress/{student_id}")
def get_progress(student_id: int, db: Session = Depends(get_db)):
    rows = db.query(SubjectProgress).filter_by(student_id=student_id).all()
    total_quizzes = sum(r.streak_days for r in rows)
    avg_score     = round(
        sum(r.completion_percentage for r in rows) / len(rows), 1
    ) if rows else 0

    return {
        "progress": [
            {
                "subject": r.subject,
                "completion": r.completion_percentage,
                "streak": r.streak_days,
            }
            for r in rows
        ],
        "total_quizzes": total_quizzes,
        "avg_score": avg_score,
    }

# ── Serve SPA (LAST — catch-all) ──────────────────────────────
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/{full_path:path}")
async def serve_spa(full_path: str, request: Request):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found.")
    target = os.path.join(FRONTEND_DIR, full_path)
    if os.path.isfile(target):
        return FileResponse(target)
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
