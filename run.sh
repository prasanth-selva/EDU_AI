#!/bin/bash

# EDU Mentor AI - Run Script
# This script starts the FastAPI backend server

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "================================================"
echo "  EDU MENTOR AI - Starting Server"
echo "================================================"

# Check if Ollama is running
echo -e "\n${YELLOW}Checking Ollama service...${NC}"
if ! curl -s http://127.0.0.1:11434/api/tags &> /dev/null; then
    echo -e "${RED}Ollama service is not running!${NC}"
    echo -e "${YELLOW}Starting Ollama service...${NC}"
    ollama serve &> /dev/null &
    sleep 3
    if curl -s http://127.0.0.1:11434/api/tags &> /dev/null; then
        echo -e "${GREEN}✓ Ollama service started${NC}"
    else
        echo -e "${RED}Failed to start Ollama. Please run 'ollama serve' manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Ollama is running${NC}"
fi

# Navigate to backend directory
cd edu-mentor-ai/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}Virtual environment not found!${NC}"
    echo -e "Please run ${YELLOW}./setup.sh${NC} first"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Start the server
echo -e "\n${GREEN}Starting EDU Mentor AI server...${NC}"
echo -e "${YELLOW}Server will be available at: http://localhost:8000${NC}"
echo -e "${YELLOW}Frontend will be available at: http://localhost:8000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop the server${NC}\n"

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
