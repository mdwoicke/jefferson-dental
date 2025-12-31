<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Jefferson Dental Clinics - AI Voice Agent Demo

This is a real-time voice AI application that simulates outbound calls for dental appointment scheduling.

## Features

- **Multiple AI Providers**: Switch between OpenAI Realtime API and Google Gemini Live API
- **Real-time Voice Interaction**: Native audio streaming with low latency
- **Visual Audio Feedback**: Canvas-based visualization of voice activity
- **Natural Conversations**: Server-side voice activity detection and interruption handling

## Run Locally

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Keys** in [.env.local](.env.local):
   ```env
   # For OpenAI (default)
   OPENAI_API_KEY=your_openai_api_key_here

   # For Gemini (optional)
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

5. **Select provider** and click "Simulate Outbound Call"

## Supported Providers

- **OpenAI Realtime API** (Default) - GPT-4o with native audio
- **Google Gemini Live API** - Gemini 2.5 Flash with native audio

View original AI Studio version: https://ai.studio/apps/drive/1p1txAdrGvMytu9ZBh-M0vaWE8nmKIPIx
