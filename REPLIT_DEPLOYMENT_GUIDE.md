# Jefferson Dental Clinics - Replit Deployment Guide

> **Complete end-to-end setup guide for deploying the AI Voice Agent on Replit**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Replit Project Setup](#4-replit-project-setup)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Setup](#6-database-setup)
7. [Port Configuration](#7-port-configuration)
8. [Replit Configuration Files](#8-replit-configuration-files)
9. [Twilio Webhook Configuration](#9-twilio-webhook-configuration)
10. [Running the Application](#10-running-the-application)
11. [Troubleshooting](#11-troubleshooting)
12. [Production Optimizations](#12-production-optimizations)

---

## 1. Overview

### What This Application Does

The **Jefferson Dental Clinics AI Voice Agent** is a full-stack application that:

- Makes **outbound AI phone calls** to parents about scheduling Medicaid dental appointments
- Supports **real-time voice conversations** with OpenAI GPT-4o or Google Gemini
- Integrates with **Twilio** for telephony (making/receiving calls, SMS)
- Features a **browser-based demo mode** for testing without phone calls
- Includes **CRM integration** for patient management
- Provides **real-time function calling** (check availability, book appointments, send SMS)

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, WebSocket |
| Database | SQLite (better-sqlite3) |
| AI Providers | OpenAI Realtime API, Google Gemini Live API |
| Telephony | Twilio Voice API, Twilio SMS |
| Audio | Web Audio API, PCM streaming |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         REPLIT                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   Frontend (Vite)   │    │      Backend (Express)          │ │
│  │   Port: 5173        │◄──►│      Port: 3001                 │ │
│  │                     │    │                                 │ │
│  │  - React UI         │    │  - REST API (/api/*)            │ │
│  │  - Audio Visualizer │    │  - WebSocket (real-time)        │ │
│  │  - Browser Demo     │    │  - SQLite Database              │ │
│  └─────────────────────┘    │  - AI Provider Integration      │ │
│                             │  - Twilio Integration           │ │
│                             └───────────┬─────────────────────┘ │
│                                         │                       │
└─────────────────────────────────────────┼───────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────┐
              │                           │                       │
              ▼                           ▼                       ▼
      ┌──────────────┐          ┌──────────────┐         ┌──────────────┐
      │    Twilio    │          │   OpenAI     │         │   Gemini     │
      │  Voice/SMS   │          │  Realtime    │         │   Live API   │
      └──────────────┘          └──────────────┘         └──────────────┘
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/calls` | POST | Initiate outbound call |
| `/api/calls/:id` | DELETE | End active call |
| `/api/patients` | GET/POST | Patient CRUD |
| `/voice-webhook` | POST | Twilio TwiML (call answered) |
| `/call-status` | POST | Twilio status callbacks |
| `/media-stream` | WebSocket | Twilio audio streaming |
| `/health` | GET | Health check |

---

## 3. Prerequisites

### Required Accounts

1. **Twilio Account** (for phone calls)
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get a phone number with Voice capabilities
   - Note your Account SID and Auth Token

2. **OpenAI Account** (for AI voice - recommended)
   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Create an API key with Realtime API access
   - Requires GPT-4o model access

3. **Google AI Account** (optional alternative)
   - Get API key from [aistudio.google.com](https://aistudio.google.com)
   - Gemini 2.5 Flash with native audio support

### Required API Keys

| Key | Required | Purpose |
|-----|----------|---------|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio authentication |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio authentication |
| `TWILIO_PHONE_NUMBER` | Yes | Outbound caller ID |
| `OPENAI_API_KEY` | Yes* | OpenAI Realtime voice |
| `GEMINI_API_KEY` | Optional | Alternative AI provider |

*At least one AI provider key required

---

## 4. Replit Project Setup

### Step 1: Create New Replit

1. Go to [replit.com](https://replit.com)
2. Click **"Create Repl"**
3. Select **"Import from GitHub"**
4. Enter repository URL: `https://github.com/mdwoicke/jefferson-dental`
5. Click **"Import from GitHub"**

### Step 2: Verify Project Structure

After import, verify these directories exist:

```
jefferson-dental/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── database/
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
├── components/
├── hooks/
├── providers/
├── services/
├── package.json
├── vite.config.ts
└── index.html
```

### Step 3: Install Dependencies

Open the **Shell** tab and run:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

---

## 5. Environment Configuration

### Step 1: Configure Replit Secrets

In Replit, go to **Tools → Secrets** and add these secrets:

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | From Twilio Console |
| `TWILIO_PHONE_NUMBER` | `+15551234567` | Your Twilio phone number |
| `OPENAI_API_KEY` | `sk-xxxxxxxxxxxxxxxxxxxxxxxx` | From OpenAI Platform |
| `GEMINI_API_KEY` | `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx` | From Google AI Studio |
| `NODE_ENV` | `production` | Environment mode |
| `BACKEND_PORT` | `3001` | Backend server port |

### Step 2: Create Backend Environment File

Create `backend/.env` file:

```bash
# In Replit Shell:
cat > backend/.env << 'EOF'
# Twilio Configuration
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}

# AI Provider Keys
OPENAI_API_KEY=${OPENAI_API_KEY}
GEMINI_API_KEY=${GEMINI_API_KEY}

# Inbound Call Configuration
INBOUND_AI_PROVIDER=openai

# SMS Configuration
SMS_ENABLED=true
SMS_CONFIRMATION_MODE=ask
SMS_TEST_MODE=false

# Server Configuration
BACKEND_PORT=3001
BACKEND_HOST=https://${REPL_SLUG}.${REPL_OWNER}.repl.co
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://${REPL_SLUG}.${REPL_OWNER}.repl.co
EOF
```

### Step 3: Create Frontend Environment File

Create `.env.local` in root:

```bash
cat > .env.local << 'EOF'
OPENAI_API_KEY=${OPENAI_API_KEY}
GEMINI_API_KEY=${GEMINI_API_KEY}
BACKEND_URL=https://${REPL_SLUG}.${REPL_OWNER}.repl.co
ENABLE_DYNAMIC_TOOLS=false
EOF
```

### Step 4: Update CORS Configuration

Edit `backend/src/server.ts` and add your Replit URL to CORS origins:

Find the `cors` configuration (around line 30-50) and add:

```typescript
const corsOptions = {
  origin: [
    // Replit URLs
    /\.repl\.co$/,
    /\.replit\.dev$/,
    // Local development
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## 6. Database Setup

### Automatic Initialization

The database initializes automatically on first backend startup:

1. Creates `backend/data/` directory
2. Creates SQLite database file
3. Applies schema from `backend/src/database/schema.sql`
4. Seeds with sample data from `backend/src/database/seed.sql`

### Database Location

```
backend/data/
├── jefferson-dental.db      # Main database
├── jefferson-dental.db-wal  # Write-ahead log
└── jefferson-dental.db-shm  # Shared memory
```

### Persistence Configuration

**IMPORTANT**: Configure Replit to persist the database directory.

In `.replit` file, add:

```toml
[nix]
channel = "stable-22_11"

[deployment]
run = ["sh", "-c", "npm run start:replit"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 3001
externalPort = 80

[[ports]]
localPort = 5173
externalPort = 3000
```

### Manual Database Reset (if needed)

```bash
# Remove existing database to start fresh
rm -rf backend/data/

# Restart backend to reinitialize
npm run backend
```

---

## 7. Port Configuration

### Default Ports

| Service | Internal Port | External Access |
|---------|--------------|-----------------|
| Frontend (Vite) | 5173 | Via Replit proxy |
| Backend (Express) | 3001 | Via Replit proxy |
| WebSocket | 3001 | Via Replit proxy (wss://) |

### Vite Configuration

The frontend is configured in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',  // Listen on all interfaces (required for Replit)
  },
  // ... rest of config
});
```

### Backend Configuration

The backend listens on port 3001 by default. This is set in:

- `backend/.env`: `BACKEND_PORT=3001`
- `backend/src/config.ts`: Uses environment variable

### Replit Port Forwarding

Replit automatically provides HTTPS URLs for your ports:

- Frontend: `https://{repl-name}.{username}.repl.co`
- Backend: `https://{repl-name}.{username}.repl.co:3001` or via proxy

---

## 8. Replit Configuration Files

### Create `.replit` File

Create `.replit` in the project root:

```toml
# Replit Configuration
run = "npm run start:replit"
entrypoint = "index.html"

# Language and runtime
language = "nodejs"
[nix]
channel = "stable-23_05"

# Port configuration
[[ports]]
localPort = 3001
externalPort = 80

[[ports]]
localPort = 5173
externalPort = 3000

# Environment
[env]
NODE_ENV = "production"

# Deployment
[deployment]
run = ["sh", "-c", "npm run start:replit"]
deploymentTarget = "cloudrun"
ignorePorts = false
```

### Create `replit.nix` File

Create `replit.nix` for system dependencies:

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.python311  # Required for some native modules
    pkgs.gcc        # Required for better-sqlite3 compilation
  ];
}
```

### Add Replit Start Script to `package.json`

Add this script to root `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "backend": "cd backend && npm run dev",
    "start:all": "concurrently \"npm:backend\" \"npm:dev\"",
    "start:replit": "concurrently --kill-others \"npm:backend\" \"npm:dev\"",
    "build:backend": "cd backend && npm run build",
    "start:prod": "concurrently \"cd backend && node dist/server.js\" \"npm run preview\""
  }
}
```

---

## 9. Twilio Webhook Configuration

### Why Webhooks Are Needed

When Twilio handles a call, it needs to know:
1. **What to say/do** when the call is answered (`/voice-webhook`)
2. **Where to stream audio** for AI processing (`/media-stream`)
3. **Where to send status updates** (`/call-status`)

### Get Your Replit Public URL

Your Replit public URL format:
```
https://{repl-name}.{username}.repl.co
```

Example: `https://jefferson-dental.mdwoicke.repl.co`

### Configure Twilio Phone Number

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers → Manage → Active Numbers**
3. Click on your phone number
4. Configure **Voice & Fax** section:

| Setting | Value |
|---------|-------|
| **A CALL COMES IN** | Webhook |
| **URL** | `https://{your-replit-url}/voice-webhook` |
| **HTTP Method** | POST |
| **STATUS CALLBACK URL** | `https://{your-replit-url}/call-status` |

### Update Backend Host

The backend needs to know its public URL for generating correct webhook URLs.

In `backend/.env`, set:

```env
BACKEND_HOST=https://{repl-name}.{username}.repl.co
```

**Example:**
```env
BACKEND_HOST=https://jefferson-dental.mdwoicke.repl.co
```

### Verify Webhook Configuration

After starting the application, the backend logs should show:

```
============================================================
🚀 JEFFERSON DENTAL TELEPHONY SERVER
============================================================
📡 Server running on port 3001
🌐 Backend host: https://jefferson-dental.mdwoicke.repl.co
📞 Twilio phone: +15551234567
🤖 OpenAI configured: ✅
============================================================
```

---

## 10. Running the Application

### Development Mode

```bash
# Start both frontend and backend
npm run start:replit
```

This runs:
- Backend: `ts-node backend/src/server.ts` on port 3001
- Frontend: `vite` on port 5173

### Production Mode (Recommended for Replit)

```bash
# Build both frontend and backend
npm run build
npm run build:backend

# Start production servers
npm run start:prod
```

### Startup Sequence

1. **Backend starts first** → Initializes database, connects to services
2. **Frontend starts** → Connects to backend via WebSocket
3. **Application ready** → Access via Replit URL

### Expected Console Output

```
[BACKEND] 📦 Initializing backend database...
[BACKEND] ✅ Database ready with 4 patients
[BACKEND] ============================================================
[BACKEND] 🚀 JEFFERSON DENTAL TELEPHONY SERVER
[BACKEND] ============================================================
[BACKEND] 📡 Server running on port 3001
[BACKEND] 🌐 Backend host: https://jefferson-dental.mdwoicke.repl.co
[BACKEND] 📞 Twilio phone: +15551234567
[BACKEND] 🤖 OpenAI configured: ✅
[BACKEND] 🤖 Gemini configured: ✅
[BACKEND] ============================================================
[BACKEND] ✅ Server ready!

[FRONTEND] VITE v6.2.0  ready in 303 ms
[FRONTEND] ➜  Local:   http://localhost:5173/
[FRONTEND] ➜  Network: http://0.0.0.0:5173/
```

### Access the Application

1. **Frontend UI**: Click the Replit "Open in new tab" or visit your Replit URL
2. **API Health Check**: `https://{your-replit-url}/health`

---

## 11. Troubleshooting

### Common Issues

#### Issue: "Cannot find module 'better-sqlite3'"

**Cause**: Native module compilation failed

**Solution**:
```bash
cd backend
rm -rf node_modules
npm install --build-from-source
```

#### Issue: "CORS error" in browser console

**Cause**: Backend not allowing frontend origin

**Solution**: Update CORS config in `backend/src/server.ts`:
```typescript
origin: [
  /\.repl\.co$/,
  /\.replit\.dev$/,
  'http://localhost:5173'
]
```

#### Issue: "WebSocket connection failed"

**Cause**: WebSocket URL incorrect or blocked

**Solution**:
1. Ensure backend is running on port 3001
2. Check that Replit isn't blocking WebSocket connections
3. Verify the WebSocket URL uses `wss://` (not `ws://`)

#### Issue: "Twilio webhook returns 404"

**Cause**: Backend not accessible or wrong URL

**Solution**:
1. Verify `BACKEND_HOST` in `backend/.env` matches Replit URL
2. Test endpoint: `curl https://{your-url}/health`
3. Check Twilio console for error details

#### Issue: "Database locked" error

**Cause**: Multiple processes accessing SQLite

**Solution**:
```bash
# Stop all processes
pkill -f "node"

# Remove lock files
rm -f backend/data/*.db-shm backend/data/*.db-wal

# Restart
npm run start:replit
```

#### Issue: "OpenAI API error: Invalid API key"

**Cause**: API key not set or incorrect

**Solution**:
1. Verify key in Replit Secrets
2. Ensure key starts with `sk-`
3. Check key has Realtime API access

### Debug Mode

Enable verbose logging by setting in `backend/.env`:

```env
DEBUG=true
NODE_ENV=development
```

### Health Check Endpoints

| Endpoint | Expected Response |
|----------|-------------------|
| `GET /health` | `{"status":"ok","activeCalls":0}` |
| `GET /api/patients` | List of patients (JSON array) |

---

## 12. Production Optimizations

### Build for Production

```bash
# Build frontend (creates dist/ folder)
npm run build

# Build backend (creates backend/dist/ folder)
cd backend && npm run build && cd ..
```

### Production Start Script

Add to `package.json`:

```json
{
  "scripts": {
    "start:prod": "NODE_ENV=production concurrently \"node backend/dist/server.js\" \"npx serve dist -l 5173\""
  }
}
```

### Memory Optimization

For better performance on Replit:

1. **Use compiled JavaScript** instead of ts-node
2. **Serve static frontend** instead of Vite dev server
3. **Enable database WAL mode** (already configured)

### Recommended `.replit` for Production

```toml
run = "npm run start:prod"

[deployment]
run = ["sh", "-c", "npm run start:prod"]
build = ["sh", "-c", "npm install && cd backend && npm install && npm run build && cd .. && npm run build"]
```

### Database Backups

Schedule periodic backups of `backend/data/jefferson-dental.db`:

```bash
# Manual backup
cp backend/data/jefferson-dental.db backend/data/backup-$(date +%Y%m%d).db
```

---

## Quick Start Checklist

- [ ] Import project to Replit
- [ ] Run `npm install` and `cd backend && npm install`
- [ ] Add all secrets to Replit Secrets
- [ ] Create `backend/.env` with configuration
- [ ] Create `.env.local` with frontend config
- [ ] Update CORS in `backend/src/server.ts`
- [ ] Create `.replit` configuration file
- [ ] Run `npm run start:replit`
- [ ] Configure Twilio webhooks with Replit URL
- [ ] Test health endpoint: `/health`
- [ ] Test frontend UI in browser
- [ ] Make a test call (if Twilio configured)

---

## Support

For issues specific to this application:
- Check the [GitHub Issues](https://github.com/mdwoicke/jefferson-dental/issues)
- Review backend logs in Replit console
- Check Twilio debugger for webhook errors

For Replit-specific issues:
- [Replit Documentation](https://docs.replit.com)
- [Replit Community](https://ask.replit.com)

---

*Generated for Jefferson Dental Clinics AI Voice Agent v1.0*
