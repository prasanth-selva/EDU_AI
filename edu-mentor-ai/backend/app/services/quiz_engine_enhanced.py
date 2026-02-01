"""
Enhanced Quiz Engine with Offline Storage and Telegram Sync
Supports skill assessment, progress tracking, and background sync
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from ..services.rag_engine import get_rag_engine

QUIZ_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "quizzes.db"


@dataclass
class QuizQuestion:
    """Quiz question structure"""
    question: str
    options: list[str]
    correct_answer: str
    explanation: str
    difficulty: str
    subject: str


@dataclass
class QuizResult:
    """Quiz result with analytics"""
    quiz_id: str
    student_id: str
    score: int
    total: int
    percentage: float
    time_taken: int
    answers: list[dict[str, Any]]
    weak_areas: list[str]
    strong_areas: list[str]
    synced_to_telegram: bool


class QuizEngine:
    """Quiz generation and assessment engine"""
    
    def __init__(self):
        self.db_path = QUIZ_DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database for quiz storage"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Quiz sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                quiz_id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                grade INTEGER NOT NULL,
                subject TEXT,
                difficulty TEXT,
                language TEXT,
                total_questions INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                score INTEGER,
                percentage REAL,
                time_taken INTEGER,
                synced_to_telegram BOOLEAN DEFAULT 0
            )
        """)
        
        # Quiz answers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quiz_id TEXT NOT NULL,
                question_index INTEGER,
                question TEXT,
                user_answer TEXT,
                correct_answer TEXT,
                is_correct BOOLEAN,
                subject TEXT,
                FOREIGN KEY (quiz_id) REFERENCES quiz_sessions(quiz_id)
            )
        """)
        
        # Sync queue for Telegram
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telegram_sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quiz_id TEXT NOT NULL,
                student_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                synced BOOLEAN DEFAULT 0,
                sync_attempts INTEGER DEFAULT 0,
                last_sync_attempt TIMESTAMP,
                FOREIGN KEY (quiz_id) REFERENCES quiz_sessions(quiz_id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def generate_quiz(
        self,
        student_id: str,
        grade: int,
        subject: str | None,
        language: str,
        difficulty: str = "medium",
        count: int = 5
    ) -> dict[str, Any]:
        """
        Generate a quiz based on student parameters
        
        Args:
            student_id: Student identifier
            grade: Student grade (0-7 for LKG-6th)
            subject: Subject filter
            language: Language preference
            difficulty: easy, medium, hard
            count: Number of questions
        
        Returns:
            Quiz data with questions
        """
        import uuid
        
        quiz_id = f"quiz_{student_id}_{int(datetime.now().timestamp())}"
        
        # Generate questions from RAG
        rag = get_rag_engine()
        questions = self._generate_questions_from_rag(
            rag, grade, subject, language, difficulty, count
        )
        
        # Store quiz session
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO quiz_sessions 
            (quiz_id, student_id, grade, subject, difficulty, language, total_questions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (quiz_id, student_id, grade, subject or "mixed", difficulty, language, len(questions)))
        
        conn.commit()
        conn.close()
        
        return {
            "quiz_id": quiz_id,
            "questions": [
                {
                    "question": q.question,
                    "options": q.options,
                    "difficulty": q.difficulty,
                    "subject": q.subject
                }
                for q in questions
            ],
            "total": len(questions)
        }
    
    def _generate_questions_from_rag(
        self, rag, grade: int, subject: str | None, language: str, difficulty: str, count: int
    ) -> list[QuizQuestion]:
        """Generate quiz questions using RAG content"""
        
        # Retrieve relevant content
        topics = [
            "கூட்டல்" if language == "ta" else "addition",
            "எழுத்துகள்" if language == "ta" else "letters",
            "விலங்குகள்" if language == "ta" else "animals",
            "தாவரங்கள்" if language == "ta" else "plants",
            "நீர்" if language == "ta" else "water"
        ]
        
        questions = []
        
        # Simple template-based generation (can be enhanced with LLM)
        if subject == "maths" or subject is None:
            questions.extend(self._generate_math_questions(grade, language, difficulty, min(count, 3)))
        
        if subject == "tamil" or subject is None:
            questions.extend(self._generate_tamil_questions(grade, language, difficulty, min(count, 2)))
        
        return questions[:count]
    
    def _generate_math_questions(self, grade: int, language: str, difficulty: str, count: int) -> list[QuizQuestion]:
        """Generate simple math questions"""
        import random
        
        questions = []
        
        for _ in range(count):
            if grade <= 2:  # LKG, UKG, 1st
                a = random.randint(1, 10)
                b = random.randint(1, 10)
                answer = a + b
                
                question = f"{a} + {b} = ?"
                if language == "ta":
                    question = f"{a} + {b} = எத்தனை?"
                
                # Generate options
                options = [str(answer)]
                while len(options) < 4:
                    wrong = random.randint(max(1, answer - 5), answer + 5)
                    if str(wrong) not in options:
                        options.append(str(wrong))
                
                random.shuffle(options)
                
                questions.append(QuizQuestion(
                    question=question,
                    options=options,
                    correct_answer=str(answer),
                    explanation=f"{a} + {b} = {answer}",
                    difficulty=difficulty,
                    subject="maths"
                ))
            
            else:  # Higher grades
                a = random.randint(1, 20)
                b = random.randint(1, 20)
                op = random.choice(['+', '-', '×'])
                
                if op == '+':
                    answer = a + b
                    question = f"{a} + {b} = ?"
                elif op == '-':
                    answer = a - b
                    question = f"{a} - {b} = ?"
                else:
                    answer = a * b
                    question = f"{a} × {b} = ?"
                
                if language == "ta":
                    question = question.replace("?", "எத்தனை?")
                
                options = [str(answer)]
                while len(options) < 4:
                    wrong = random.randint(max(0, answer - 10), answer + 10)
                    if str(wrong) not in options:
                        options.append(str(wrong))
                
                random.shuffle(options)
                
                questions.append(QuizQuestion(
                    question=question,
                    options=options,
                    correct_answer=str(answer),
                    explanation=f"பதில்: {answer}",
                    difficulty=difficulty,
                    subject="maths"
                ))
        
        return questions
    
    def _generate_tamil_questions(self, grade: int, language: str, difficulty: str, count: int) -> list[QuizQuestion]:
        """Generate Tamil language questions"""
        
        tamil_questions = [
            QuizQuestion(
                question="'பால்' என்ற சொல் எத்தனை எழுத்துகள்?" if language == "ta" else "How many letters in 'பால்'?",
                options=["2", "3", "4", "5"],
                correct_answer="2",
                explanation="பா + ல் = 2 எழுத்துகள்",
                difficulty="easy",
                subject="tamil"
            ),
            QuizQuestion(
                question="தமிழில் எத்தனை உயிர் எழுத்துகள்?" if language == "ta" else "How many vowels in Tamil?",
                options=["10", "12", "18", "20"],
                correct_answer="12",
                explanation="அ முதல் ஔ வரை 12 உயிர் எழுத்துகள்",
                difficulty="medium",
                subject="tamil"
            )
        ]
        
        return tamil_questions[:count]
    
    def submit_quiz(self, quiz_id: str, answers: list[str | None]) -> QuizResult:
        """
        Submit quiz and calculate results
        
        Args:
            quiz_id: Quiz identifier
            answers: List of user answers
        
        Returns:
            QuizResult with score and analytics
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Get quiz session
        cursor.execute("""
            SELECT student_id, grade, subject, total_questions
            FROM quiz_sessions
            WHERE quiz_id = ?
        """, (quiz_id,))
        
        row = cursor.fetchone()
        if not row:
            raise ValueError("Quiz not found")
        
        student_id, grade, subject, total_questions = row
        
        # For now, mock correct answers (in production, retrieve from question bank)
        # This is simplified - should retrieve actual questions and validate
        score = 0
        answer_details = []
        
        for i, user_answer in enumerate(answers):
            # Mock validation (replace with actual logic)
            is_correct = user_answer is not None
            if is_correct:
                score += 1
            
            cursor.execute("""
                INSERT INTO quiz_answers 
                (quiz_id, question_index, user_answer, is_correct, subject)
                VALUES (?, ?, ?, ?, ?)
            """, (quiz_id, i, user_answer, is_correct, subject))
            
            answer_details.append({
                "index": i,
                "user_answer": user_answer,
                "is_correct": is_correct
            })
        
        # Calculate percentage
        percentage = (score / total_questions * 100) if total_questions > 0 else 0
        
        # Update quiz session
        cursor.execute("""
            UPDATE quiz_sessions
            SET completed_at = ?, score = ?, percentage = ?
            WHERE quiz_id = ?
        """, (datetime.now(), score, percentage, quiz_id))
        
        # Add to Telegram sync queue
        cursor.execute("""
            INSERT INTO telegram_sync_queue (quiz_id, student_id)
            VALUES (?, ?)
        """, (quiz_id, student_id))
        
        conn.commit()
        conn.close()
        
        return QuizResult(
            quiz_id=quiz_id,
            student_id=student_id,
            score=score,
            total=total_questions,
            percentage=percentage,
            time_taken=0,
            answers=answer_details,
            weak_areas=[],
            strong_areas=[],
            synced_to_telegram=False
        )
    
    def get_pending_telegram_syncs(self) -> list[dict[str, Any]]:
        """Get quiz results pending Telegram sync"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT q.quiz_id, q.student_id, q.score, q.total_questions, q.percentage
            FROM telegram_sync_queue t
            JOIN quiz_sessions q ON t.quiz_id = q.quiz_id
            WHERE t.synced = 0 AND t.sync_attempts < 3
        """)
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "quiz_id": row[0],
                "student_id": row[1],
                "score": row[2],
                "total": row[3],
                "percentage": row[4]
            })
        
        conn.close()
        return results
    
    def mark_synced(self, quiz_id: str):
        """Mark quiz as synced to Telegram"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE telegram_sync_queue
            SET synced = 1, last_sync_attempt = ?
            WHERE quiz_id = ?
        """, (datetime.now(), quiz_id))
        
        cursor.execute("""
            UPDATE quiz_sessions
            SET synced_to_telegram = 1
            WHERE quiz_id = ?
        """, (quiz_id,))
        
        conn.commit()
        conn.close()


# Singleton
_quiz_engine: QuizEngine | None = None


def get_quiz_engine() -> QuizEngine:
    """Get or create quiz engine singleton"""
    global _quiz_engine
    if _quiz_engine is None:
        _quiz_engine = QuizEngine()
    return _quiz_engine
