# Jefferson Dental Clinics - Outbound AI Voice Agent

A dual-mode AI voice agent application for outbound Medicaid dental appointment scheduling. Features both browser-based demo mode and production telephony mode via Twilio.

## 🎯 Overview

This application demonstrates "Sophia", an AI agent that conducts outbound calls to parents/guardians to schedule Medicaid dental appointments for their children (Tony and Paula).

### **Dual-Mode Architecture**

#### 1. **Browser Demo Mode** (Original)
- Web Audio API captures microphone in the browser
- Direct WebSocket connection to AI providers (OpenAI/Gemini)
- Perfect for testing, demos, and development
- No phone calls - simulated outbound scenario

#### 2. **Phone Call Mode** (New - Twilio Integration)
- Real outbound phone calls via Twilio
- Node.js backend bridges Twilio ↔ AI providers
- Production-ready telephony system
- Calls any phone number

---

## 🚀 Quick Start

### Browser Demo Mode (Fastest)
bash
npm install
npm run dev


Visit http://localhost:3000, select "Browser Demo" mode, and click "Simulate Outbound Call".

### Phone Call Mode
bash
# 1. Install backend
cd backend && npm install

# 2. Configure backend/.env with Twilio credentials
# 3. Start backend
npm run dev

# 4. Start frontend (in another terminal)
cd .. && npm run dev


Visit http://localhost:3000, select "Phone Call" mode, enter a number, and click "Place Call".

---

## 📚 Full Documentation

See the comprehensive setup guide, architecture details, and troubleshooting in the full README below.

[Full documentation continues...]
