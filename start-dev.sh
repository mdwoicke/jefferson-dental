#!/bin/bash

# Jefferson Dental - Clean Dev Server Startup
# Always kills port 3000 first, then starts fresh

PORT=5173

echo "🧹 Cleaning up port $PORT..."

# Kill any process on port 3000
lsof -ti:$PORT | xargs kill -9 2>/dev/null || echo "✅ Port $PORT already clear"

# Kill any lingering node/vite processes
pkill -9 -f "vite" 2>/dev/null || true

sleep 1

echo "🚀 Starting dev server on port $PORT..."
npm run dev
