#!/bin/bash

# EDU MENTOR AI - Quick Setup Script for Linux/Ubuntu
# This script installs all dependencies and sets up the system

set -e  # Exit on error

echo "📚 EDU MENTOR AI - தமிழ் நாடு மாணவர்களுக்கான ஆஃப்லைன் AI ஆசிரியர்"
echo "================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}❌ This script is for Linux only${NC}"
    echo "For Windows, use setup-windows.bat"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}⚠️  This script should NOT be run as root${NC}"
   echo "Please run as regular user"
   exit 1
fi

echo "🔍 Step 1/6: Checking system requirements..."

# Check RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 4 ]; then
    echo -e "${RED}❌ Insufficient RAM: ${TOTAL_RAM}GB (minimum 4GB required)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ RAM: ${TOTAL_RAM}GB${NC}"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    echo "Installing Python 3..."
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✅ Python ${PYTHON_VERSION}${NC}"

echo ""
echo "🔧 Step 2/6: Installing Ollama (AI Engine)..."

if ! command -v ollama &> /dev/null; then
    echo "Downloading Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    
    # Start Ollama service
    echo "Starting Ollama..."
    ollama serve &
    OLLAMA_PID=$!
    sleep 5
    
    echo -e "${GREEN}✅ Ollama installed${NC}"
else
    echo -e "${GREEN}✅ Ollama already installed${NC}"
    ollama serve &
    OLLAMA_PID=$!
    sleep 3
fi

echo ""
echo "🤖 Step 3/6: Downloading AI Models (this may take 5-10 minutes)..."

# Download Phi-3 Mini (primary model)
if ! ollama list | grep -q "phi3:mini"; then
    echo "Downloading Phi-3 Mini (2.5GB)..."
    ollama pull phi3:mini
    echo -e "${GREEN}✅ Phi-3 Mini downloaded${NC}"
else
    echo -e "${GREEN}✅ Phi-3 Mini already available${NC}"
fi

# Optional: Download Gemma2 for LKG/UKG
read -p "Download Gemma2:2b for LKG/UKG students? (lighter model, 1.5GB) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! ollama list | grep -q "gemma2:2b"; then
        ollama pull gemma2:2b
        echo -e "${GREEN}✅ Gemma2 downloaded${NC}"
    fi
fi

echo ""
echo "🐍 Step 4/6: Setting up Python environment..."

cd "$(dirname "$0")/backend"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
echo "Installing Python packages..."
pip install -r requirements.txt

# Install RAG dependencies (optional but recommended)
read -p "Install RAG dependencies for better AI accuracy? (requires 500MB) [Y/n]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    pip install -r requirements-rag.txt
    echo -e "${GREEN}✅ RAG dependencies installed${NC}"
fi

echo ""
echo "📚 Step 5/6: Building knowledge base..."

# Create data directories
mkdir -p data/lessons
mkdir -p data

# Index content
echo "Indexing lesson content..."
python3 -c "
try:
    from app.services.rag_engine import get_rag_engine
    rag = get_rag_engine()
    rag.index_content(force_rebuild=True)
    print('✅ Knowledge base created successfully')
except ImportError:
    print('⚠️  RAG not available, using basic content engine')
except Exception as e:
    print(f'⚠️  Warning: {e}')
"

echo ""
echo "🎨 Step 6/6: Verifying frontend..."

cd ../frontend
if [ ! -f "index-child.html" ]; then
    echo -e "${RED}❌ Frontend files missing${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend ready${NC}"

cd ..

echo ""
echo "================================================================"
echo -e "${GREEN}✅ INSTALLATION COMPLETE!${NC}"
echo "================================================================"
echo ""
echo "🚀 To start EDU Mentor AI:"
echo ""
echo "  1. Start backend:"
echo "     cd backend"
echo "     source venv/bin/activate"
echo "     uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "  2. Open browser:"
echo "     http://localhost:8000/index-child.html"
echo ""
echo "Or use the quick-start script:"
echo "  ./start.sh"
echo ""
echo "📖 For detailed documentation, see DEPLOYMENT.md"
echo ""
echo -e "${YELLOW}💡 Tip: Add to startup applications for auto-launch${NC}"
echo ""

# Create start script
cat > start.sh <<'EOF'
#!/bin/bash

cd "$(dirname "$0")"

# Start Ollama
echo "🤖 Starting Ollama..."
ollama serve &
sleep 3

# Start backend
echo "🐍 Starting backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Open browser
echo "🌐 Opening browser..."
xdg-open http://localhost:8000/index-child.html

echo ""
echo "✅ EDU Mentor AI is running!"
echo "Press Ctrl+C to stop"

# Wait for backend
wait $BACKEND_PID
EOF

chmod +x start.sh

echo -e "${GREEN}Created start.sh for quick launch${NC}"
echo ""
echo "Happy Learning! 📚✨"
