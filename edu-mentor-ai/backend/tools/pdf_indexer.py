#!/usr/bin/env python3
"""
Tamil Nadu Syllabus PDF Indexer
Extracts text from PDFs and indexes them into RAG system
Supports Tamil + English text extraction
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("⚠️  PyPDF2 not installed. Install: pip install PyPDF2")

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("⚠️  pdfplumber not installed (better Tamil support). Install: pip install pdfplumber")

from app.services.rag_engine import get_rag_engine


def extract_text_pypdf2(pdf_path: Path) -> str:
    """Extract text using PyPDF2 (basic)"""
    text = []
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text.append(page.extract_text())
    return "\n".join(text)


def extract_text_pdfplumber(pdf_path: Path) -> str:
    """Extract text using pdfplumber (better for Tamil)"""
    text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text.append(page.extract_text() or "")
    return "\n".join(text)


def extract_text(pdf_path: Path) -> str:
    """Extract text from PDF (tries best available method)"""
    print(f"📄 Extracting text from: {pdf_path.name}")
    
    # Try pdfplumber first (better Tamil support)
    if PDFPLUMBER_AVAILABLE:
        try:
            text = extract_text_pdfplumber(pdf_path)
            print(f"   ✅ Extracted {len(text)} characters using pdfplumber")
            return text
        except Exception as e:
            print(f"   ⚠️  pdfplumber failed: {e}")
    
    # Fallback to PyPDF2
    if PDF_AVAILABLE:
        try:
            text = extract_text_pypdf2(pdf_path)
            print(f"   ✅ Extracted {len(text)} characters using PyPDF2")
            return text
        except Exception as e:
            print(f"   ❌ PyPDF2 failed: {e}")
            return ""
    
    print("   ❌ No PDF library available")
    return ""


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks for better retrieval"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at sentence boundary
        if end < len(text):
            last_period = chunk.rfind('.')
            last_tamil_period = chunk.rfind('.')  # Tamil period
            boundary = max(last_period, last_tamil_period)
            if boundary > start + chunk_size // 2:  # At least halfway
                end = start + boundary + 1
                chunk = text[start:end]
        
        chunks.append(chunk.strip())
        start = end - overlap
    
    return chunks


def index_pdf(
    pdf_path: Path,
    grade: int,
    subject: str,
    lang: str = "ta",
    title: str = None
):
    """
    Index a PDF into RAG system
    
    Args:
        pdf_path: Path to PDF file
        grade: Grade level (0=LKG, 1=UKG, 2=1st, ..., 7=6th)
        subject: Subject name (tamil, english, maths, science, social, evs)
        lang: Language (ta/en)
        title: Optional title (defaults to filename)
    """
    if not pdf_path.exists():
        print(f"❌ File not found: {pdf_path}")
        return
    
    print(f"\n📚 Indexing PDF: {pdf_path.name}")
    print(f"   Grade: {grade}, Subject: {subject}, Language: {lang}")
    
    # Extract text
    text = extract_text(pdf_path)
    if not text:
        print("❌ No text extracted from PDF")
        return
    
    # Chunk text
    chunks = chunk_text(text)
    print(f"   📝 Created {len(chunks)} chunks")
    
    # Index into RAG
    rag = get_rag_engine(use_vectors=True)
    
    lesson_title = title or pdf_path.stem
    
    # Create lesson entries for each chunk
    for i, chunk in enumerate(chunks):
        lesson = {
            "lesson_id": f"{pdf_path.stem}_chunk_{i}",
            "grade": grade,
            "subject": subject,
            "title": f"{lesson_title} - Part {i+1}",
            "lang": lang,
            "content": chunk,
            "summary": chunk[:200] + "..." if len(chunk) > 200 else chunk,
            "keywords": extract_keywords(chunk, lang),
            "difficulty": "medium",
            "source": str(pdf_path.name)
        }
        
        # Index into RAG
        rag.index_content([lesson])
        
        if (i + 1) % 10 == 0:
            print(f"   ⏳ Indexed {i+1}/{len(chunks)} chunks...")
    
    print(f"   ✅ Successfully indexed {len(chunks)} chunks from {pdf_path.name}")


def extract_keywords(text: str, lang: str) -> list[str]:
    """Extract simple keywords from text"""
    # Simple approach: get most common words
    words = text.split()
    # Remove very short words and duplicates
    keywords = list(set([w for w in words if len(w) > 3]))[:20]
    return keywords


def index_directory(
    pdf_dir: Path,
    grade: int,
    subject: str,
    lang: str = "ta"
):
    """Index all PDFs in a directory"""
    pdf_files = list(pdf_dir.glob("*.pdf"))
    
    if not pdf_files:
        print(f"❌ No PDF files found in: {pdf_dir}")
        return
    
    print(f"\n📂 Found {len(pdf_files)} PDFs in {pdf_dir}")
    
    for pdf_file in pdf_files:
        try:
            index_pdf(pdf_file, grade, subject, lang)
        except Exception as e:
            print(f"❌ Error indexing {pdf_file.name}: {e}")


def main():
    """Main CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Index Tamil Nadu Syllabus PDFs into RAG system"
    )
    parser.add_argument("path", type=Path, help="PDF file or directory")
    parser.add_argument("--grade", type=int, required=True, help="Grade (0=LKG, 1=UKG, 2=1st, ..., 7=6th)")
    parser.add_argument("--subject", required=True, help="Subject (tamil, english, maths, science, social, evs)")
    parser.add_argument("--lang", default="ta", help="Language (ta/en)")
    parser.add_argument("--title", help="Optional title for single PDF")
    
    args = parser.parse_args()
    
    if not PDF_AVAILABLE and not PDFPLUMBER_AVAILABLE:
        print("❌ No PDF library installed!")
        print("Install one of:")
        print("  pip install PyPDF2")
        print("  pip install pdfplumber  (recommended for Tamil)")
        return
    
    if args.path.is_file():
        index_pdf(args.path, args.grade, args.subject, args.lang, args.title)
    elif args.path.is_dir():
        index_directory(args.path, args.grade, args.subject, args.lang)
    else:
        print(f"❌ Invalid path: {args.path}")


if __name__ == "__main__":
    main()
