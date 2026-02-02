#!/usr/bin/env python3
"""
Extract ZIP files and index PDFs automatically
Supports:
- Single ZIP with all PDFs
- Multiple ZIPs (one per grade)
- Auto-organizes into grade folders
"""

import sys
import shutil
import zipfile
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from batch_index_pdfs import batch_index


def extract_zip(zip_path: Path, extract_to: Path):
    """Extract a zip file"""
    print(f"📦 Extracting: {zip_path.name}")
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        print(f"   ✅ Extracted to: {extract_to}")
        return True
    except Exception as e:
        print(f"   ❌ Failed to extract: {e}")
        return False


def organize_pdfs(source_dir: Path, pdf_base_dir: Path):
    """
    Auto-organize PDFs into grade folders
    Looks for patterns like:
    - grade1_maths.pdf → grade1/maths.pdf
    - 1st_tamil.pdf → grade1/tamil.pdf
    - class1/maths.pdf → grade1/maths.pdf
    """
    print(f"\n📂 Organizing PDFs...")
    
    # Find all PDFs recursively
    pdf_files = list(source_dir.rglob("*.pdf"))
    
    if not pdf_files:
        print("⚠️  No PDF files found in extracted content")
        return 0
    
    print(f"   Found {len(pdf_files)} PDF files")
    organized = 0
    
    for pdf_file in pdf_files:
        # Try to detect grade from filename or parent folder
        grade_num = detect_grade(pdf_file)
        
        if grade_num:
            grade_folder = pdf_base_dir / f"grade{grade_num}"
            grade_folder.mkdir(exist_ok=True)
            
            # Copy to grade folder
            dest = grade_folder / pdf_file.name
            shutil.copy2(pdf_file, dest)
            print(f"   ✅ {pdf_file.name} → grade{grade_num}/")
            organized += 1
        else:
            print(f"   ⚠️  Couldn't detect grade for: {pdf_file.name}")
            # Copy to base directory for manual organization
            unknown_dir = pdf_base_dir / "unknown"
            unknown_dir.mkdir(exist_ok=True)
            shutil.copy2(pdf_file, unknown_dir / pdf_file.name)
    
    print(f"\n   📊 Organized {organized} PDFs into grade folders")
    if organized < len(pdf_files):
        print(f"   ⚠️  {len(pdf_files) - organized} PDFs moved to 'unknown' folder (organize manually)")
    
    return organized


def detect_grade(pdf_path: Path) -> int | None:
    """
    Detect grade number from filename or parent folder
    Returns: 1-12 for grades 1-12, None if can't detect
    """
    # Check filename and parent folder
    text = pdf_path.stem.lower() + " " + pdf_path.parent.name.lower()
    
    # Pattern matching
    patterns = {
        # Standard patterns
        'grade1': 1, 'grade2': 2, 'grade3': 3, 'grade4': 4, 'grade5': 5, 'grade6': 6,
        'grade7': 7, 'grade8': 8, 'grade9': 9, 'grade10': 10, 'grade11': 11, 'grade12': 12,
        # Class patterns
        'class1': 1, 'class2': 2, 'class3': 3, 'class4': 4, 'class5': 5, 'class6': 6,
        'class7': 7, 'class8': 8, 'class9': 9, 'class10': 10, 'class11': 11, 'class12': 12,
        # Ordinal patterns
        '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6,
        '7th': 7, '8th': 8, '9th': 9, '10th': 10, '11th': 11, '12th': 12,
        # Tamil patterns
        'வகுப்பு1': 1, 'வகுப்பு2': 2, 'வகுப்பு3': 3, 'வகுப்பு4': 4,
        'வகுப்பு5': 5, 'வகுப்பு6': 6, 'வகுப்பு7': 7, 'வகுப்பு8': 8,
        'வகுப்பு9': 9, 'வகுப்பு10': 10, 'வகுப்பு11': 11, 'வகுப்பு12': 12,
    }
    
    for pattern, grade in patterns.items():
        if pattern in text:
            return grade
    
    # Try to find standalone numbers (1-12)
    import re
    numbers = re.findall(r'\b([1-9]|1[0-2])\b', text)
    if numbers:
        return int(numbers[0])
    
    return None


def process_zip_files(zip_dir: Path, pdf_base_dir: Path, auto_index: bool = True):
    """
    Process all ZIP files in a directory
    
    Args:
        zip_dir: Directory containing ZIP files
        pdf_base_dir: Base directory for organized PDFs
        auto_index: Run batch indexer after extraction
    """
    zip_files = list(zip_dir.glob("*.zip"))
    
    if not zip_files:
        print(f"❌ No ZIP files found in: {zip_dir}")
        return
    
    print(f"\n🚀 Processing {len(zip_files)} ZIP file(s)")
    print("=" * 60)
    
    temp_dir = zip_dir / "temp_extracted"
    temp_dir.mkdir(exist_ok=True)
    
    total_organized = 0
    
    for zip_file in zip_files:
        # Extract
        if extract_zip(zip_file, temp_dir):
            # Organize PDFs
            organized = organize_pdfs(temp_dir, pdf_base_dir)
            total_organized += organized
            
            # Clean up temp
            for item in temp_dir.iterdir():
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
    
    # Clean up temp directory
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    print("\n" + "=" * 60)
    print(f"✅ Extraction Complete!")
    print(f"   Total PDFs organized: {total_organized}")
    
    # Run batch indexer
    if auto_index and total_organized > 0:
        print("\n🔍 Starting automatic indexing...")
        print("=" * 60)
        batch_index(pdf_base_dir, lang="ta")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Extract ZIP files and index Tamil Nadu textbook PDFs"
    )
    parser.add_argument(
        "zip_path",
        type=Path,
        nargs="?",
        default=Path(__file__).resolve().parents[1] / "data" / "pdfs",
        help="ZIP file or directory containing ZIPs (default: backend/data/pdfs)"
    )
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "pdfs",
        help="Base directory for organized PDFs (default: backend/data/pdfs)"
    )
    parser.add_argument(
        "--no-index",
        action="store_true",
        help="Don't run batch indexer after extraction"
    )
    
    args = parser.parse_args()
    
    # Create PDF directory if needed
    args.pdf_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if input is a single ZIP file or directory
    if args.zip_path.is_file() and args.zip_path.suffix == '.zip':
        # Single ZIP file
        temp_dir = args.zip_path.parent / "temp_extracted"
        temp_dir.mkdir(exist_ok=True)
        
        if extract_zip(args.zip_path, temp_dir):
            organize_pdfs(temp_dir, args.pdf_dir)
            shutil.rmtree(temp_dir)
            
            if not args.no_index:
                print("\n🔍 Starting automatic indexing...")
                print("=" * 60)
                batch_index(args.pdf_dir, lang="ta")
    
    elif args.zip_path.is_dir():
        # Directory with multiple ZIPs
        process_zip_files(args.zip_path, args.pdf_dir, auto_index=not args.no_index)
    
    else:
        print(f"❌ Invalid path: {args.zip_path}")
        print("Please provide a ZIP file or directory containing ZIP files")


if __name__ == "__main__":
    main()
