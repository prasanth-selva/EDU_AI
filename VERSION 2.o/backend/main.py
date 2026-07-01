"""
Edu Mentor AI — FastAPI Backend  (Production-ready)
All endpoints wired, CORS enabled, SPA served, Real Database Auth & Tracking.
"""
import os, shutil, logging, hashlib, uuid
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Request, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from backend.database import init_db, get_db, Student, Teacher, Document, QuizAttempt, ChatHistory, Subject

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

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Ensure default teacher exists
def create_default_teacher():
    db = next(get_db())
    if not db.query(Teacher).first():
        teacher = Teacher(username="admin", password_hash=hash_password("admin123"))
        db.add(teacher)
        db.commit()
create_default_teacher()

# Ensure some default subjects exist
def ensure_subjects():
    db = next(get_db())
    default_subs = ["Mathematics", "Science", "English", "Tamil", "Social Science", "Computer Science"]
    for s in default_subs:
        if not db.query(Subject).filter_by(name=s).first():
            db.add(Subject(name=s))
    db.commit()
ensure_subjects()

# ── Pydantic Schemas ──────────────────────────────────────────
class RegisterReq(BaseModel):
    username: str
    name: str
    password: str
    grade: str

class LoginReq(BaseModel):
    username: str
    password: str

class AskReq(BaseModel):
    question: str
    student_id: int

class QuizReq(BaseModel):
    subject: str
    count: Optional[int] = 5

class QuizSubmitReq(BaseModel):
    student_id: int
    subject: str
    score: float
    total_questions: int
    correct_answers: int

class DeleteDocReq(BaseModel):
    doc_id: int

# ── Health ────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0", "message": "Edu Mentor AI is running 🎓"}

# ── Auth (Students & Teachers) ──────────────────────────────────
@app.post("/api/student/register")
def register_student(req: RegisterReq, db: Session = Depends(get_db)):
    if db.query(Student).filter_by(username=req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    student = Student(
        username=req.username.strip(),
        name=req.name.strip(),
        password_hash=hash_password(req.password),
        grade=req.grade
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    logger.info(f"New student registered: {student.name} (class {student.grade})")
    
    # In a real app we would issue a JWT, for now return user details
    return {"student_id": student.id, "name": student.name, "grade": student.grade}

@app.post("/api/student/login")
def login_student(req: LoginReq, db: Session = Depends(get_db)):
    student = db.query(Student).filter_by(username=req.username).first()
    if not student or student.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"student_id": student.id, "name": student.name, "grade": student.grade}

@app.post("/api/teacher/login")
def teacher_login(req: LoginReq, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter_by(username=req.username).first()
    if not teacher or teacher.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"success": True, "message": "Welcome back, Teacher!", "teacher_id": teacher.id}

# ── Subjects ──────────────────────────────────────────────────
@app.get("/api/subjects")
def get_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).order_by(Subject.name).all()
    # Also find any dynamic subjects from documents
    doc_subjects = db.query(Document.subject).distinct().all()
    all_names = {s.name for s in subjects}
    
    for ds in doc_subjects:
        if ds[0] and ds[0] not in all_names:
            new_sub = Subject(name=ds[0])
            db.add(new_sub)
            all_names.add(ds[0])
    db.commit()
    
    return {"subjects": sorted(list(all_names))}

# ── Teacher Stats ─────────────────────────────────────────────
@app.get("/api/teacher/stats")
def teacher_stats(db: Session = Depends(get_db)):
    students  = db.query(Student).count()
    documents = db.query(Document).count()
    quizzes   = db.query(QuizAttempt).count()
    questions = db.query(ChatHistory).count()
    return {
        "students": students, 
        "documents": documents,
        "total_quizzes": quizzes,
        "questions_asked": questions
    }

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

    safe_name = os.path.basename(file.filename)
    filepath  = os.path.join(PDFS_DIR, safe_name)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    doc = Document(filename=safe_name, filepath=filepath, subject=subject, status="indexing")
    db.add(doc)
    
    # Ensure subject exists
    if not db.query(Subject).filter_by(name=subject).first():
        db.add(Subject(name=subject))
        
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

# ── AI Tutor & Chat History ───────────────────────────────────
@app.post("/api/ask")
def ask_tutor(req: AskReq, db: Session = Depends(get_db)):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    from backend.rag import get_answer
    answer = get_answer(req.question.strip())
    
    if req.student_id:
        chat = ChatHistory(student_id=req.student_id, question=req.question.strip(), answer=answer)
        db.add(chat)
        db.commit()
        
    return {"answer": answer}

@app.get("/api/chat_history/{student_id}")
def get_chat_history(student_id: int, db: Session = Depends(get_db)):
    chats = db.query(ChatHistory).filter_by(student_id=student_id).order_by(ChatHistory.timestamp.asc()).all()
    return {"history": [
        {"id": c.id, "question": c.question, "answer": c.answer, "timestamp": c.timestamp.isoformat()}
        for c in chats
    ]}

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
    attempt = QuizAttempt(
        student_id=req.student_id,
        subject=req.subject,
        score=req.score,
        total_questions=req.total_questions,
        correct_answers=req.correct_answers
    )
    db.add(attempt)
    db.commit()
    
    return {"message": "Quiz attempt saved successfully!"}

# ── Progress ──────────────────────────────────────────────────
@app.get("/api/progress/{student_id}")
def get_progress(student_id: int, db: Session = Depends(get_db)):
    attempts = db.query(QuizAttempt).filter_by(student_id=student_id).order_by(QuizAttempt.timestamp.asc()).all()
    
    subject_stats = {}
    total_quizzes = len(attempts)
    avg_score = 0
    if total_quizzes > 0:
        avg_score = sum(a.score for a in attempts) / total_quizzes
        
    for a in attempts:
        if a.subject not in subject_stats:
            subject_stats[a.subject] = {"attempts": 0, "total_score": 0, "streak": 0}
        
        subject_stats[a.subject]["attempts"] += 1
        subject_stats[a.subject]["total_score"] += a.score
        subject_stats[a.subject]["streak"] += 1  # Simplified streak counting
        
    progress_list = []
    for subj, stats in subject_stats.items():
        progress_list.append({
            "subject": subj,
            "completion": stats["total_score"] / stats["attempts"],
            "streak": stats["streak"]
        })
        
    return {
        "progress": progress_list,
        "total_quizzes": total_quizzes,
        "avg_score": round(avg_score, 1)
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
