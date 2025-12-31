# Testing Checklist

Use this checklist to verify your telephony integration is working correctly.

## ✅ Pre-Test Setup

- [ ] Twilio account created
- [ ] Twilio credentials added to `backend/.env`
- [ ] At least one AI provider key configured (OpenAI or Gemini)
- [ ] ngrok installed and running
- [ ] `BACKEND_HOST` in `.env` updated with ngrok HTTPS URL
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`npm install` in root)

## 🧪 Test 1: Backend Health Check

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Test health endpoint
curl http://localhost:3001/health
```

**Expected Output**:
```json
{
  "status": "ok",
  "environment": "development",
  "activeCalls": 0
}
```

**Result**: ⬜ Pass / ⬜ Fail

---

## 🧪 Test 2: Browser Demo Mode (Baseline)

This ensures the original functionality still works.

```bash
# Start frontend
npm run dev
```

1. Open http://localhost:3000
2. Ensure "Browser Demo" mode is selected
3. Choose "OpenAI" provider
4. Click "Simulate Outbound Call"
5. Grant microphone access
6. Verify Sophia greets you with the dental script

**Result**: ⬜ Pass / ⬜ Fail

**Notes**: _______________________

---

## 🧪 Test 3: Backend API (Phone Call Initiation)

Test the REST API without making an actual call.

```bash
# Replace with your phone number
curl -X POST http://localhost:3001/api/calls \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "provider": "openai"}'
```

**Expected Output**:
```json
{
  "callId": "call_1234567890_abc123",
  "status": "initiated"
}
```

**Check**: Look for Twilio call initiation in backend logs.

**Result**: ⬜ Pass / ⬜ Fail

---

## 🧪 Test 4: Phone Call Mode - End to End

### Setup
1. Ensure ngrok is running: `ngrok http 3001`
2. Update `backend/.env` with ngrok HTTPS URL
3. Restart backend: `cd backend && npm run dev`
4. Verify phone number is verified in Twilio (trial accounts only)

### Test Steps

```bash
# Start everything
# Terminal 1: ngrok http 3001
# Terminal 2: cd backend && npm run dev
# Terminal 3: npm run dev
```

1. Open http://localhost:3000
2. Select **"Phone Call"** mode from dropdown
3. Enter your phone number (E.164 format: `+1234567890`)
4. Select "OpenAI" provider
5. Click **"Place Call"**

**Frontend Expectations**:
- [ ] Call state changes to "Dialing"
- [ ] Call state changes to "Ringing"
- [ ] Call state changes to "Connected" when you answer

**Phone Expectations**:
- [ ] Phone rings
- [ ] You answer the call
- [ ] You hear Sophia's voice greeting you
- [ ] Sophia introduces herself as calling from Jefferson Dental
- [ ] Sophia mentions Tony and Paula

**Audio Quality**:
- [ ] Sophia's voice is clear (no robotic sound)
- [ ] No echo or feedback
- [ ] Latency is acceptable (< 500ms)

**Conversation Test**:
- [ ] Sophia waits for you to respond
- [ ] Sophia understands your responses
- [ ] You can interrupt Sophia (start speaking while she's talking)
- [ ] Sophia stops and listens when interrupted

**Result**: ⬜ Pass / ⬜ Fail

**Call Duration**: _______ seconds

**Notes**: _______________________

---

## 🧪 Test 5: Gemini Provider

Repeat Test 4 but with Gemini provider.

1. Select **"Phone Call"** mode
2. Choose **"Gemini"** provider
3. Place call

**Comparison Notes**:
- Gemini response time: _______
- OpenAI response time: _______
- Preferred provider: _______

**Result**: ⬜ Pass / ⬜ Fail

---

## 🧪 Test 6: Error Handling

### Invalid Phone Number
1. Enter invalid number: `123`
2. Click "Place Call"

**Expected**: Error message shown

**Result**: ⬜ Pass / ⬜ Fail

### Call Rejection
1. Place call to your phone
2. Decline/reject the call instead of answering

**Expected**: Call state changes to "Failed" or "Ended"

**Result**: ⬜ Pass / ⬜ Fail

### Network Disconnect
1. Start a call
2. Once connected, stop ngrok
3. Observe behavior

**Expected**: Call ends gracefully, error shown

**Result**: ⬜ Pass / ⬜ Fail

---

## 🧪 Test 7: Call Controls

### Hang Up
1. Start a call
2. Click "Hang Up" button while connected

**Expected**: Call ends immediately

**Result**: ⬜ Pass / ⬜ Fail

### Duration Display
1. Start a call
2. Stay connected for 30+ seconds
3. Verify duration counter updates

**Expected**: Duration shows MM:SS format and updates in real-time

**Result**: ⬜ Pass / ⬜ Fail

---

## 📊 Backend Logs Review

Check backend console for these key log messages:

During call initiation:
```
📞 INITIATING CALL
   Call ID: call_xxx
   To: +1234567890
   AI Provider: openai
```

During connection:
```
🎙️  MEDIA STREAM CONNECTED
🌉 Starting audio bridge (Twilio ↔ openai)
✅ OpenAI session ready
✅ Call xxx fully connected with audio bridge
```

During conversation:
```
🎤 User started speaking - interrupting
📝 Gemini response: ...
```

**All expected logs present**: ⬜ Yes / ⬜ No

---

## 🐛 Common Issues

### Issue: "Cannot call this number"
**Cause**: Trial account restriction
**Fix**: Verify the number at https://console.twilio.com/us1/develop/phone-numbers/manage/verified

### Issue: No audio during call
**Cause**: Media stream not connecting
**Fix**:
1. Check ngrok is running
2. Verify BACKEND_HOST uses HTTPS
3. Check backend logs for "Media stream connected"

### Issue: Sophia doesn't respond
**Cause**: AI provider connection failed
**Fix**:
1. Verify API key is correct
2. Check backend logs for "OpenAI session ready" or "Gemini session initialized"
3. Look for error messages in logs

### Issue: High latency (> 1 second)
**Cause**: Network/server location
**Fix**:
1. Use Gemini (faster than OpenAI)
2. Deploy backend closer to Twilio servers (US East)
3. Check your internet connection

---

## ✅ Final Checklist

After completing all tests:

- [ ] Browser demo mode works
- [ ] Telephony mode works with OpenAI
- [ ] Telephony mode works with Gemini
- [ ] Audio quality is acceptable
- [ ] Latency is acceptable (< 500ms)
- [ ] Error handling works
- [ ] Call controls work (hang up, duration)
- [ ] Interruptions work correctly
- [ ] Backend logs show expected flow
- [ ] Ready for production deployment

---

## 📈 Performance Metrics

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Call connection time | < 5s | _____ | ⬜ |
| Audio latency | < 500ms | _____ | ⬜ |
| Audio quality (1-5) | 4+ | _____ | ⬜ |
| Call success rate | 95%+ | ___% | ⬜ |

---

## 🎯 Next Steps

Once all tests pass:

1. **Production Deployment**:
   - Deploy backend to Render/Railway/Heroku
   - Update `BACKEND_HOST` to production URL
   - Set environment variables in hosting platform

2. **Monitoring Setup**:
   - Set up error logging (Sentry, LogRocket)
   - Monitor Twilio dashboard for call metrics
   - Track AI API usage and costs

3. **Scaling**:
   - Add rate limiting
   - Implement call queuing for high volume
   - Set up load balancing if needed

4. **Features**:
   - Add call recording
   - Implement voicemail detection
   - Create admin dashboard for call analytics
