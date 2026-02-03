#!/bin/bash

# EDU Mentor AI - Setup Script
# This script sets up the project with local Ollama models

set -e

echo "================================================"
echo "  EDU MENTOR AI - Local Setup"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Ollama is installed
echo -e "\n${YELLOW}Checking Ollama installation...${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}Ollama is not installed!${NC}"
    echo "Please install Ollama from: https://ollama.com/download"
    echo ""
    echo "On Linux, run:"
    echo "  curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
else
    echo -e "${GREEN}✓ Ollama is installed${NC}"
fi

# Check if Ollama service is running
echo -e "\n${YELLOW}Checking Ollama service...${NC}"
if curl -s http://127.0.0.1:11434/api/tags &> /dev/null; then
    echo -e "${GREEN}✓ Ollama service is running${NC}"
else
    echo -e "${YELLOW}⚠ Ollama service is not running${NC}"
    echo "Starting Ollama service..."
    ollama serve &> /dev/null &
    sleep 3
    if curl -s http://127.0.0.1:11434/api/tags &> /dev/null; then
        echo -e "${GREEN}✓ Ollama service started${NC}"
    else
        echo -e "${RED}Failed to start Ollama service${NC}"
        exit 1
    fi
fi

# Pull required models
echo -e "\n${YELLOW}Checking and pulling required models...${NC}"
echo "This may take a few minutes on first run..."

MODELS=("phi3:mini" "gemma:2b" "qwen:1.8b")
for model in "${MODELS[@]}"; do
    echo -e "\n${YELLOW}Checking model: $model${NC}"
    if ollama list | grep -q "$model"; then
        echo -e "${GREEN}✓ Model $model already exists${NC}"
    else
        echo -e "${YELLOW}Pulling model: $model (this may take several minutes)...${NC}"
        ollama pull "$model"
        echo -e "${GREEN}✓ Model $model pulled successfully${NC}"
    fi
done

# Setup Python backend
echo -e "\n${YELLOW}Setting up Python backend...${NC}"
cd edu-mentor-ai/backend

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed!${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment and install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
echo -e "${GREEN}✓ Python dependencies installed${NC}"

cd ../..

# Setup Node.js Telegram bot (optional)
echo -e "\n${YELLOW}Setting up Telegram bot (optional)...${NC}"
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
        npm install > /dev/null 2>&1
        echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Node.js dependencies already installed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found. Skipping Telegram bot setup.${NC}"
fi

# Create .env file if it doesn't exist
if [ ! -f "edu-mentor-ai/backend/.env" ]; then
    echo -e "\n${YELLOW}Creating .env configuration file...${NC}"
    cat > edu-mentor-ai/backend/.env << 'EOF'
# Ollama Configuration
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_TIMEOUT=180
OLLAMA_TEMPERATURE=0.2
OLLAMA_TOP_P=0.9
OLLAMA_TOP_K=40
OLLAMA_NUM_PREDICT=256

# Model Packs (Grade-based)
MODEL_PACK_A=phi3:mini
MODEL_PACK_B=phi3:mini
MODEL_PACK_C=gemma:2b
MODEL_PACK_D=qwen:1.8b
MODEL_PACK_E=phi3:mini

# Default model
OLLAMA_MODEL=phi3:mini
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  Setup Complete! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\nTo start the EDU Mentor AI server, run:"
echo -e "  ${YELLOW}./run.sh${NC}"
echo -e "\nOr manually:"
echo -e "  ${YELLOW}cd edu-mentor-ai/backend${NC}"
echo -e "  ${YELLOW}source venv/bin/activate${NC}"
echo -e "  ${YELLOW}uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload${NC}"
echo -e "\nThe app will be available at: ${YELLOW}http://localhost:8000${NC}"
echo ""
