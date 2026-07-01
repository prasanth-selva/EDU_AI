import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from backend.database import init_db, get_db, Student, SubjectProgress, Document
from backend.rag import process_pdf_and_index, get_answer
from backend.quiz import generate_quiz

app = FastAPI(title="Edu Mentor AI")

# Create DB tables
init_db()

# --- Pydantic Models ---
class AskRequest(BaseModel):
    question: str
    student_id: int = 1

class RegisterRequest(BaseModel):
    name: str
    grade: str

class QuizRequest(BaseModel):
    subject: str
    
class QuizSubmitRequest(BaseModel):
    student_id: int
    subject: str
    score: float # percentage

# --- API Routes ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Edu Mentor AI server is running."}

@app.post("/api/student/register")
def register_student(req: RegisterRequest, db: Session = Depends(get_db)):
    student = Student(name=req.name, grade=req.grade)
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"student_id": student.id, "name": student.name}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), subject: str = Form(...), db: Session = Depends(get_db)):
    pdfs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pdfs")
    filepath = os.path.join(pdfs_dir, file.filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = Document(filename=file.filename, filepath=filepath, subject=subject, status="indexing")
    db.add(doc)
    db.commit()
    
    try:
        chunks = process_pdf_and_index(filepath, subject)
        doc.status = "indexed"
        db.commit()
        return {"message": f"Successfully indexed {chunks} chunks from {file.filename}."}
    except Exception as e:
        doc.status = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ask")
def ask_tutor(req: AskRequest):
    answer = get_answer(req.question)
    return {"answer": answer}

@app.post("/api/quiz/generate")
def get_quiz(req: QuizRequest):
    quiz = generate_quiz(req.subject)
    return {"quiz": quiz}

@app.post("/api/quiz/submit")
def submit_quiz(req: QuizSubmitRequest, db: Session = Depends(get_db)):
    prog = db.query(SubjectProgress).filter_by(student_id=req.student_id, subject=req.subject).first()
    if not prog:
        prog = SubjectProgress(student_id=req.student_id, subject=req.subject, completion_percentage=req.score)
        db.add(prog)
    else:
        # Just a simple moving average for demo purposes
        prog.completion_percentage = (prog.completion_percentage + req.score) / 2
        prog.streak_days += 1
    
    db.commit()
    return {"message": "Progress updated", "new_score": prog.completion_percentage}

# --- Static Files / SPA Routing ---
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))

# Mount frontend directory for assets (CSS, JS, manifest, etc.)
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
