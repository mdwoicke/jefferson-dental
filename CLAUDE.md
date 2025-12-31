# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Jefferson Dental Clinics Outbound AI Voice Agent** demo application built with React 19, TypeScript, and Vite. The application simulates an outbound call from an AI agent named "Sophia" who contacts parents about scheduling Medicaid dental appointments for their children.

The application supports **multiple voice AI providers** through a provider abstraction layer:
- **OpenAI Realtime API** (GPT-4o with native audio) - Default
- **Google Gemini Live API** (Gemini 2.5 Flash with native audio)

Users can select their preferred provider via a dropdown in the UI.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

Before running the app, set the API keys for your desired provider(s) in `.env.local`:

```
# For OpenAI Realtime API
OPENAI_API_KEY=your_openai_api_key_here

# For Google Gemini Live API
GEMINI_API_KEY=your_gemini_api_key_here
```

You only need to set the API key for the provider you plan to use. The Vite config injects these as environment variables accessible via `process.env.OPENAI_API_KEY` and `process.env.API_KEY` (Gemini).

## Architecture

### Core Technologies
- **React 19.2** with TypeScript
- **Vite 6.2** for build tooling and dev server
- **Voice AI Providers** (selectable):
  - **OpenAI Realtime API** - GPT-4o Realtime with native audio (24kHz input/output)
  - **Google Gemini AI** (`@google/genai` v1.30+) - Gemini 2.5 Flash (16kHz input, 24kHz output)
- **Web Audio API** for real-time audio processing
- **Tailwind CSS** (via CDN) for styling
- **Provider Abstraction Layer** - Unified interface for multiple voice AI services

### Application Flow

1. **Provider Selection**:
   - User selects voice provider (OpenAI or Gemini) from dropdown in UI
   - Selection is stored in React state and passed to `useLiveSession` hook

2. **Connection Initialization** (`useLiveSession.ts:111-261`):
   - User clicks "Simulate Outbound Call" button
   - Starts office ambience background audio (must happen on user gesture for autoplay policy)
   - Creates two AudioContext instances with provider-specific sample rates:
     - OpenAI: 24kHz input/output
     - Gemini: 16kHz input, 24kHz output
   - Requests microphone access via `getUserMedia`
   - Instantiates the selected provider via factory pattern
   - Connects to the provider's API with configured prompt and voice

3. **Audio Pipeline**:
   - **Input**: Microphone → MediaStreamSource → ScriptProcessor (4096 buffer) → PCM conversion → Provider API
   - **Output**: Provider API (audio data) → decode to AudioBuffer → BufferSource → GainNode → speakers
   - Uses `ScriptProcessorNode` for input processing (legacy but necessary for this use case)
   - Implements queuing system (`nextStartTimeRef`) to prevent audio overlap
   - Provider-agnostic: same pipeline works for both OpenAI and Gemini

4. **Conversation Trigger**:
   - After session opens, provider sends initial "Hello" text trigger
   - OpenAI: Sent as conversation item + response.create
   - Gemini: Sent as clientContent turn after 500ms
   - This prompts the AI to begin the outbound call script
   - AI responds with audio using the configured voice (OpenAI: alloy, Gemini: Zephyr)

5. **State Management**:
   - `useLiveSession` custom hook manages provider instance, audio contexts, and UI state
   - Mute state tracked via both React state and ref to avoid closure issues in audio callbacks
   - Volume levels calculated from RMS of audio buffers for visualization

6. **Visualization** (`Visualizer.tsx`):
   - Canvas-based real-time audio visualization
   - Input (user voice) shown as outer green ring
   - Output (AI voice) shown as inner blue orb with dynamic waves
   - Uses requestAnimationFrame for smooth 60fps rendering

### Provider Architecture

The application uses a **provider abstraction layer** to support multiple voice AI services:

**Core Interfaces** (`types.ts`):
- `IVoiceProvider` - Common interface all providers must implement
- `ProviderMessage` - Normalized message format (audio or interrupt)
- `VoiceProviderCallbacks` - Event handlers for session lifecycle

**Provider Implementations**:
- `providers/openai-provider.ts` - OpenAI Realtime API via WebSocket
  - URL: `wss://api.openai.com/v1/realtime`
  - Protocol: WebSocket with custom headers for API key
  - Events: session.update, response.audio.delta, input_audio_buffer.speech_started, etc.
  - Voice options: alloy, echo, fable, onyx, nova, shimmer

- `providers/gemini-provider.ts` - Google Gemini Live API via `@google/genai` SDK
  - Uses SDK's `ai.live.connect()` method
  - Events: onopen, onmessage, onclose, onerror callbacks
  - Voice options: Zephyr, etc.

**Factory Pattern** (`providers/provider-factory.ts`):
- `createVoiceProvider(provider)` - Instantiates the correct provider class

