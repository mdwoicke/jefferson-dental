import { useState, useEffect, useRef, useCallback } from 'react';
import { CallState, VoiceProvider, CallSession } from '../shared/types';

// Simplified demo config for telephony API
interface DemoConfigLite {
  name?: string;
  businessProfile?: {
    organizationName?: string;
    phoneNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  agentConfig?: {
    agentName?: string;
    voiceName?: string;
    systemPrompt?: string;
  };
}

interface TelephonySessionConfig {
  phoneNumber: string;
  provider: VoiceProvider;
  demoConfig?: DemoConfigLite;
}

// Types for function call items
interface FunctionCallItem {
  id: string;
  type: 'function_call';
  callId: string;
  functionName: string;
  arguments: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  executionTimeMs?: number;
  errorMessage?: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
}

// Types for transcript messages (streaming)
interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  createdAt: Date;
  sequenceNumber: number;
  isPartial: boolean;
  responseId?: string;
}

interface UseTelephonySessionReturn {
  callId: string | null;
  callState: CallState;
  callDuration: number;
  error: string | null;
  conversationId: string | null;
  functionCallItems: FunctionCallItem[];
  transcriptItems: TranscriptMessage[];
  initiateCall: (config: TelephonySessionConfig) => Promise<void>;
  endCall: () => Promise<void>;
}

const BACKEND_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

