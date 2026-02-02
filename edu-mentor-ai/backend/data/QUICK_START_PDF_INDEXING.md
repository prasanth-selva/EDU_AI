# Quick Start: Index Tamil Nadu Textbooks (1st-12th Standard)

## 📁 Step 1: Organize Your PDFs

Create this folder structure:

```
/home/prasanth/EDU_AI/edu-mentor-ai/backend/data/pdfs/
├── grade1/
│   ├── tamil.pdf
│   ├── english.pdf
│   ├── maths.pdf
│   └── evs.pdf
├── grade2/
│   ├── tamil.pdf
│   ├── english.pdf
│   └── maths.pdf
├── grade3/
│   └── ...
├── grade4/
├── grade5/
├── grade6/
├── grade7/
├── grade8/
├── grade9/
├── grade10/
├── grade11/
│   ├── physics.pdf
│   ├── chemistry.pdf
│   └── biology.pdf
└── grade12/
```

**Note:** PDF names should match subjects: `tamil.pdf`, `english.pdf`, `maths.pdf`, `science.pdf`, `social.pdf`, etc.

## 📥 Step 2: Download PDFs

Get official Tamil Nadu textbooks from:
- **Website:** https://textbooksonline.tn.nic.in/
- Download PDFs for Classes 1-12
- Both Tamil and English medium available

## 🚀 Step 3: Run Batch Indexing

```bash
cd /home/prasanth/EDU_AI/edu-mentor-ai/backend

# Install PDF library (if not already installed)
pip install pdfplumber PyPDF2

# Run batch indexer
python tools/batch_index_pdfs.py

# For English medium (optional)
python tools/batch_index_pdfs.py --lang en
```

**What happens:**
- Automatically finds all PDFs in grade folders
- Extracts text (Tamil + English supported)
- Creates searchable index (FAISS + SQLite)
- Takes ~5-10 minutes for all grades
- **Progress shown in terminal**

## ✅ Step 4: Enable RAG in Application

Once indexing is done, enable RAG to use PDF content:

```bash
# Edit the file
nano /home/prasanth/EDU_AI/edu-mentor-ai/backend/app/routes/ai.py
```

**Change line 115 from:**
```python
use_rag=False  # Disabled for speed
```

**To:**
```python
use_rag=True  # Use PDF content!
```

**Or automatically:**
```bash
cd /home/prasanth/EDU_AI/edu-mentor-ai/backend
sed -i 's/use_rag=False/use_rag=True/' app/routes/ai.py
```

## 🎯 Step 5: Restart Server

```bash
# Restart will auto-reload with RAG enabled
# No manual restart needed if server is running with --reload
```

## ✅ How It Works (100% Offline!)

1. **You ask:** "எழுத்துகள் என்றால் என்ன?" (What are letters?)
2. **RAG searches:** Finds relevant content from Grade 1 Tamil PDF
3. **Model answers:** Uses exact textbook content (no hallucinations!)
4. **Everything offline:** No internet needed after setup

## 📊 System Requirements

✅ **Works on low-end devices:**
- RAM: 4GB minimum (6GB recommended)
- Storage: 10GB (for all PDFs + index)
- CPU: Any modern processor
- GPU: NOT required

**Model sizes:**
- Gemma:2b: 1.7GB (currently used)
- PDF Index: ~500MB (for all grades)
- Total: ~2.5GB

## 🧪 Test After Indexing

```bash
cd /home/prasanth/EDU_AI/edu-mentor-ai/backend
python3 << 'EOF'
from app.services.rag_engine import get_rag_engine

rag = get_rag_engine(use_vectors=True)

# Test Tamil query
results = rag.retrieve(
    query="எழுத்துகள்",
    grade=2,  # 1st standard
    subject="tamil",
    lang="ta",
    top_k=3
)

print(f"Found {len(results)} results:")
for r in results:
    print(f"  - {r.source} (relevance: {r.relevance_score:.2f})")
    print(f"    {r.snippet[:100]}...")
EOF
```

## 📱 Final Result

Your students can now:
- ✅ Ask questions in Tamil or English
- ✅ Get answers from official textbooks (1st-12th)
- ✅ Work completely offline
- ✅ Use on low-end Android/PC devices
- ✅ No internet, no data tracking

**Example:**
- Student: "7+8*9 என்ன?" (What is 7+8*9?)
- AI: "79. (முதலில் 8×9=72, பிறகு 7+72=79)" 

**From textbook content:**
- Student: "ஒலி என்றால் என்ன?" (What is sound?)
- AI: [Uses exact definition from Grade 5 Science PDF]

## 🔧 Troubleshooting

**Issue: "No PDF library installed"**
```bash
pip install pdfplumber PyPDF2
```

**Issue: Tamil text looks weird**
```bash
# Use pdfplumber (better Tamil support)
pip install pdfplumber
```

**Issue: PDF is scanned image (no text)**
```bash
# Install OCR
pip install pytesseract pdf2image
sudo apt-get install tesseract-ocr tesseract-ocr-tam
```

**Issue: Slow indexing**
- Normal! 100-page PDF takes 2-5 minutes
- You only need to index once
- Updates work offline

## 📚 What Gets Indexed

From your PDFs, the system extracts:
- Chapter content
- Examples
- Definitions
- Diagrams (text descriptions)
- Q&A sections
- Everything in Tamil + English

**Not indexed:**
- Images (unless you enable OCR)
- Handwritten notes
- Annotations

## 💾 Storage Breakdown

```
backend/data/
├── pdfs/              # Your original PDFs (~5-8GB for all grades)
├── knowledge.db       # SQLite index (~200MB)
├── vectors.faiss      # Vector embeddings (~300MB)
└── lessons/           # JSON format (~50MB)
```

**Total:** ~6-9GB (depending on PDF sizes)

## 🚀 You're Done!

Once indexed, the system:
- ✅ Answers from textbook PDFs
- ✅ Works 100% offline
- ✅ Supports Tamil + English
- ✅ Runs on low-end devices
- ✅ No cloud, no tracking, no internet

**No training needed!** RAG is smarter than fine-tuning for this use case.
