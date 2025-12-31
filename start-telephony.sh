#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Jefferson Dental Telephony Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed!${NC}"
    echo -e "${YELLOW}Install it with: npm install -g ngrok${NC}"
    echo -e "${YELLOW}Or download from: https://ngrok.com/download${NC}"
    exit 1
fi

# Check if backend .env exists
if [ ! -f backend/.env ]; then
    echo -e "${RED}❌ backend/.env not found!${NC}"
    echo -e "${YELLOW}Please create backend/.env with your Twilio credentials.${NC}"
    echo -e "${YELLOW}See backend/.env.example for template.${NC}"
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d backend/node_modules ]; then
    echo -e "${YELLOW}⚙️  Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚙️  Installing frontend dependencies...${NC}"
    npm install
fi

# Create logs directory
mkdir -p logs

echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo -e "${MAGENTA}Starting services...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    kill $NGROK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Start ngrok
echo -e "${MAGENTA}[1/3] Starting ngrok on port 3001...${NC}"
ngrok http 3001 > logs/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 3  # Wait for ngrok to start

# Get ngrok URL
NGROK_URL=""
for i in {1..10}; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok\.\(io\|app\)' | head -1)
    if [ ! -z "$NGROK_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}❌ Failed to get ngrok URL${NC}"
    cleanup
fi

echo -e "${GREEN}   ✅ ngrok started: ${NGROK_URL}${NC}"
echo ""
echo -e "${BLUE}📝 Automatically updating backend/.env...${NC}"

# Backup .env
cp backend/.env backend/.env.backup

# Update BACKEND_HOST in .env
if grep -q "BACKEND_HOST=" backend/.env; then
    # Replace existing BACKEND_HOST
    sed -i.bak "s|BACKEND_HOST=.*|BACKEND_HOST=${NGROK_URL}|" backend/.env
else
    # Add BACKEND_HOST if it doesn't exist
    echo "" >> backend/.env
    echo "BACKEND_HOST=${NGROK_URL}" >> backend/.env
fi

echo -e "${GREEN}   ✅ Updated BACKEND_HOST=${NGROK_URL}${NC}"
echo -e "${CYAN}   💾 Backup saved to backend/.env.backup${NC}"
sleep 2

# Start backend
echo ""
echo -e "${BLUE}[2/3] Starting backend server...${NC}"
cd backend && npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 3
echo -e "${GREEN}   ✅ Backend server started on port 3001${NC}"

# Start frontend
echo ""
echo -e "${GREEN}[3/3] Starting frontend...${NC}"
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3
echo -e "${GREEN}   ✅ Frontend started on port 3000${NC}"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🚀 All services running!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${MAGENTA}📡 ngrok URL:     ${NGROK_URL}${NC}"
echo -e "${BLUE}🔧 Backend:       http://localhost:3001${NC}"
echo -e "${GREEN}🌐 Frontend:      http://localhost:3000${NC}"
echo -e "${YELLOW}📊 ngrok inspect: http://localhost:4040${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   ngrok:    tail -f logs/ngrok.log"
echo -e "   backend:  tail -f logs/backend.log"
echo -e "   frontend: tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for user interrupt
wait
