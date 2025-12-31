# Telephony Transcript Streaming Fix

## Problem Statement

The telephony transcript was not streaming word-by-word in sync with the AI speaking over the phone. Instead, users observed:
1. Initial words appeared correctly
2. Then a pause occurred
3. Then all remaining text appeared at once

This created a jarring user experience where the transcript jumped ahead of the audio.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   OpenAI API    │────▶│  Backend Node   │────▶│  Frontend React │
│  (Realtime API) │     │   (WebSocket)   │     │ (useTelephony)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ Generates audio       │ Forwards events       │ Displays
        │ faster than           │ with calculated       │ transcript
        │ real-time             │ delays                │ with timing
        └───────────────────────┴───────────────────────┘
```

**Key Insight:** OpenAI generates audio faster than real-time (e.g., 10 seconds of audio in ~2 seconds). The backend calculates delays to pace the transcript to match actual phone playback via Twilio.

## Files Involved

| File | Purpose |
|------|---------|
| `backend/src/ai/openai-client.ts` | Receives OpenAI events, calculates delays, emits to frontend |
| `backend/src/call-manager.ts` | Forwards transcript events via WebSocket |
| `hooks/useTelephonySession.ts` | Receives events, schedules timeouts, updates React state |

## Root Cause Analysis

### The Bug

In `useTelephonySession.ts`, the delta timeout callback had a check that blocked execution:

```typescript
const timeoutId = setTimeout(() => {
  // THIS CHECK WAS THE BUG:
  if (completedResponsesRef.current.has(responseId)) {
    return;  // Scheduled deltas were being skipped!
  }
  setTranscriptItems(prev => { ... });
}, delayMs);
```

### What Happened

1. **T=0ms**: Delta 1 arrives, scheduled to fire at T=800ms
2. **T=100ms**: Delta 2 arrives, scheduled to fire at T=1100ms
3. **T=200ms**: Delta 3 arrives, scheduled to fire at T=1400ms
4. **T=500ms**: `transcriptComplete` arrives
   - Immediately adds responseId to `completedResponsesRef` ❌
5. **T=800ms**: Delta 1 timeout fires, checks completedRef → **BLOCKED** ❌
6. **T=1100ms**: Delta 2 timeout fires, checks completedRef → **BLOCKED** ❌
7. **T=1400ms**: Delta 3 timeout fires, checks completedRef → **BLOCKED** ❌
8. **T=2000ms**: Complete handler's timeout fires → Shows all text at once

### Why It Looked Like "Pause Then Jump"

- Early deltas with short/zero delays fired before complete arrived ✓
- Later deltas with longer delays were blocked when they tried to fire ✗
- Complete handler eventually showed all text at once

## The Solution

### Change 1: Track Last Scheduled Delta Time

Added a ref to track when the last delta for each response is scheduled to fire:

```typescript
// Track the last scheduled fire time for each response
const lastDeltaFireTimeRef = useRef<Map<string, number>>(new Map());
```

### Change 2: Record Scheduled Fire Time in Delta Handler

```typescript
// Track when this delta is scheduled to fire
const scheduledFireTime = Date.now() + delayMs;
const currentLastTime = lastDeltaFireTimeRef.current.get(responseId) || 0;
if (scheduledFireTime > currentLastTime) {
  lastDeltaFireTimeRef.current.set(responseId, scheduledFireTime);
}
```

### Change 3: Remove Inner Check in Delta Callback

```typescript
const timeoutId = setTimeout(() => {
  // NOTE: We intentionally DON'T check completedResponsesRef here!
  // Deltas scheduled before complete should still fire.
  // The outer check (before scheduling) handles late-arriving deltas.

  setTranscriptItems(prev => { ... });
}, delayMs);
```

### Change 4: Complete Handler Waits for Deltas

```typescript
// Calculate wait time based on when the last scheduled delta will fire
const lastFireTime = lastDeltaFireTimeRef.current.get(responseId) || Date.now();
const waitUntilDeltasDone = Math.max(0, lastFireTime - Date.now()) + 300;

console.log(`⏳ Waiting ${waitUntilDeltasDone}ms for pending deltas to complete`);

setTimeout(() => {
  // Clean up tracking refs
  lastDeltaFireTimeRef.current.delete(responseId);
  pendingDeltaTimeoutsRef.current.delete(responseId);

  // Now mark as complete with final text
  setTranscriptItems(prev => { ... });
}, waitUntilDeltasDone);
```

## Backend: Cumulative Text Approach

The backend sends **cumulative text** with each delta instead of just the new words:

```typescript
// In openai-client.ts
currentBuffer.text += message.delta;

// Emit the CUMULATIVE text (not just the delta)
this.callbacks.onTranscriptDelta(
  'assistant',
  currentBuffer.text,  // Full text so far, not just delta
  responseId,
  message.item_id,
  speechStartTime,
  delayMs
);
```

The frontend **replaces** the partial text entirely instead of appending:

```typescript
updated[existingIndex] = {
  ...updated[existingIndex],
  text: delta,  // Replace, don't append (delta is cumulative)
  timestamp: new Date()
};
```

This prevents race conditions where multiple setTimeout callbacks might read stale state.

## Timing Calculation

The backend calculates delay based on delta position:

```typescript
const deltaCount = (this.wordCountPerResponse.get(responseId) || 0) + 1;
this.wordCountPerResponse.set(responseId, deltaCount);

const msPerDelta = 300;
const initialBufferMs = 800;  // Twilio buffer latency

const targetTimeMs = (deltaCount * msPerDelta) + initialBufferMs;
const delayMs = Math.max(0, targetTimeMs - elapsedMs);
```

- **300ms per delta**: Approximate speaking rate
- **800ms initial buffer**: Account for Twilio's audio buffering

## Key Learnings

1. **Don't block scheduled work**: Checks inside setTimeout callbacks can cause race conditions when state changes between scheduling and execution.

2. **Track timing explicitly**: When coordinating multiple async operations, track when each is expected to complete.

3. **Cumulative vs Delta**: Sending cumulative text avoids race conditions in distributed state updates.

4. **Outer vs Inner checks**: Use outer checks to prevent scheduling new work; don't use inner checks to cancel already-scheduled work.

## Testing

To verify the fix:
1. Make a telephony call
2. Watch the transcript panel
3. Words should appear smoothly as the AI speaks
4. No "pause then jump" behavior
5. Complete message appears after all words have streamed

## Related Files

- `hooks/useTelephonySession.ts` - Main fix location
- `backend/src/ai/openai-client.ts` - Backend timing calculation
- `backend/src/call-manager.ts` - WebSocket event forwarding
- `components/TelephonyMode.tsx` - UI display
