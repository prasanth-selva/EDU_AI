#!/bin/bash
echo "Setting up Edu Mentor AI v2..."

# 1. Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# 2. Check for Ollama
if ! command -v ollama &> /dev/null
then
    echo "[!] Ollama is not installed. Please install Ollama from https://ollama.com to run the AI Tutor."
    echo "[!] Exiting setup."
    exit 1
fi

# 3. Pull required models
echo "Pulling Ollama models (this may take a while)..."
# We'll use qwen2.5:1.5b as a default fast local model for chat and quiz generation
ollama pull qwen2.5:1.5b
# We'll use nomic-embed-text for RAG embeddings
ollama pull nomic-embed-text

# 4. Set up directories
mkdir -p db/faiss_index
mkdir -p pdfs

echo "Setup complete! Run ./run.sh to start the server."
