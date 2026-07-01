#!/bin/bash
echo "Starting Edu Mentor AI Server on port 8111..."
# Ensure db and pdfs directories exist
mkdir -p db/faiss_index
mkdir -p pdfs

# Run the FastAPI server via uvicorn in the virtual environment
./venv/bin/python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8111
