#!/bin/bash

# EDU AI - Easy Shutdown Script
# Run this script to stop all services

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Stopping EDU AI System...                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Stop Backend
echo -e "Stopping Backend Server..."
pkill -f "uvicorn app.main:app" && echo -e "${GREEN}✓${NC} Backend stopped" || echo -e "${RED}✗${NC} Backend not running"

# Stop Telegram Bot
echo -e "Stopping Telegram Bot..."
pkill -f "node bot.js" && echo -e "${GREEN}✓${NC} Telegram Bot stopped" || echo -e "${RED}✗${NC} Bot not running"

echo ""
echo -e "${GREEN}All services stopped!${NC}"
echo ""
