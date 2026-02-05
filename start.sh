#!/bin/bash

# EDU AI - Easy Startup Script
# Run this script to start all services

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Starting EDU AI System...                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. Start Backend Server
echo -e "${BLUE}[1/2]${NC} Starting Backend Server..."
cd "$SCRIPT_DIR/edu-mentor-ai/backend"
nohup ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
echo "      URL: http://localhost:8000"

# Wait for backend to start
sleep 2

# 2. Start Telegram Bot
echo -e "${BLUE}[2/2]${NC} Starting Telegram Bot..."
cd "$SCRIPT_DIR"
nohup node bot.js > bot.log 2>&1 &
BOT_PID=$!
echo -e "${GREEN}✓${NC} Telegram Bot started (PID: $BOT_PID)"
echo "      Bot: @CodeX_learn_bot"

# Wait for bot to initialize
sleep 2

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          ✅ EDU AI System Running!                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Frontend:     http://localhost:8000"
echo "📚 API Docs:     http://localhost:8000/docs"
echo "🤖 Telegram Bot: @CodeX_learn_bot"
echo ""
echo "📋 Logs:"
echo "   Backend: $SCRIPT_DIR/edu-mentor-ai/backend/backend.log"
echo "   Bot:     $SCRIPT_DIR/bot.log"
echo ""
echo "To stop all services, run: ./stop.sh"
echo ""
