# Startup Guide

Three easy ways to start all services for telephony testing.

## 🚀 Option 1: NPM Script (Recommended - Cross-Platform)

This works on Windows, Mac, and Linux.

### For Browser Demo Mode Only (No Backend)

```bash
npm run dev
```

### For Telephony Mode (Backend + Frontend)

```bash
# Start backend and frontend together
npm run start:all
```

### For Telephony Mode with ngrok (All 3 Services)

**Prerequisites:**
1. Install ngrok: `npm install -g ngrok`
2. Configure `backend/.env` with Twilio credentials

**Start:**
```bash
npm run start:telephony
```

This starts:
- ✅ ngrok on port 3001
- ✅ Backend server (Node.js)
- ✅ Frontend (Vite)

**Important**:
1. After ngrok starts, check the terminal for the ngrok URL
2. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. Press `Ctrl+C` to stop
4. Update `backend/.env`: `BACKEND_HOST=https://abc123.ngrok.io`
5. Run `npm run start:telephony` again

---

## 🐧 Option 2: Bash Script (Linux/Mac/WSL)

### Quick Start

```bash
./start-telephony.sh
```

### What It Does

1. ✅ Checks if ngrok is installed
2. ✅ Checks if `backend/.env` exists
3. ✅ Installs dependencies if needed
4. ✅ Starts ngrok and displays the URL
5. ✅ Prompts you to update `backend/.env`
6. ✅ Starts backend server
7. ✅ Starts frontend
8. ✅ Shows all URLs and log locations
9. ✅ Handles graceful shutdown with Ctrl+C

### Features

- **Automatic cleanup**: Press `Ctrl+C` to stop all services
- **Log files**: Creates `logs/` directory with separate logs
- **Color-coded output**: Easy to see what's happening
- **Error checking**: Validates setup before starting

### Viewing Logs

```bash
# Watch backend logs
tail -f logs/backend.log

# Watch frontend logs
tail -f logs/frontend.log

# Watch ngrok logs
tail -f logs/ngrok.log
```

---

## 🪟 Option 3: Windows Batch Script

### Quick Start

```cmd
start-telephony.bat
```

### What It Does

1. ✅ Checks if ngrok is installed
2. ✅ Checks if `backend\.env` exists
3. ✅ Installs dependencies if needed
4. ✅ Opens 3 separate command windows:
   - ngrok window
   - Backend server window
   - Frontend window
5. ✅ Each service runs in its own window

### Updating ngrok URL

1. After running the script, check the **ngrok window**
2. Copy the HTTPS URL shown
3. Update `backend\.env`: `BACKEND_HOST=https://abc123.ngrok.io`
4. Restart the backend window (close and run `cd backend && npm run dev`)

---

## 🎯 Recommended Workflow

### First Time Setup

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 2. Install ngrok
npm install -g ngrok

# 3. Start everything
npm run start:telephony

# 4. When ngrok URL appears, copy it
# 5. Stop with Ctrl+C
# 6. Update backend/.env with ngrok URL
# 7. Start again
npm run start:telephony
```

### Daily Development

```bash
# Just run this
npm run start:telephony
```

**Note**: ngrok URL changes each time you restart it (unless you have a paid account). Update `backend/.env` each time.

---

## 📊 Service Overview

| Service | URL | Purpose |
|---------|-----|---------|
| **ngrok** | Check ngrok window/terminal | Public tunnel to backend |
| **Backend** | http://localhost:3001 | Telephony server |
| **Frontend** | http://localhost:3000 | React UI |
| **ngrok Inspector** | http://localhost:4040 | Debug webhooks |

---

## 🔍 Verification

After starting all services, verify they're running:

### 1. Check ngrok

Open http://localhost:4040 in your browser. You should see the ngrok inspector.

### 2. Check Backend

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","environment":"development","activeCalls":0}
```

### 3. Check Frontend

Open http://localhost:3000 in your browser. You should see the Jefferson Dental UI.

### 4. Check ngrok Tunnel

```bash
curl https://your-ngrok-url.ngrok.io/health
```

Should return the same response as step 2.

---

## 🐛 Troubleshooting

### "Port 3001 already in use"

Something is already running on port 3001.

**Fix**:
```bash
# Find and kill the process
# Linux/Mac:
lsof -ti:3001 | xargs kill -9

# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### "ngrok not found"

ngrok is not installed.

**Fix**:
```bash
npm install -g ngrok
```

### Backend fails to start

**Check**:
1. `backend/.env` exists and has correct values
2. Dependencies installed: `cd backend && npm install`
3. TypeScript compiled: `cd backend && npm run build`

### Frontend fails to start

**Check**:
1. Dependencies installed: `npm install`
2. Port 3000 not in use
3. `.env.local` has AI provider keys

### ngrok URL changes every restart

This is normal for free ngrok accounts.

**Solutions**:
1. **Quick**: Update `backend/.env` each time
2. **Better**: Get ngrok authtoken and set static domain
3. **Best**: Deploy backend to cloud (Render, Railway) for permanent URL

---

## ⚡ Quick Commands Reference

```bash
# Start everything (telephony mode)
npm run start:telephony

# Start backend + frontend only
npm run start:all

# Start frontend only (browser demo)
npm run dev

# Start backend only
npm run backend

# Run bash script (Linux/Mac/WSL)
./start-telephony.sh

# Run batch script (Windows)
start-telephony.bat

# Check backend health
curl http://localhost:3001/health

# View backend logs (bash script)
tail -f logs/backend.log

# Stop all (npm scripts)
Ctrl+C

# Stop all (bash script)
Ctrl+C (automatically kills all processes)
```

---

## 🎓 Understanding the Scripts

### NPM Scripts (package.json)

```json
{
  "scripts": {
    "dev": "vite",                    // Frontend only
    "backend": "cd backend && npm run dev",  // Backend only
    "start:all": "concurrently ...",   // Backend + Frontend
    "start:telephony": "concurrently ..." // All 3 services
  }
}
```

### Concurrently

The `concurrently` package runs multiple npm scripts in parallel with:
- Color-coded output
- Named prefixes
- Auto-restart on crash
- Single Ctrl+C stops all

### Bash Script Features

- Process management (stores PIDs)
- Automatic cleanup on exit
- Log file creation
- Dependency checking
- Interactive prompts

---

## 🚀 Production Deployment

For production, you don't need ngrok. Deploy backend to a cloud service:

### Render.com (Recommended - Free Tier)

1. Connect GitHub repo
2. Set environment variables in Render dashboard
3. Deploy automatically
4. Get permanent HTTPS URL
5. Update frontend to use production URL

### Railway.app

1. `railway login`
2. `railway init`
3. `railway up`
4. Set environment variables
5. Get permanent URL

### Heroku

1. `heroku create`
2. `git push heroku main`
3. `heroku config:set KEY=VALUE`
4. Get permanent URL

Once deployed, update frontend `BACKEND_URL` constant to point to production.

---

**Need help?** Check the logs, review error messages, or consult the main README.md.
