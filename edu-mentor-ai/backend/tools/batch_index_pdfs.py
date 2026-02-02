#!/usr/bin/env python3
"""
Batch PDF Indexer for Tamil Nadu Syllabus (1st-12th Standard)
Automatically indexes all PDFs organized by grade and subject
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pdf_indexer import index_pdf

# PDF folder structure mapping
PDF_CONFIG = {
    "grade1": {"grade": 2, "subjects": ["tamil", "english", "maths", "evs"]},
    "grade2": {"grade": 3, "subjects": ["tamil", "english", "maths", "evs"]},
    "grade3": {"grade": 4, "subjects": ["tamil", "english", "maths", "evs"]},
    "grade4": {"grade": 5, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade5": {"grade": 6, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade6": {"grade": 7, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade7": {"grade": 8, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade8": {"grade": 9, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade9": {"grade": 10, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade10": {"grade": 11, "subjects": ["tamil", "english", "maths", "science", "social"]},
    "grade11": {"grade": 12, "subjects": ["tamil", "english", "maths", "physics", "chemistry", "biology", "computer"]},
    "grade12": {"grade": 13, "subjects": ["tamil", "english", "maths", "physics", "chemistry", "biology", "computer"]},
}


def batch_index(pdf_base_dir: Path, lang: str = "ta"):
    """
    Index all PDFs organized in folder structure:
    
    pdf_base_dir/
        grade1/
            tamil.pdf
            english.pdf
            maths.pdf
        grade2/
            tamil.pdf
            ...
    """
    
    if not pdf_base_dir.exists():
        print(f"❌ Directory not found: {pdf_base_dir}")
        print(f"Please create it and add PDFs organized by grade")
        return
    
    print(f"\n🚀 Batch Indexing Tamil Nadu Syllabus PDFs")
    print(f"📂 Base directory: {pdf_base_dir}")
    print(f"📚 Grades: 1st-12th Standard")
    print("=" * 60)
    
    total_indexed = 0
    total_failed = 0
    
    for grade_folder, config in PDF_CONFIG.items():
        grade_path = pdf_base_dir / grade_folder
        
        if not grade_path.exists():
            print(f"\n⏭️  Skipping {grade_folder} (folder not found)")
            continue
        
        print(f"\n📖 Processing {grade_folder.upper()}...")
        
        # Look for PDFs matching subject names (both Tamil and English medium)
        for subject in config["subjects"]:
            # Try multiple file patterns for both mediums
            patterns = [
                # Tamil medium
                f"{subject}_tamil.pdf",
                f"{subject}_ta.pdf",
                f"tamil_{subject}.pdf",
                # English medium
                f"{subject}_english.pdf",
                f"{subject}_en.pdf",
                f"english_{subject}.pdf",
                # Generic (uses default lang)
                f"{subject}.pdf",
                f"{subject}_*.pdf",
                f"*_{subject}.pdf",
                f"*{subject}*.pdf"
            ]
            
            found = False
            for pattern in patterns:
                pdf_files = list(grade_path.glob(pattern))
                if pdf_files:
                    for pdf_file in pdf_files:
                        try:
                            # Auto-detect language from filename
                            filename_lower = pdf_file.stem.lower()
                            if 'tamil' in filename_lower or '_ta' in filename_lower:
                                detected_lang = 'ta'
                                medium = 'Tamil Medium'
                            elif 'english' in filename_lower or '_en' in filename_lower:
                                detected_lang = 'en'
                                medium = 'English Medium'
                            else:
                                detected_lang = lang  # Use default
                                medium = f'{"Tamil" if lang == "ta" else "English"} Medium (default)'
                            
                            print(f"   📄 Indexing: {pdf_file.name} [{medium}]")
                            index_pdf(
                                pdf_file,
                                grade=config["grade"],
                                subject=subject,
                                lang=detected_lang,
                                title=f"{subject.title()} - Class {grade_folder.replace('grade', '')} ({medium})"
                            )
                            total_indexed += 1
                            found = True
                        except Exception as e:
                            print(f"   ❌ Failed: {e}")
                            total_failed += 1
                    # Don't break - continue to find both Tamil and English versions
            
            if not found:
                print(f"   ⚠️  No PDF found for {subject}")
    
    print("\n" + "=" * 60)
    print(f"✅ Indexing Complete!")
    print(f"   Successfully indexed: {total_indexed} PDFs")
    if total_failed > 0:
        print(f"   Failed: {total_failed} PDFs")
    print(f"\n💡 To use indexed content, enable RAG in app/routes/ai.py")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Batch index Tamil Nadu syllabus PDFs (1st-12th)"
    )
    parser.add_argument(
        "pdf_dir",
        type=Path,
        nargs="?",
        default=Path(__file__).resolve().parents[1] / "data" / "pdfs",
        help="Base directory containing grade folders (default: backend/data/pdfs)"
    )
    parser.add_argument(
        "--lang",
        default="ta",
        choices=["ta", "en"],
        help="Primary language (default: ta)"
    )
    
    args = parser.parse_args()
    
    batch_index(args.pdf_dir, args.lang)


if __name__ == "__main__":
    main()