export const useTelephonySession = (): UseTelephonySessionReturn => {
  const [callId, setCallId] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>(CallState.IDLE);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [functionCallItems, setFunctionCallItems] = useState<FunctionCallItem[]>([]);
  const [transcriptItems, setTranscriptItems] = useState<TranscriptMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Sequence Counter for guaranteed ordering (monotonic, never resets during session)
  const sequenceCounterRef = useRef<number>(0);
  const getNextSequence = useCallback(() => {
    sequenceCounterRef.current += 1;
    return sequenceCounterRef.current;
  }, []);

  // Track pending delta timeouts so we can cancel them when complete arrives
  const pendingDeltaTimeoutsRef = useRef<Map<string, NodeJS.Timeout[]>>(new Map());
  // Track which responses are already complete to skip late deltas
  const completedResponsesRef = useRef<Set<string>>(new Set());
  // Track the last scheduled fire time for each response (to know when all deltas are done)
  const lastDeltaFireTimeRef = useRef<Map<string, number>>(new Map());

  // Establish WebSocket connection to backend for real-time updates
  useEffect(() => {
    console.log('📡 Connecting to backend WebSocket...');

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ Connected to backend WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'callStateChanged') {
          const session: CallSession = message.data;

          console.log(`📊 Call state update: ${session.state}`);

          setCallId(session.id);
          setCallState(session.state);

          // Update conversation ID if available
          if (session.conversationId) {
            console.log(`💬 Conversation ID received: ${session.conversationId}`);
            setConversationId(session.conversationId);
          }

          // Start/stop duration timer
          if (session.state === CallState.CONNECTED) {
            startTimeRef.current = session.startTime ? new Date(session.startTime).getTime() : Date.now();
            startDurationTimer();
          } else if (session.state === CallState.ENDED || session.state === CallState.FAILED) {
            stopDurationTimer();
            if (session.duration) {
              setCallDuration(session.duration);
            }
          }

          // Handle errors
          if (session.error) {
            setError(session.error);
          }
        } else if (message.type === 'initialState') {
          console.log('📦 Received initial state from backend');
        } else if (message.type === 'functionCall') {
          // Handle function call started
          const { callId, functionName, arguments: args } = message.data;
          console.log(`🔧 Function call received: ${functionName}`, args);

          const now = new Date();
          const item: FunctionCallItem = {
            id: `func-${callId}`,
            type: 'function_call',
            callId,
            functionName,
            arguments: args,
            status: 'pending',
            timestamp: now,
            createdAt: now, // Immutable creation time
            sequenceNumber: getNextSequence() // Monotonic sequence for ordering
          };
          // Deduplicate by callId to prevent duplicates from multiple WebSocket connections
          setFunctionCallItems(prev => {
            const exists = prev.some(existing => existing.callId === callId);
            if (exists) {
              return prev; // Don't add duplicate
            }
            return [...prev, item];
          });
        } else if (message.type === 'functionResult') {
          // Handle function call result
          const { callId, functionName, result, executionTimeMs, status, errorMessage } = message.data;
          console.log(`✅ Function result received: ${functionName} (${status}) - ${executionTimeMs}ms`);

          setFunctionCallItems(prev => prev.map(item => {
            if (item.callId === callId) {
              return {
                ...item,
                result,
                timestamp: new Date(), // Update "last modified" time
                // CRITICAL: createdAt and sequenceNumber are preserved from original
                status,
                executionTimeMs,
                errorMessage
              };
            }
            return item;
          }));
        } else if (message.type === 'transcriptDelta') {
          // Handle real-time transcript streaming with pacing
          // The backend calculates delayMs based on audio timing to sync with phone playback
          const { role, delta, responseId, speechStartTime, delayMs: backendDelay } = message.data;

          // Skip if this response is already marked complete (late delta arrival)
          if (completedResponsesRef.current.has(responseId)) {
            console.log(`⚠️ Skipping delta - response ${responseId} already complete`);
            return;
          }

          // Use the backend-calculated delay which is based on:
          // - Response start time anchoring
          // - Expected word timing (based on word count and speaking rate)
          // - Twilio buffer latency
          const delayMs = backendDelay || 0;

          console.log(`🔤 Transcript delta: ${role} - "${delta}" (delay: ${delayMs}ms from backend)`);

          // Capture values for closure
          const capturedSequence = getNextSequence();
          const capturedSpeechTime = speechStartTime ? new Date(speechStartTime) : new Date();

          // Track when this delta is scheduled to fire (for complete handler timing)
          const scheduledFireTime = Date.now() + delayMs;
          const currentLastTime = lastDeltaFireTimeRef.current.get(responseId) || 0;
          if (scheduledFireTime > currentLastTime) {
            lastDeltaFireTimeRef.current.set(responseId, scheduledFireTime);
          }

          const timeoutId = setTimeout(() => {
            // NOTE: We intentionally DON'T check completedResponsesRef here!
            // Deltas scheduled before complete should still fire to maintain smooth streaming.
            // The outer check (before scheduling) handles late-arriving deltas.

            setTranscriptItems(prev => {
              // Find existing partial transcript with matching responseId
              const existingIndex = prev.findIndex(
                item => item.responseId === responseId && item.isPartial
              );

              if (existingIndex !== -1) {
                // REPLACE text entirely (delta is now cumulative from backend)
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  text: delta, // Replace, don't append
                  timestamp: new Date()
                };
                return updated;
              } else {
                // Check if a complete message with this responseId already exists
                const alreadyComplete = prev.some(
                  item => item.responseId === responseId && !item.isPartial
                );
                if (alreadyComplete) {
                  return prev;
                }

                // Create new partial transcript
                const newMessage: TranscriptMessage = {
                  id: responseId,
                  role,
                  text: delta, // This is now cumulative text
                  timestamp: new Date(),
                  createdAt: capturedSpeechTime,
                  sequenceNumber: capturedSequence,
                  isPartial: true,
                  responseId
                };
                return [...prev, newMessage];
              }
            });
          }, delayMs);

          // Track this timeout so we can cancel it when complete arrives
          const existing = pendingDeltaTimeoutsRef.current.get(responseId) || [];
          existing.push(timeoutId);
          pendingDeltaTimeoutsRef.current.set(responseId, existing);
        } else if (message.type === 'transcriptComplete') {
          // Handle transcript completion (marks message as complete)
          const { role, text, responseId, speechStartTime } = message.data;
          console.log(`📝 Transcript complete: ${role} - "${text.substring(0, 50)}..." (responseId: ${responseId})`);

          // Mark as complete to prevent NEW deltas from being scheduled
          // (but already-scheduled deltas will still fire - we removed the inner check)
          if (responseId) {
            completedResponsesRef.current.add(responseId);
          }

          // Calculate wait time based on when the last scheduled delta will fire
          // This ensures we don't mark complete until all streaming deltas have displayed
          const lastFireTime = lastDeltaFireTimeRef.current.get(responseId) || Date.now();
          const waitUntilDeltasDone = Math.max(0, lastFireTime - Date.now()) + 300; // 300ms buffer after last delta

          console.log(`⏳ Waiting ${waitUntilDeltasDone}ms for pending deltas to complete`);

          // Schedule the completion after all deltas have fired
          setTimeout(() => {
            // Clean up tracking refs
            lastDeltaFireTimeRef.current.delete(responseId);
            pendingDeltaTimeoutsRef.current.delete(responseId);

            setTranscriptItems(prev => {
              // First, try to find partial transcript by responseId (most accurate)
              let partialIndex = prev.findIndex(
                item => item.responseId === responseId && item.isPartial
              );

              // Fallback: find by role if responseId doesn't match (for user transcripts)
              if (partialIndex === -1) {
                partialIndex = prev.findIndex(
                  item => item.role === role && item.isPartial
                );
              }

              if (partialIndex !== -1) {
                // Mark as complete with final text
                const updated = [...prev];
                updated[partialIndex] = {
                  ...updated[partialIndex],
                  text, // Use complete text from backend
                  isPartial: false,
                  timestamp: new Date()
                };
                return updated;
              } else {
                // Check if we already have a complete message with this responseId (avoid duplicates)
                const alreadyExists = prev.some(
                  item => item.responseId === responseId && !item.isPartial
                );
                if (alreadyExists) {
                  console.log(`⚠️ Skipping duplicate complete transcript for responseId: ${responseId}`);
                  return prev;
                }

                // No partial found, create new complete message
                const now = new Date();
                const actualSpeechTime = speechStartTime ? new Date(speechStartTime) : now;
                const newMessage: TranscriptMessage = {
                  id: responseId || `complete-${Date.now()}`,
                  role,
                  text,
                  timestamp: now,
                  createdAt: actualSpeechTime,
                  sequenceNumber: getNextSequence(),
                  isPartial: false,
                  responseId
                };
                return [...prev, newMessage];
              }
            });
          }, waitUntilDeltasDone);
        }
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      setError('Connection to backend failed');
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket connection closed');
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      stopDurationTimer();
    };
  }, []);

  // Duration timer
  const startDurationTimer = () => {
    stopDurationTimer(); // Clear any existing timer

    durationIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setCallDuration(elapsed);
      }
    }, 100); // Update every 100ms for smooth display
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // Initiate a new call
  const initiateCall = useCallback(async (config: TelephonySessionConfig) => {
    setError(null);
    setCallDuration(0);
    setFunctionCallItems([]);
    setTranscriptItems([]); // Clear transcript items for new call
    startTimeRef.current = null;
    sequenceCounterRef.current = 0; // Reset sequence counter for new call

    // Cancel all pending delta timeouts from previous call
    pendingDeltaTimeoutsRef.current.forEach(timeouts => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    });
    pendingDeltaTimeoutsRef.current.clear();
    completedResponsesRef.current.clear();
    lastDeltaFireTimeRef.current.clear();

    try {
      console.log(`📞 Initiating call to ${config.phoneNumber} with ${config.provider}`);
      if (config.demoConfig) {
        console.log(`📝 Using demo config: ${config.demoConfig.name || 'unnamed'}`);
      }

      const response = await fetch(`${BACKEND_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: config.phoneNumber,
          provider: config.provider,
          demoConfig: config.demoConfig
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate call');
      }

      const data = await response.json();
      console.log(`✅ Call initiated: ${data.callId}`);

      setCallId(data.callId);
      setCallState(CallState.DIALING);
    } catch (err: any) {
      console.error('❌ Error initiating call:', err);
      setError(err.message || 'Failed to initiate call');
      setCallState(CallState.FAILED);
    }
  }, []);

  // End the current call
  const endCall = useCallback(async () => {
    if (!callId) {
      console.warn('⚠️  No active call to end');
      return;
    }

    try {
      console.log(`🔚 Ending call ${callId}`);

      const response = await fetch(`${BACKEND_URL}/api/calls/${callId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end call');
      }

      console.log(`✅ Call ${callId} ended`);

      stopDurationTimer();
      setCallState(CallState.ENDED);
    } catch (err: any) {
      console.error('❌ Error ending call:', err);
      setError(err.message || 'Failed to end call');
    }
  }, [callId]);

  return {
    callId,
    callState,
    callDuration,
    error,
    conversationId,
    functionCallItems,
    transcriptItems,
    initiateCall,
    endCall
  };
};
