# 📚 Both Tamil & English Medium PDFs - Naming Guide

## ✅ YES! You can upload BOTH mediums!

The system automatically detects the language from the filename and indexes both.

## 📁 Recommended Folder Structure

```
/home/prasanth/EDU_AI/edu-mentor-ai/backend/data/pdfs/
├── grade1/
│   ├── tamil_tamil.pdf          # Tamil book (Tamil medium)
│   ├── tamil_english.pdf        # Tamil book (English medium)
│   ├── english_tamil.pdf        # English book (Tamil medium)
│   ├── english_english.pdf      # English book (English medium)
│   ├── maths_tamil.pdf          # Maths (Tamil medium)
│   ├── maths_english.pdf        # Maths (English medium)
│   └── evs_english.pdf          # EVS (English medium)
├── grade2/
│   ├── tamil_tamil.pdf
│   ├── maths_tamil.pdf
│   ├── maths_english.pdf
│   └── ...
└── ...
```

## 📝 Naming Conventions (Auto-detected!)

### Tamil Medium PDFs
Use any of these patterns:
- `tamil_tamil.pdf` ✅ (Recommended)
- `maths_tamil.pdf` ✅
- `tamil_maths.pdf` ✅
- `maths_ta.pdf` ✅
- `science_tamil_medium.pdf` ✅

### English Medium PDFs
Use any of these patterns:
- `tamil_english.pdf` ✅ (Recommended)
- `maths_english.pdf` ✅
- `english_maths.pdf` ✅
- `maths_en.pdf` ✅
- `science_english_medium.pdf` ✅

### Generic (No language specified)
- `maths.pdf` → Uses default language (Tamil by default)

## 🚀 How It Works

1. **You put both mediums:**
   ```
   grade5/
       maths_tamil.pdf
       maths_english.pdf
   ```

2. **Batch indexer runs:**
   ```bash
   python tools/batch_index_pdfs.py
   ```

3. **System auto-detects:**
   ```
   📄 Indexing: maths_tamil.pdf [Tamil Medium]
   📄 Indexing: maths_english.pdf [English Medium]
   ```

4. **Student asks in their language:**
   - **Tamil question:** Gets answer from Tamil medium PDF
   - **English question:** Gets answer from English medium PDF

## 🎯 Example

```
grade6/
├── science_tamil.pdf      # Class 6 Science (Tamil medium)
├── science_english.pdf    # Class 6 Science (English medium)
├── maths_ta.pdf           # Maths (Tamil)
└── maths_en.pdf           # Maths (English)
```

**Both get indexed!** Student can learn in either language.

## 💡 Smart Features

✅ **Auto-detects language** from filename
✅ **Indexes BOTH mediums** (doesn't skip duplicates)
✅ **Student chooses language** in the app
✅ **RAG picks correct version** based on student's language preference
✅ **Works offline** for both mediums

## 📥 Quick Setup

```bash
# 1. Download both Tamil & English medium PDFs from:
#    https://textbooksonline.tn.nic.in/

# 2. Rename following the pattern above:
#    subject_tamil.pdf or subject_english.pdf

# 3. Put in grade folders:
cp Downloads/class1_maths_tamil.pdf \
   /home/prasanth/EDU_AI/edu-mentor-ai/backend/data/pdfs/grade1/maths_tamil.pdf

# 4. Run batch indexer:
cd /home/prasanth/EDU_AI/edu-mentor-ai/backend
python tools/batch_index_pdfs.py

# Done! Both mediums are indexed ✅
```

## 🔍 What Gets Indexed

For each subject with both mediums:
- **Tamil Medium PDF** → Tagged as `lang=ta`
- **English Medium PDF** → Tagged as `lang=en`
- **RAG retrieves** the one matching student's language setting

## 📊 Storage Estimate

Example for Grade 5:
- Tamil Medium: 6 subjects × ~20MB = 120MB
- English Medium: 6 subjects × ~20MB = 120MB
- **Total per grade:** ~240MB

**All grades (1-12):**
- Tamil + English Medium: ~6GB PDFs + ~600MB index
- **Total:** ~7GB

## ✅ Benefits

1. **Bilingual students** can switch languages anytime
2. **Rural schools** often have mixed medium students
3. **Translation help** - compare same concept in both languages
4. **Better learning** - some concepts clearer in different languages

## 🎓 Example Usage

**Student profile:**
- Name: Priya
- Grade: 5
- Language: Tamil

**Priya asks:** "What is photosynthesis?" (in Tamil: "ஒளிச்சேர்க்கை என்றால் என்ன?")

**RAG finds:**
- Searches `grade=6, subject=science, lang=ta`
- Retrieves from `science_tamil.pdf`
- Answer in Tamil from Tamil medium textbook

**Later, Priya switches to English:**
- Same question in English
- RAG now retrieves from `science_english.pdf`
- Answer in English from English medium textbook

## 🚀 Ready to Go!

Just download your PDFs, name them with `_tamil` or `_english`, and run the batch indexer. The system handles the rest! 📚
