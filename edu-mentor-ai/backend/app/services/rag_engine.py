"""
RAG Engine for Edu Mentor AI
Offline-first Retrieval Augmented Generation using FAISS + SQLite

Features:
- Local vector store (FAISS) for semantic search
- SQLite for metadata and full-text search
- Grade-restricted content filtering
- Tamil + English multilingual support
- Zero internet dependency
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Optional: FAISS for vector search (install: pip install faiss-cpu sentence-transformers)
try:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    faiss = None
    np = None
    SentenceTransformer = None


CONTENT_DIR = Path(__file__).resolve().parents[2] / "content"
LESSON_DIR = Path(__file__).resolve().parents[2] / "data" / "lessons"
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "knowledge.db"
VECTOR_PATH = Path(__file__).resolve().parents[2] / "data" / "vectors.faiss"
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # 118MB, Tamil support


@dataclass
class RAGResult:
    """Result from RAG retrieval"""
    content: str
    source: str
    grade: int
    subject: str
    relevance_score: float
    snippet: str


class RAGEngine:
    """Retrieval Augmented Generation Engine"""
    
    def __init__(self, use_vectors: bool = True):
        """
        Initialize RAG engine
        
        Args:
            use_vectors: Enable FAISS vector search (requires sentence-transformers)
        """
        self.db_path = DB_PATH
        self.vector_path = VECTOR_PATH
        self.use_vectors = use_vectors and FAISS_AVAILABLE
        
        self.embedder = None
        self.index = None
        self.doc_map: list[dict[str, Any]] = []
        
        self._init_database()
        if self.use_vectors:
            self._init_vectors()
    
    def _init_database(self):
        """Initialize SQLite database for metadata and full-text search"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Create lessons table with FTS5 for full-text search
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS lessons_fts USING fts5(
                lesson_id UNINDEXED,
                grade UNINDEXED,
                subject UNINDEXED,
                title,
                lang UNINDEXED,
                content,
                summary,
                keywords
            )
        """)
        
        # Create metadata table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lessons_meta (
                lesson_id TEXT PRIMARY KEY,
                grade INTEGER NOT NULL,
                subject TEXT NOT NULL,
                title TEXT NOT NULL,
                lang TEXT NOT NULL,
                content TEXT,
                summary TEXT,
                keywords TEXT,
                difficulty TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _init_vectors(self):
        """Initialize FAISS vector index and embedding model"""
        if not FAISS_AVAILABLE:
            print("⚠️ FAISS not available. Install: pip install faiss-cpu sentence-transformers")
            self.use_vectors = False
            return
        
        try:
            # Load lightweight multilingual embedding model (118MB)
            print(f"📦 Loading embedding model: {EMBEDDING_MODEL}")
            self.embedder = SentenceTransformer(EMBEDDING_MODEL)
            
            # Load or create FAISS index
            if self.vector_path.exists():
                print(f"📂 Loading vector index from {self.vector_path}")
                self.index = faiss.read_index(str(self.vector_path))
                
                # Load document mapping
                map_path = self.vector_path.with_suffix(".json")
                if map_path.exists():
                    self.doc_map = json.loads(map_path.read_text(encoding="utf-8"))
            else:
                print("🔨 Creating new FAISS index")
                # Create empty index (384 dimensions for MiniLM)
                self.index = faiss.IndexFlatIP(384)  # Inner Product for cosine similarity
        
        except Exception as e:
            print(f"⚠️ Vector initialization failed: {e}")
            self.use_vectors = False
    
    def index_content(self, force_rebuild: bool = False):
        """
        Index all content from JSON files into RAG database
        
        Args:
            force_rebuild: Clear and rebuild entire index
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        if force_rebuild:
            print("🗑️ Clearing existing index...")
            cursor.execute("DELETE FROM lessons_fts")
            cursor.execute("DELETE FROM lessons_meta")
            if self.use_vectors:
                self.index = faiss.IndexFlatIP(384)
                self.doc_map = []
        
        # Load all lessons
        lessons = self._load_all_lessons()
        print(f"📚 Found {len(lessons)} lessons to index")
        
        texts_to_embed = []
        lessons_to_insert = []
        
        for lesson in lessons:
            lesson_id = lesson.get("lesson_id", f"auto_{hash(lesson.get('title', ''))}")
            grade = lesson.get("grade", 0)
            subject = lesson.get("subject", "general")
            title = lesson.get("title", "Untitled")
            lang = lesson.get("lang", "en")
            content = lesson.get("content", "")
            summary = lesson.get("summary", "")
            keywords = lesson.get("keywords", "")
            difficulty = lesson.get("difficulty", "medium")
            
            # Ensure grade is within LKG-6th (0-7)
            if grade > 7:
                continue  # Skip higher grades per requirements
            
            # Prepare text for embedding (combine title + summary + content)
            text_to_embed = f"{title}. {summary}. {content}".strip()
            
            # Insert into FTS table
            cursor.execute("""
                INSERT OR REPLACE INTO lessons_fts 
                (lesson_id, grade, subject, title, lang, content, summary, keywords)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (lesson_id, grade, subject, title, lang, content, summary, keywords))
            
            # Insert into metadata table
            cursor.execute("""
                INSERT OR REPLACE INTO lessons_meta
                (lesson_id, grade, subject, title, lang, content, summary, keywords, difficulty)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (lesson_id, grade, subject, title, lang, content, summary, keywords, difficulty))
            
            if self.use_vectors and text_to_embed:
                texts_to_embed.append(text_to_embed)
                lessons_to_insert.append({
                    "lesson_id": lesson_id,
                    "grade": grade,
                    "subject": subject,
                    "title": title,
                    "lang": lang,
                })
        
        conn.commit()
        conn.close()
        
        # Create vector embeddings
        if self.use_vectors and texts_to_embed:
            print(f"🧠 Generating embeddings for {len(texts_to_embed)} lessons...")
            embeddings = self.embedder.encode(
                texts_to_embed, 
                show_progress_bar=True,
                normalize_embeddings=True  # For cosine similarity
            )
            
            # Add to FAISS index
            self.index.add(np.array(embeddings, dtype=np.float32))
            self.doc_map.extend(lessons_to_insert)
            
            # Save index and mapping
            print(f"💾 Saving vector index to {self.vector_path}")
            faiss.write_index(self.index, str(self.vector_path))
            
            map_path = self.vector_path.with_suffix(".json")
            map_path.write_text(json.dumps(self.doc_map, ensure_ascii=False, indent=2), encoding="utf-8")
        
        print(f"✅ Indexed {len(lessons)} lessons successfully")
    
    def _load_all_lessons(self) -> list[dict[str, Any]]:
        """Load all lesson JSON files from content directories"""
        lessons: list[dict[str, Any]] = []
        
        for directory in [CONTENT_DIR, LESSON_DIR]:
            if not directory.exists():
                continue
            
            for file_path in directory.glob("**/*.json"):
                try:
                    data = json.loads(file_path.read_text(encoding="utf-8"))
                    
                    if isinstance(data, list):
                        lessons.extend(data)
                    elif isinstance(data, dict):
                        if "items" in data and isinstance(data["items"], list):
                            lessons.extend(data["items"])
                        else:
                            lessons.append(data)
                
                except Exception as e:
                    print(f"⚠️ Error loading {file_path}: {e}")
        
        return lessons
    
    def retrieve(
        self,
        query: str,
        grade: int,
        subject: str | None = None,
        lang: str | None = None,
        top_k: int = 3,
        method: str = "hybrid"
    ) -> list[RAGResult]:
        """
        Retrieve relevant content for a query
        
        Args:
            query: User's question or topic
            grade: Student's grade (0=LKG, 1=UKG, 2=1st, ..., 7=6th)
            subject: Filter by subject (tamil, english, maths, science, evs, etc.)
            lang: Preferred language (ta, en)
            top_k: Number of results to return
            method: "vector", "keyword", or "hybrid"
        
        Returns:
            List of RAGResult objects sorted by relevance
        """
        results: list[RAGResult] = []
        
        # Vector search
        if method in ["vector", "hybrid"] and self.use_vectors and self.embedder:
            vector_results = self._vector_search(query, grade, subject, lang, top_k)
            results.extend(vector_results)
        
        # Keyword search
        if method in ["keyword", "hybrid"]:
            keyword_results = self._keyword_search(query, grade, subject, lang, top_k)
            results.extend(keyword_results)
        
        # Deduplicate and sort by relevance
        seen = set()
        unique_results = []
        for result in sorted(results, key=lambda x: x.relevance_score, reverse=True):
            if result.source not in seen:
                seen.add(result.source)
                unique_results.append(result)
        
        return unique_results[:top_k]
    
    def _vector_search(
        self, query: str, grade: int, subject: str | None, lang: str | None, top_k: int
    ) -> list[RAGResult]:
        """Semantic vector search using FAISS"""
        if not self.use_vectors or self.index.ntotal == 0:
            return []
        
        # Generate query embedding
        query_embedding = self.embedder.encode(
            [query], 
            normalize_embeddings=True
        )
        
        # Search FAISS index
        scores, indices = self.index.search(np.array(query_embedding, dtype=np.float32), top_k * 3)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1 or idx >= len(self.doc_map):
                continue
            
            doc = self.doc_map[idx]
            
            # Filter by grade (allow current grade ± 1)
            if abs(doc["grade"] - grade) > 1:
                continue
            
            # Filter by subject
            if subject and doc["subject"] != subject:
                continue
            
            # Filter by language
            if lang and doc["lang"] != lang:
                continue
            
            # Get full content from database
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            cursor.execute(
                "SELECT content, summary FROM lessons_meta WHERE lesson_id = ?",
                (doc["lesson_id"],)
            )
            row = cursor.fetchone()
            conn.close()
            
            if row:
                content, summary = row
                results.append(RAGResult(
                    content=content or summary or "",
                    source=doc["lesson_id"],
                    grade=doc["grade"],
                    subject=doc["subject"],
                    relevance_score=float(score),
                    snippet=summary or content[:200] if content else ""
                ))
        
        return results
    
    def _keyword_search(
        self, query: str, grade: int, subject: str | None, lang: str | None, top_k: int
    ) -> list[RAGResult]:
        """Full-text keyword search using SQLite FTS5"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Build FTS query
        fts_query = f'"{query}"'
        
        # Build SQL filters
        filters = [f"grade BETWEEN {max(0, grade - 1)} AND {min(7, grade + 1)}"]
        if subject:
            filters.append(f"subject = '{subject}'")
        if lang:
            filters.append(f"lang = '{lang}'")
        
        where_clause = " AND ".join(filters)
        
        # Execute FTS search
        cursor.execute(f"""
            SELECT 
                lesson_id, grade, subject, title, content, summary,
                rank
            FROM lessons_fts
            WHERE lessons_fts MATCH ? AND {where_clause}
            ORDER BY rank
            LIMIT ?
        """, (fts_query, top_k))
        
        results = []
        for row in cursor.fetchall():
            lesson_id, grade_val, subject_val, title, content, summary, rank = row
            
            # FTS5 rank is negative (higher is better)
            relevance_score = abs(float(rank)) / 100.0  # Normalize
            
            results.append(RAGResult(
                content=content or summary or "",
                source=lesson_id,
                grade=grade_val,
                subject=subject_val,
                relevance_score=relevance_score,
                snippet=summary or (content[:200] if content else "")
            ))
        
        conn.close()
        return results
    
    def get_lesson_by_id(self, lesson_id: str) -> dict[str, Any] | None:
        """Retrieve a specific lesson by ID"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT lesson_id, grade, subject, title, lang, content, summary, keywords, difficulty
            FROM lessons_meta
            WHERE lesson_id = ?
        """, (lesson_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "lesson_id": row[0],
                "grade": row[1],
                "subject": row[2],
                "title": row[3],
                "lang": row[4],
                "content": row[5],
                "summary": row[6],
                "keywords": row[7],
                "difficulty": row[8],
            }
        
        return None


# Singleton instance
_rag_engine: RAGEngine | None = None


def get_rag_engine(use_vectors: bool = True) -> RAGEngine:
    """Get or create RAG engine singleton"""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine(use_vectors=use_vectors)
    return _rag_engine
