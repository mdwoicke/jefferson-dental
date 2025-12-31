# Quick Start Guide - Auto-Update Edition ✨

The scripts now **automatically update** `backend/.env` with the ngrok URL!

## 🚀 One-Command Startup

### Option 1: NPM Script (Recommended - All Platforms) ⭐

```bash
npm run start:telephony
```

**What it does:**
1. ✅ Starts ngrok on port 3001
2. ✅ Waits for ngrok to get a URL
3. ✅ **Automatically updates `backend/.env`** with ngrok URL
4. ✅ Backs up your old .env to `.env.backup`
5. ✅ Starts backend server
6. ✅ Starts frontend
7. ✅ Shows all URLs

**That's it!** No manual .env editing needed! 🎉

### Option 2: Bash Script (Linux/Mac/WSL)

```bash
./start-telephony.sh
```

Same auto-update features as the npm script.

### Option 3: Windows Batch (Auto-Update Version)

```cmd
start-telephony-auto.bat
```

Runs the Node.js script for automatic updates.

---

## 📋 First Time Setup (5 minutes)

### 1. Configure Twilio Credentials

```bash
# Copy the example
cp backend/.env.example backend/.env

# Edit backend/.env and add:
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN
# - TWILIO_PHONE_NUMBER
# - OPENAI_API_KEY or GEMINI_API_KEY
```

### 2. Install ngrok

```bash
npm install -g ngrok
```

### 3. Run!

```bash
npm run start:telephony
```

---

## 🎯 Usage Flow

```bash
# Start everything
npm run start:telephony

# Watch the magic happen:
# [1/5] Starting ngrok...           ✅
# [2/5] Getting ngrok URL...        ✅ https://abc123.ngrok.io
# [3/5] Updating backend/.env...    ✅
# [4/5] Starting backend...         ✅
# [5/5] Starting frontend...        ✅

# Open http://localhost:3000
# Select "Phone Call" mode
# Make a call! 📞
```

---

## 🔄 What Gets Updated Automatically

The script updates this line in `backend/.env`:

```env
# Before
BACKEND_HOST=http://localhost:3001

# After (automatically)
BACKEND_HOST=https://abc123.ngrok.io
```

**Backup**: Your original `.env` is saved to `backend/.env.backup`

---

## 📊 Console Output Example

```
╔══════════════════════════════════════════════╗
║  Jefferson Dental Telephony Startup         ║
╚══════════════════════════════════════════════╝

🚀 [1/4] Starting ngrok on port 3001...
[NGROK] Session Status: online
[NGROK] Forwarding: https://abc123.ngrok.io -> http://localhost:3001

🔍 [2/4] Getting ngrok URL...
✅ ngrok URL: https://abc123.ngrok.io

📝 [3/4] Updating backend/.env...
✅ Updated backend/.env with BACKEND_HOST=https://abc123.ngrok.io
💾 Backup saved to backend/.env.backup

🔧 [4/4] Starting backend server...
[BACKEND] ✅ Server running on port 3001

🌐 [5/5] Starting frontend...
[FRONTEND] ➜  Local: http://localhost:3000

╔══════════════════════════════════════════════╗
║  ✨ All services running!                   ║
╚══════════════════════════════════════════════╝

📡 ngrok:         https://abc123.ngrok.io
🔧 Backend:       http://localhost:3001
🌐 Frontend:      http://localhost:3000
📊 ngrok inspect: http://localhost:4040

💡 Open http://localhost:3000 and select "Phone Call" mode
⚠️  Press Ctrl+C to stop all services
```

---

## ⚙️ Advanced Options

### Manual Mode (No Auto-Update)

If you want to update `.env` manually:

```bash
npm run start:manual
```

This uses the old behavior (doesn't auto-update).

### Individual Services

```bash
# Frontend only (browser demo)
npm run dev

# Backend only
npm run backend

# Backend + Frontend (no ngrok)
npm run start:all
```

---

## 🔍 Verification

After startup, verify everything is working:

### 1. Check Backend

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","environment":"development","activeCalls":0}`

### 2. Check ngrok Tunnel

```bash
curl https://your-ngrok-url.ngrok.io/health
```

Should return the same response.

### 3. Check .env Update

```bash
cat backend/.env | grep BACKEND_HOST
```

Should show: `BACKEND_HOST=https://your-ngrok-url.ngrok.io`

### 4. Open Frontend

Visit http://localhost:3000 - you should see the UI with mode selector.

---

## 🐛 Troubleshooting

### Script Fails to Get ngrok URL

**Cause**: ngrok not started yet

**Fix**: The script waits 15 seconds. If it still fails:
```bash
# Start ngrok manually first
ngrok http 3001

# Then in another terminal
npm run backend
npm run dev
```

### .env Not Updated

**Check**:
```bash
# Verify backup exists
ls -la backend/.env.backup

# Check if .env is writable
ls -la backend/.env
```

**Fix**: Ensure `backend/.env` is not read-only.

### Port Already in Use

**3001 in use**:
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9  # Mac/Linux
# Or
netstat -ano | findstr :3001   # Windows
```

**4040 in use** (ngrok):
```bash
# Kill ngrok
pkill ngrok  # Mac/Linux
taskkill /IM ngrok.exe /F  # Windows
```

---

## 💡 Pro Tips

1. **Keep ngrok running**: If you stop and restart, the URL changes
2. **Free ngrok account**: Get a static domain to avoid URL changes
3. **Production**: Deploy backend to cloud (no ngrok needed)
4. **Monitor logs**: All output is color-coded by service
5. **Quick restart**: Ctrl+C then `npm run start:telephony` again

---

## 📚 What Changed?

### Before (Manual)
```bash
npm run start:telephony
# See ngrok URL
Ctrl+C
# Manually edit backend/.env
# Update BACKEND_HOST
npm run start:telephony  # again
```

### Now (Automatic) ✨
```bash
npm run start:telephony
# Everything happens automatically!
# Just wait and it's ready
```

---

## 🎉 Next Steps

1. ✅ Run `npm run start:telephony`
2. ✅ Wait for "All services running!"
3. ✅ Open http://localhost:3000
4. ✅ Select "Phone Call" mode
5. ✅ Enter your phone number
6. ✅ Click "Place Call"
7. ✅ Talk to Sophia! 📞

---

**Questions?** Check:
- Full docs: `STARTUP_GUIDE.md`
- Testing: `TEST_CHECKLIST.md`
- Twilio setup: `backend/SETUP_GUIDE.md`
