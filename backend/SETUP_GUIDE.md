# Twilio Setup Guide

## Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free trial account
3. Verify your email and phone number
4. You'll receive **$15 in free credit** (enough for ~1,000 minutes of testing)

## Step 2: Get Your Credentials

After logging in to the Twilio Console:

### Account SID and Auth Token

1. Go to https://console.twilio.com/
2. On the dashboard, you'll see:
   - **Account SID**: Starts with "AC..." (copy this)
   - **Auth Token**: Click "Show" to reveal (copy this)

### Get a Phone Number

1. Click **"Get a Trial Number"** button on the dashboard
2. Twilio will assign you a free US phone number (e.g., +1234567890)
3. Copy this number

## Step 3: Configure Backend Environment

Create `backend/.env` file with these credentials:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC________________________________  # Your Account SID
TWILIO_AUTH_TOKEN=________________________________    # Your Auth Token
TWILIO_PHONE_NUMBER=+1234567890                      # Your Twilio number

# AI Provider Keys
OPENAI_API_KEY=sk-proj-_____________________________ # Your OpenAI key
GEMINI_API_KEY=_____________________________________  # Your Gemini key (optional)

# Server Configuration
BACKEND_PORT=3001
BACKEND_HOST=http://localhost:3001  # Change this after setting up ngrok
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Step 4: Set Up ngrok (For Local Testing)

Twilio needs to send webhooks to your backend, which requires a public URL.

### Install ngrok

**Option A: Download**
1. Go to https://ngrok.com/download
2. Download and extract
3. Run: `./ngrok http 3001`

**Option B: npm**
```bash
npm install -g ngrok
ngrok http 3001
```

### Configure ngrok URL

1. Start ngrok: `ngrok http 3001`
2. You'll see output like:
   ```
   Forwarding https://abc123.ngrok.io -> http://localhost:3001
   ```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update `backend/.env`:
   ```env
   BACKEND_HOST=https://abc123.ngrok.io
   ```

**Important**: Every time you restart ngrok, you get a new URL. Update `backend/.env` each time!

## Step 5: Test Your Setup

### Start Everything

```bash
# Terminal 1: ngrok
ngrok http 3001

# Terminal 2: Backend (update .env with ngrok URL first!)
cd backend
npm run dev

# Terminal 3: Frontend
npm run dev
```

### Make a Test Call

1. Open http://localhost:3000
2. Select **"Phone Call"** mode
3. Enter your verified phone number (during trial, you can only call verified numbers)
4. Click **"Place Call"**
5. Answer your phone!

## Troubleshooting

### "Cannot call this number" Error

**Problem**: Twilio trial accounts can only call verified phone numbers.

**Solution**:
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click "Add a new number"
3. Verify the phone number you want to call

### Webhook Errors

**Problem**: Twilio can't reach your backend.

**Solution**:
1. Ensure ngrok is running
2. Verify `BACKEND_HOST` in `.env` matches ngrok URL exactly
3. Check ngrok web interface at http://127.0.0.1:4040 for incoming requests

### No Audio During Call

**Problem**: Media stream not connecting.

**Solution**:
1. Check backend logs for "Media stream connected"
2. Verify AI provider key is valid
3. Ensure `BACKEND_HOST` uses HTTPS (not HTTP)

### Call Connects But No Voice

**Problem**: AI provider not connected.

**Solution**:
1. Check backend logs for "OpenAI session ready" or "Gemini session initialized"
2. Verify API key is correct
3. Check for errors in backend console

## Production Deployment

For production (skip ngrok), deploy backend to:
- **Render.com** (recommended, free tier available)
- **Railway.app**
- **Heroku**
- **AWS EC2**

Then update `BACKEND_HOST` to your production URL.

## Cost Breakdown

### Twilio Trial
- **Free credit**: $15
- **Per minute (US outbound)**: ~$0.013/min
- **Trial duration**: Unlimited until credit runs out

### After Trial
- **Phone number**: $1/month
- **Per minute (US outbound)**: $0.013/min
- **Per minute (US inbound)**: $0.0085/min

### AI Costs
- **OpenAI Realtime**: ~$0.30/min
- **Gemini**: ~$0.10/min (estimated)

**Total cost per minute**: $0.32 (OpenAI) or $0.12 (Gemini)

## Next Steps

Once you have successful calls working:
1. Test with OpenAI provider
2. Test with Gemini provider
3. Try interrupting Sophia while she's speaking
4. Test call quality and latency
5. Review backend logs to understand the flow
