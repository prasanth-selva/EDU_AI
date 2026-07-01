from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import datetime, os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "db")
os.makedirs(DB_DIR, exist_ok=True)

DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'edumentor.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Student(Base):
    __tablename__ = "students"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False)
    grade      = Column(String(20))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SubjectProgress(Base):
    __tablename__ = "subject_progress"
    id                    = Column(Integer, primary_key=True, index=True)
    student_id            = Column(Integer, ForeignKey("students.id"))
    subject               = Column(String(80))
    completion_percentage = Column(Float, default=0.0)
    streak_days           = Column(Integer, default=0)

class Document(Base):
    __tablename__ = "documents"
    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(String(255))
    filepath    = Column(String(512))
    subject     = Column(String(80), default="General")
    status      = Column(String(20), default="pending")  # pending | indexed | error
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
