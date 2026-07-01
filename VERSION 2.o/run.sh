#!/bin/bash
echo "Starting Edu Mentor AI Server..."
# Run the FastAPI server via uvicorn
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
