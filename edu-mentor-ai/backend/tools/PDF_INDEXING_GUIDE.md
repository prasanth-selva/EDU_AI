# Tamil Nadu Syllabus PDF Indexing

## Quick Start

### 1. Install PDF Libraries
```bash
# Basic (works for most PDFs)
pip install PyPDF2

# Better (recommended for Tamil PDFs)
pip install pdfplumber
```

### 2. Prepare Your PDFs
Put Tamil Nadu syllabus PDFs in a folder, for example:
```
/home/prasanth/EDU_AI/edu-mentor-ai/backend/data/pdfs/
├── grade1_tamil.pdf
├── grade1_maths.pdf
├── grade2_tamil.pdf
└── ...
```

### 3. Index PDFs

**Single PDF:**
```bash
cd /home/prasanth/EDU_AI/edu-mentor-ai/backend

# Example: Grade 1 Tamil book
python tools/pdf_indexer.py \
    data/pdfs/grade1_tamil.pdf \
    --grade 2 \
    --subject tamil \
    --lang ta \
    --title "தமிழ் - வகுப்பு 1"

# Example: Grade 5 Maths (English medium)
python tools/pdf_indexer.py \
    data/pdfs/grade5_maths.pdf \
    --grade 6 \
    --subject maths \
    --lang en \
    --title "Mathematics - Class 5"
```

**Entire Directory:**
```bash
# Index all PDFs in a folder (e.g., all Grade 3 Tamil books)
python tools/pdf_indexer.py \
    data/pdfs/grade3/ \
    --grade 4 \
    --subject tamil \
    --lang ta
```

### 4. Enable RAG in Application
Once PDFs are indexed, enable RAG:

```python
# In backend/app/routes/ai.py, line 115
response, model = ollama_generate(
    system_prompt,
    req.message,
    grade=req.grade,
    subject=req.subject,
    lang=req.language,
    use_rag=True  # Change from False to True
)
```

## Grade Mapping
| Class | Grade Value |
|-------|-------------|
| LKG | 0 |
| UKG | 1 |
| 1st | 2 |
| 2nd | 3 |
| 3rd | 4 |
| 4th | 5 |
| 5th | 6 |
| 6th | 7 |

## Subject Names
- `tamil` - தமிழ்
- `english` - English
- `maths` - கணிதம் / Mathematics
- `science` - அறிவியல் / Science
- `social` - சமூக அறிவியல் / Social Science
- `evs` - சுற்றுச்சூழல் / Environmental Studies

## How It Works

1. **PDF Text Extraction**: Extracts Tamil + English text from PDFs
2. **Chunking**: Splits into 1000-character chunks with 200-char overlap
3. **Vector Embedding**: Creates multilingual embeddings (supports Tamil)
4. **Indexing**: Stores in FAISS (vector) + SQLite (metadata)
5. **Retrieval**: When student asks question, finds relevant content
6. **Context Injection**: Feeds to Gemma model for accurate answers

## Advantages vs Fine-tuning

| Feature | RAG (This Tool) | Fine-tuning |
|---------|----------------|-------------|
| Setup Time | 5 minutes | Hours/Days |
| Hardware | Any PC | GPU required |
| Updates | Just add new PDF | Retrain entire model |
| Tamil Support | ✅ Built-in | ❌ Complex |
| Cost | Free | Expensive |
| Accuracy | High (uses exact PDF text) | Variable |

## Testing After Indexing

```bash
# Test retrieval
cd /home/prasanth/EDU_AI/edu-mentor-ai/backend
python3 << EOF
from app.services.rag_engine import get_rag_engine

rag = get_rag_engine(use_vectors=True)
results = rag.retrieve(
    query="எழுத்துகள்",  # Tamil letters
    grade=2,
    subject="tamil",
    lang="ta",
    top_k=3
)

for r in results:
    print(f"Found: {r.source} (score: {r.relevance_score:.2f})")
    print(f"Content: {r.snippet[:200]}...")
    print()
EOF
```

## Where to Get PDFs

**Official Tamil Nadu Textbook Society:**
- Website: https://textbooksonline.tn.nic.in/
- Download PDFs for Classes 1-12
- Both Tamil and English medium available

## Troubleshooting

**Issue: Tamil text looks garbled**
```bash
# Use pdfplumber instead of PyPDF2
pip install pdfplumber
```

**Issue: "No text extracted"**
- PDF might be scanned images (not text)
- Solution: Use OCR (tesseract + pytesseract)

**Issue: Slow indexing**
- Normal for large PDFs
- 100+ page PDF takes ~2-5 minutes
- Progress shown every 10 chunks

## Advanced: OCR for Scanned PDFs

If PDFs are scanned images:
```bash
pip install pytesseract pdf2image
sudo apt-get install tesseract-ocr tesseract-ocr-tam  # Tamil language pack
```

Then modify `pdf_indexer.py` to use OCR (I can add this if needed).
