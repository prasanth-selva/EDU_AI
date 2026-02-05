#!/bin/bash

# EDU AI - Status Check Script
# Run this script to check system status

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          EDU AI System Status                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Backend
echo -e "${YELLOW}Backend Server:${NC}"
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    PID=$(pgrep -f "uvicorn app.main:app")
    echo -e "  Status: ${GREEN}✓ Running${NC} (PID: $PID)"
    echo "  URL:    http://localhost:8000"
    # Test API
    if curl -s http://localhost:8000 > /dev/null; then
        echo -e "  API:    ${GREEN}✓ Responding${NC}"
    else
        echo -e "  API:    ${RED}✗ Not responding${NC}"
    fi
else
    echo -e "  Status: ${RED}✗ Not running${NC}"
fi

echo ""

# Check Telegram Bot
echo -e "${YELLOW}Telegram Bot:${NC}"
if pgrep -f "node bot.js" > /dev/null; then
    PID=$(pgrep -f "node bot.js")
    echo -e "  Status: ${GREEN}✓ Running${NC} (PID: $PID)"
    echo "  Bot:    @CodeX_learn_bot"
else
    echo -e "  Status: ${RED}✗ Not running${NC}"
fi

echo ""

# Show recent logs
echo -e "${YELLOW}Recent Logs:${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f "$SCRIPT_DIR/bot.log" ]; then
    echo "  Bot (last 3 lines):"
    tail -3 "$SCRIPT_DIR/bot.log" | sed 's/^/    /'
fi

echo ""
