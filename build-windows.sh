#!/bin/bash
# EDU Mentor AI - Windows App Packaging Script (using PyInstaller)

echo "🚀 EDU Mentor AI - Windows App Builder"
echo "======================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is required. Please install Python 3.10+"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/edu-mentor-ai/backend" || exit 1

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt
pip install pyinstaller

# Create launcher script
cat > launcher.py << 'EOF'
#!/usr/bin/env python3
"""EDU Mentor AI - Desktop Launcher"""
import os
import sys
import webbrowser
import threading
import time

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def open_browser():
    """Open browser after server starts"""
    time.sleep(2)
    webbrowser.open("http://127.0.0.1:8000")

def main():
    # Start browser opener thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start the server
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    main()
EOF

echo "🔧 Building Windows executable..."
pyinstaller --onefile --windowed \
    --name "EDU_Mentor_AI" \
    --add-data "app:app" \
    --add-data "../frontend:frontend" \
    --add-data "../content:content" \
    --hidden-import uvicorn \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.protocols \
    --hidden-import uvicorn.protocols.http \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.lifespan \
    --hidden-import uvicorn.lifespan.on \
    launcher.py

echo ""
echo "✅ Build complete!"
echo "📁 Windows executable: dist/EDU_Mentor_AI.exe"
echo ""
echo "To run: Double-click EDU_Mentor_AI.exe"
echo "The app will open in your browser automatically."