### Key Files

- `App.tsx` - Main UI component with provider selection, connection states, and controls
- `hooks/useLiveSession.ts` - Provider-agnostic session management, audio routing, unified callbacks
- `providers/openai-provider.ts` - OpenAI Realtime API WebSocket implementation
- `providers/gemini-provider.ts` - Google Gemini Live API wrapper
- `providers/provider-factory.ts` - Factory for creating provider instances
- `components/Visualizer.tsx` - Canvas-based audio level visualization
- `utils/audio-utils.ts` - Audio encoding/decoding utilities (PCM, base64, buffers)
- `constants.ts` - Model names, voice names, and the complete outbound call prompt/script
- `types.ts` - TypeScript interfaces for providers, configuration, and state
- `vite.config.ts` - Build configuration with environment variable injection for both API keys

### AI Agent Configuration

The AI agent "Sophia" is configured via a detailed system instruction in `constants.ts`:

- **Role**: Outbound call agent for Jefferson Dental Clinics
- **Voice**: Zephyr (warm, helpful tone)
- **Scenario**: Calling parents whose children (Tony and Paula) were assigned to the clinic via Medicaid
- **Script**: Structured conversation flow with opening, skepticism handling, data gathering, scheduling, and edge cases
- **Key behaviors**:
  - Addresses common concerns (cost, legitimacy)
  - Handles multi-child scheduling logic
  - No sensitive data collection (no SSN, no credit cards)

## Important Implementation Details

### Audio Context Sample Rates
Sample rates are provider-specific and configured in `useLiveSession.ts:129-130`:
- **OpenAI**: 24kHz for both input and output (OpenAI handles resampling internally)
- **Gemini**: 16kHz input, 24kHz output (strict requirements)
- DO NOT change these rates without updating the corresponding provider's API requirements

### Mute Implementation
The mute feature uses both state and ref (`isMutedRef`) because:
- The audio processor callback is set once and captures initial state
- Using a ref allows the callback to check current mute status without recreating the processor
- React state updates the UI while ref updates behavior

### Background Audio Timing
`playOfficeAmbience()` is called FIRST in the connect flow (line 116), before any async operations. This is critical because:
- Browser autoplay policies require audio to start from a user gesture
- If delayed until after API connection, the play() call may be blocked

### Interruption Handling
When the user speaks during AI output (`message.serverContent?.interrupted`):
- All queued audio sources are stopped and cleared
- `nextStartTimeRef` is reset to prevent audio desync
- Allows natural conversation flow without talking over each other

### Path Aliases
TypeScript is configured with `@/*` pointing to the project root, though this is not heavily used in the current codebase.

### Adding a New Voice Provider

To add support for a new voice AI provider:

1. **Create Provider Class** (`providers/new-provider.ts`):
   - Implement the `IVoiceProvider` interface
   - Handle connection, audio streaming, and disconnection
   - Normalize provider-specific messages to `ProviderMessage` format
   - Convert audio to/from provider's expected format

2. **Update Types** (`types.ts`):
   - Add new provider to `VoiceProvider` union type: `'openai' | 'gemini' | 'newprovider'`

3. **Update Factory** (`providers/provider-factory.ts`):
   - Add case for new provider in `createVoiceProvider()` switch statement

4. **Update Constants** (`constants.ts`):
   - Add model name constant (e.g., `NEW_PROVIDER_MODEL`)
   - Add voice name constant (e.g., `NEW_PROVIDER_VOICE`)

5. **Update Vite Config** (`vite.config.ts`):
   - Add environment variable mapping for API key

6. **Update Environment** (`.env.local`):
   - Add new API key variable

7. **Update UI** (`App.tsx`):
   - Add option to provider dropdown

## Development Tips

- The app runs on port 3000 by default (configured in vite.config.ts)
- Hot module replacement is enabled via Vite
- React 19 uses the new `react-jsx` transform (no need to import React in components)
- Tailwind is loaded via CDN in index.html for rapid prototyping
- The Gemini model uses `gemini-2.5-flash-native-audio-preview-09-2025` for low-latency audio streaming

## Testing the Application

1. Ensure microphone permissions are granted
2. Click "Simulate Outbound Call"
3. The AI will greet you as if calling outbound about scheduling dental appointments
4. Respond naturally to test conversation flow
5. Use the mute button to test audio gating
6. Click "End Simulation" to disconnect and reset state

## Common Issues

- **No audio output**: Check browser console for AudioContext errors; some browsers require user interaction before creating audio contexts
- **Microphone not working**: Verify HTTPS connection (required for getUserMedia) or localhost
- **API connection fails**: Verify GEMINI_API_KEY is set correctly in .env.local
- **Background noise not playing**: Likely blocked by autoplay policy; ensure audio.play() happens synchronously in user gesture handler
