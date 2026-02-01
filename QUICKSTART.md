# EDU MENTOR AI - Quick Start Guide

## 🚀 One-Command Setup & Run

### Step 1: Setup (First Time Only)
```bash
chmod +x setup.sh run.sh
./setup.sh
```

This will:
- ✅ Check Ollama installation
- ✅ Pull required local AI models (phi3:mini, gemma:2b, qwen:1.8b)
- ✅ Setup Python virtual environment
- ✅ Install all dependencies
- ✅ Configure environment variables

### Step 2: Run
```bash
./run.sh
```

Access the app at: **http://localhost:8000**

---

## 📋 Prerequisites

- **Python 3.8+**
- **Ollama** (for local AI models)

### Install Ollama (if not installed)

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
```bash
brew install ollama
```

Or download from: https://ollama.com/download

---

## 🏗️ Project Structure

```
EDU_AI/
├── setup.sh                    # One-time setup script
├── run.sh                      # Run the backend server
├── edu-mentor-ai/
│   ├── backend/                # FastAPI backend with Ollama
│   │   ├── app/
│   │   │   ├── main.py        # Main FastAPI app
│   │   │   ├── services/
│   │   │   │   └── ollama_client.py  # Local AI model interface
│   │   │   ├── routes/        # API endpoints
│   │   │   └── ollama/        # Model configurations
│   │   ├── requirements.txt
│   │   └── .env.example       # Configuration template
│   ├── frontend/              # Web UI
│   └── content/               # Offline syllabus data (class-wise)
├── telegram-bot/              # Optional Telegram bot
└── README.md
```

---

## 🤖 Local AI Models

The project uses **Ollama** for running AI models locally. Models are automatically downloaded during setup.

### Grade-Based Models:
- **Grades 0-2**: phi3:mini (~2.3GB)
- **Grades 3-5**: phi3:mini (~2.3GB)
- **Grades 6-8**: gemma:2b (~1.7GB)
- **Grades 9-10**: qwen:1.8b (~1.1GB)
- **Grades 11-13**: phi3:mini (~2.3GB)

### Manual Model Management:
```bash
# List installed models
ollama list

# Pull a specific model
ollama pull phi3:mini

# Remove a model
ollama rm model-name
```

---

## 🔧 Configuration

Configuration is in `edu-mentor-ai/backend/.env` (auto-created during setup).

Key settings:
```bash
OLLAMA_URL=http://127.0.0.1:11434  # Ollama server URL
MODEL_PACK_A=phi3:mini             # Model for grades 0-2
MODEL_PACK_B=phi3:mini             # Model for grades 3-5
MODEL_PACK_C=gemma:2b              # Model for grades 6-8
MODEL_PACK_D=qwen:1.8b             # Model for grades 9-10
MODEL_PACK_E=phi3:mini             # Model for grades 11-13
```

---

## 🌐 API Endpoints

Once running, access:

- **Frontend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Main API Routes:
- `/api/ai/*` - AI chat and tutoring
- `/api/content/*` - Syllabus content
- `/api/quiz/*` - Quiz generation and evaluation
- `/api/students/*` - Student management
- `/api/sync/*` - Data synchronization

---

## 🐛 Troubleshooting

### Ollama not responding
```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# Start Ollama manually
ollama serve
```

### Port 8000 already in use
```bash
# Kill process on port 8000
sudo lsof -t -i:8000 | xargs kill -9

# Or change port in run.sh (edit --port 8000)
```

### Python dependencies error
```bash
cd edu-mentor-ai/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Model not found
```bash
# Pull the missing model
ollama pull phi3:mini
ollama pull gemma:2b
ollama pull qwen:1.8b
```

---

## 📱 Optional: Telegram Bot

If you want to run the Telegram bot:

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Create `config/constant.js`:
```javascript
module.exports = {
  BOT_TOKEN: 'your-bot-token-here'
};
```
4. Run: `node bot.js`

---

## 🔄 Development

### Start backend in development mode:
```bash
cd edu-mentor-ai/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Add new content:
Add JSON files to `edu-mentor-ai/content/class_X/` following the existing structure.

---

## 📊 Features

- ✅ **100% Offline** - Works without internet after setup
- ✅ **Local AI Models** - No cloud dependencies
- ✅ **Multi-language** - Tamil (primary) & English
- ✅ **Grade-based** - Optimized models for each grade level (LKG-12)
- ✅ **Quiz System** - AI-generated quizzes and progress tracking
- ✅ **Low Resource** - Runs on modest hardware
- ✅ **Privacy-First** - All data stays on your device

---

## 🎯 System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB free space
- OS: Linux, macOS, Windows (WSL)

**Recommended:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 20GB SSD
- GPU: Optional (for faster inference)

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please read the existing code structure before making changes.

---

## 💡 Need Help?

1. Check troubleshooting section above
2. Review logs in terminal
3. Ensure Ollama is running: `ollama list`
4. Check API docs: http://localhost:8000/docs

---

**Built with ❤️ for Tamil Nadu State Board Students**
