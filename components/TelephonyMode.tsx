import React, { useState, useEffect, useMemo } from 'react';
import { useTelephonySession } from '../hooks/useTelephonySession';
import { VoiceProvider, CallState } from '../shared/types';
import { TranscriptPanel } from './TranscriptPanel';
import { AppointmentSummaryCard } from './AppointmentSummaryCard';
import { ThemeToggle } from './ThemeToggle';
import IPhoneCallScreen from './IPhoneCallScreen';
import { useTheme } from '../contexts/ThemeContext';
import { extractSuccessfulBookings, extractSMSConfirmationRequest } from '../utils/appointment-utils';

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
  isPartial: boolean;
  responseId?: string;
  itemId?: string;
}

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

export type TranscriptItem = TranscriptMessage | FunctionCallItem;

interface TelephonyModeProps {
  provider: VoiceProvider;
  onProviderChange: (provider: VoiceProvider) => void;
}

// Modern Icon Components (matching App.tsx)
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

const PhoneXMarkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

const PhoneArrowDownLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M19.5 9.75a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v2.69l4.72-4.72a.75.75 0 111.06 1.06L16.06 9h2.69a.75.75 0 01.75.75z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z" clipRule="evenodd" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const ArrowPathIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
  </svg>
);

export const TelephonyMode: React.FC<TelephonyModeProps> = ({ provider, onProviderChange }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);

  // SMS Notification state
  const [smsMessage, setSmsMessage] = useState<string>('');
  const [smsVisible, setSmsVisible] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  // API-fetched function calls (in addition to WebSocket ones)
  const [apiFunctionCallItems, setApiFunctionCallItems] = useState<FunctionCallItem[]>([]);

  const { callId, callState, callDuration, error, conversationId, functionCallItems, transcriptItems, initiateCall, endCall } = useTelephonySession();

  // BULLETPROOF ORDERING: Merge and sort by createdAt timestamp (primary) and sequenceNumber (secondary)
  // This ensures transcript items always appear in chronological order based on when they occurred,
  // NOT when the WebSocket messages arrived (which can be out of order due to network timing)
  const mergedItems: TranscriptItem[] = useMemo(() => {
    // Combine WebSocket and API function calls, deduplicating by callId
    const allFunctionCalls: FunctionCallItem[] = [...functionCallItems];
    apiFunctionCallItems.forEach(apiItem => {
      const exists = allFunctionCalls.some(item => item.callId === apiItem.callId);
      if (!exists) {
        allFunctionCalls.push(apiItem);
      } else {
        // Update existing item if API has result and WebSocket doesn't
        const index = allFunctionCalls.findIndex(item => item.callId === apiItem.callId);
        if (apiItem.result && !allFunctionCalls[index].result) {
          allFunctionCalls[index] = { ...allFunctionCalls[index], ...apiItem };
        }
      }
    });

    // Merge streamed transcripts (real-time via WebSocket) with polled transcripts (from API)
    // Prefer streamed transcripts during active call, fall back to polled for history
    const allTranscripts: TranscriptMessage[] = [];

    // Add streamed transcripts first (these are real-time)
    transcriptItems.forEach(streamedItem => {
      allTranscripts.push(streamedItem);
    });

    // Add polled transcripts that aren't already in streamed (by comparing text content)
    transcripts.forEach(polledItem => {
      // Check if this polled item is already represented in streamed items
      const alreadyStreamed = allTranscripts.some(streamedItem =>
        streamedItem.role === polledItem.role &&
        (streamedItem.text === polledItem.text ||
         polledItem.text.startsWith(streamedItem.text) ||
         streamedItem.text.startsWith(polledItem.text))
      );
      if (!alreadyStreamed) {
        allTranscripts.push(polledItem);
      }
    });

    const items: TranscriptItem[] = [...allTranscripts, ...allFunctionCalls];
    return items.sort((a, b) => {
      // Primary: Sort by creation timestamp (actual event time)
      const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      // Secondary: Sort by sequence number (tiebreaker for simultaneous events)
      return a.sequenceNumber - b.sequenceNumber;
    });
  }, [transcripts, transcriptItems, functionCallItems, apiFunctionCallItems]);

  // Extract successful appointment bookings
  const successfulBookings = useMemo(() => {
    console.log('🔍 TelephonyMode - functionCallItems:', functionCallItems.length, functionCallItems);
    console.log('🔍 TelephonyMode - mergedItems:', mergedItems.length, mergedItems);
    const bookings = extractSuccessfulBookings(mergedItems);
    console.log('🔍 TelephonyMode - successfulBookings:', bookings.length, bookings);
    return bookings;
  }, [mergedItems, functionCallItems]);

  // Fetch transcripts AND function calls when conversation ID is available
  useEffect(() => {
    if (conversationId && (callState === CallState.CONNECTED || callState === CallState.ENDED)) {
      const fetchData = async () => {
        try {
          // Fetch transcripts (text messages)
          const transcriptsResponse = await fetch(`http://localhost:3001/api/conversations/${conversationId}`);
          if (transcriptsResponse.ok) {
            const data = await transcriptsResponse.json();
            const messages: TranscriptMessage[] = data.turns.map((turn: any, index: number) => ({
              id: `msg-${turn.conversation_id}-${turn.turn_number}`,
              role: turn.role === 'user' ? 'user' : 'assistant',
              text: turn.content_text || '',
              timestamp: new Date(turn.timestamp),
              createdAt: new Date(turn.timestamp), // Use server timestamp for ordering
              sequenceNumber: turn.turn_number || index, // Use turn_number from database
              isPartial: false
            }));
            setTranscripts(messages);
          }

          // Fetch function calls from database (in addition to WebSocket)
          const functionCallsResponse = await fetch(`http://localhost:3001/api/db/conversations/${conversationId}/function-calls`);
          if (functionCallsResponse.ok) {
            const fcData = await functionCallsResponse.json();
            console.log('📞 Fetched function calls from API:', fcData.functionCalls?.length || 0, 'calls');
            console.log('📞 Function calls detail:', fcData.functionCalls);

            // Map database function calls to FunctionCallItem format
            if (fcData.functionCalls && fcData.functionCalls.length > 0) {
              const apiItems: FunctionCallItem[] = fcData.functionCalls.map((fc: any, index: number) => ({
                id: `func-${fc.call_id || fc.id}`,
                type: 'function_call' as const,
                callId: fc.call_id || `db-${fc.id}`,
                functionName: fc.function_name,
                arguments: fc.arguments_json ? JSON.parse(fc.arguments_json) : fc.arguments,
                result: fc.result_json ? JSON.parse(fc.result_json) : fc.result,
                status: fc.status as 'pending' | 'success' | 'error',
                executionTimeMs: fc.execution_time_ms,
                errorMessage: fc.error_message,
                timestamp: new Date(fc.timestamp || fc.updated_at),
                createdAt: new Date(fc.created_at || fc.timestamp),
                sequenceNumber: fc.sequence_number || index
              }));
              console.log('📞 Mapped API function call items:', apiItems);

              // Store API-fetched function calls (will be merged in mergedItems useMemo)
              setApiFunctionCallItems(apiItems);
            }
          }
        } catch (err) {
          console.error('Error fetching data:', err);
        }
      };

      // Fetch immediately and then poll every 2 seconds during active call
      fetchData();
      if (callState === CallState.CONNECTED) {
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
      }
    }
  }, [conversationId, callState]);

  // Show SMS notification only when user explicitly requests it
  useEffect(() => {
    const smsRequest = extractSMSConfirmationRequest(mergedItems);

    if (smsRequest) {
      // Check if this is a new SMS request (different timestamp)
      const requestTime = smsRequest.timestamp.getTime();
      const lastRequestTime = lastBookingId ? parseInt(lastBookingId) : 0;

      if (requestTime !== lastRequestTime) {
        console.log('📱 SMS CONFIRMATION REQUESTED - Showing SMS notification');
        setLastBookingId(requestTime.toString());

        // Use the appointment_details directly from the SMS request
        const formattedMessage = `Jefferson Dental Confirmed\n\n${smsRequest.appointmentDetails}\n\nLocation:\n123 Main St, Austin\n\nWhat to bring:\n• Medicaid cards for each child\n• Photo ID for parent\n\nQuestions? Call 512-555-0100`;

        setSmsMessage(formattedMessage);
        setSmsVisible(true);
      }
    }
  }, [mergedItems, lastBookingId]);

  // Handle SMS dismissal
  const handleSMSDismiss = () => {
    console.log('📱 SMS notification dismissed');
    setSmsVisible(false);
  };

  const handleCall = async () => {
    // Validate phone number
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    // Basic E.164 format validation
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      alert('Invalid phone number format. Please use E.164 format (e.g., +1234567890)');
      return;
    }

    // Clear previous transcripts when starting a new call
    setTranscripts([]);

    await initiateCall({ phoneNumber, provider });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits except leading +
    const hasPlus = value.startsWith('+');
    const digits = value.replace(/\D/g, '');

    if (hasPlus) {
      return '+' + digits;
    }
    return digits;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getStateDisplay = () => {
    switch (callState) {
      case CallState.IDLE:
        return null;
      case CallState.DIALING:
        return {
          icon: '📞',
          text: `Dialing ${phoneNumber}...`,
          color: 'text-blue-600'
        };
      case CallState.RINGING:
        return {
          icon: '📱',
          text: 'Ringing...',
          color: 'text-yellow-600'
        };
      case CallState.CONNECTED:
        return {
          icon: '✅',
          text: `Connected - Call in progress`,
          color: 'text-green-600'
        };
      case CallState.ENDED:
        return {
          icon: '🔚',
          text: 'Call ended',
          color: 'text-gray-600'
        };
      case CallState.FAILED:
        return {
          icon: '❌',
          text: 'Call failed',
          color: 'text-red-600'
        };
      default:
        return null;
    }
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 overflow-hidden selection:bg-blue-100 dark:selection:bg-blue-900/40">

      {/* --- Ambient Background Animations (matching browser demo) --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-200/40 dark:bg-blue-500/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[800px] bg-indigo-200/40 dark:bg-indigo-500/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-5 brightness-100 contrast-150"></div>
      </div>

      {/* --- Floating Header --- */}
      <header className="fixed top-6 left-0 right-0 z-50 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center gap-2.5 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 text-white p-1.5 rounded-lg shadow-lg shadow-blue-500/30">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight text-sm">Jefferson Dental Clinics</span>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">(Phone)</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-300 border ${
            callState === CallState.CONNECTED
              ? 'bg-emerald-500/10 dark:bg-blue-500/20 text-emerald-700 dark:text-blue-300 border-emerald-500/20 dark:border-blue-500/40'
              : callState === CallState.DIALING || callState === CallState.RINGING
              ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30'
              : 'bg-white/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-200 border-white/40 dark:border-slate-700/70'
          }`}>
            <span className={`relative flex h-2.5 w-2.5`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                callState === CallState.CONNECTED ? 'bg-emerald-500 dark:bg-blue-400' :
                callState === CallState.DIALING || callState === CallState.RINGING ? 'bg-amber-500' :
                'bg-slate-400 hidden'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                callState === CallState.CONNECTED ? 'bg-emerald-500 dark:bg-blue-400' :
                callState === CallState.DIALING || callState === CallState.RINGING ? 'bg-amber-500' :
                'bg-slate-400'
              }`}></span>
            </span>
            {callState === CallState.CONNECTED ? 'LIVE CALL ACTIVE' :
             callState === CallState.DIALING ? 'DIALING' :
             callState === CallState.RINGING ? 'RINGING' :
             'PHONE MODE'}
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <div className={`grid gap-12 max-w-[1800px] mx-auto items-start w-full ${
          (callState === CallState.CONNECTED || callState === CallState.ENDED)
            ? 'grid-cols-[342px_1fr_auto]'
            : 'grid-cols-[342px_1fr_450px]'
        }`}>

          {/* Column 1: Main Control Card OR iPhone - Fixed Width */}
          {(() => {
            console.log('🔍 TelephonyMode render - callState:', callState, 'CONNECTED:', CallState.CONNECTED, 'ENDED:', CallState.ENDED);
            // Show iPhone during CONNECTED and ENDED states
            return (callState === CallState.CONNECTED || callState === CallState.ENDED) ? (
              /* iPhone View - Stays visible during and after call */
              <div className="flex flex-col items-center justify-start pt-20">
                <IPhoneCallScreen
                inputVolume={0}
                outputVolume={0}
                isActive={callState === CallState.CONNECTED}
                isConnected={callState === CallState.CONNECTED}
                isMuted={false}
                callDuration={callDuration}
                contactName="Sophia"
                hasCallEnded={callState === CallState.ENDED}
                smsMessage={smsMessage}
                smsVisible={smsVisible}
                onSMSDismiss={handleSMSDismiss}
                onEndCall={endCall}
                onMute={() => {}}
                onStartNewCall={() => window.location.reload()}
              />
            </div>
          ) : (
            /* Card View - All other states */
            <div className="flex flex-col items-center justify-start pt-20">
            <div className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-8 fade-enter-active">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
                  <PhoneArrowDownLeftIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
                  Outbound Calls
                </h1>
                <p className="text-slate-600 dark:text-slate-300 font-light">
                  Place real phone calls with AI agent Sophia
                </p>
              </div>

            {/* Call State Display */}
            {stateDisplay && (
              <div className={`mb-6 p-5 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
                callState === CallState.DIALING || callState === CallState.RINGING
                  ? 'bg-amber-50/80 dark:bg-amber-900/30 border-2 border-amber-200/50 dark:border-amber-700/50'
                  : callState === CallState.ENDED
                  ? 'bg-slate-50/80 dark:bg-slate-900/30 border-2 border-slate-200/50 dark:border-slate-700/50'
                  : 'bg-red-50/80 dark:bg-red-900/30 border-2 border-red-200/50 dark:border-red-700/50'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  {(callState === CallState.DIALING || callState === CallState.RINGING) && <PhoneIcon className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-pulse" />}
                  {callState === CallState.FAILED && <AlertCircleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />}
                  <span className={`text-lg font-bold tracking-tight ${
                    callState === CallState.DIALING || callState === CallState.RINGING ? 'text-amber-700 dark:text-amber-300' :
                    callState === CallState.ENDED ? 'text-slate-700 dark:text-slate-300' :
                    'text-red-700 dark:text-red-300'
                  }`}>
                    {stateDisplay.text}
                  </span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-5 rounded-2xl bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm border-2 border-red-200/50 dark:border-red-700/50 transition-all">
                <div className="flex items-start gap-3">
                  <AlertCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Call ID Display (for debugging) */}
            {callId && (
              <div className="mb-6 text-xs text-slate-400 dark:text-slate-500 text-center font-mono bg-slate-50/50 dark:bg-slate-900/50 py-2 px-4 rounded-lg">
                Call ID: {callId}
              </div>
            )}

            {/* Idle State - Phone Number Input */}
            {callState === CallState.IDLE && (
              <div className="space-y-6">
                {/* Phone Number Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 tracking-tight">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-transparent text-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-300 font-medium">
                    Enter number in E.164 format (e.g., +1234567890)
                  </p>
                </div>

                {/* AI Provider Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 tracking-tight">
                    AI Voice Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => onProviderChange(e.target.value as VoiceProvider)}
                    className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-transparent text-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="openai">OpenAI (Sophia - Alloy)</option>
                    <option value="gemini">Gemini (Sophia - Zephyr)</option>
                  </select>
                </div>

                {/* Place Call Button */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <button
                    onClick={handleCall}
                    className="relative w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-xl hover:shadow-2xl hover:translate-y-[-2px] active:translate-y-0 active:scale-95"
                  >
                    <PhoneIcon className="w-6 h-6" />
                    <span>Place Outbound Call</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dialing / Ringing State */}
            {(callState === CallState.DIALING || callState === CallState.RINGING) && (
              <div className="space-y-8">
                <div className="flex justify-center py-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 dark:bg-amber-500/30 rounded-full blur-2xl animate-pulse"></div>
                    <div className="relative bg-gradient-to-tr from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 p-8 rounded-full shadow-2xl shadow-amber-500/30 dark:shadow-amber-400/30 animate-pulse">
                      <PhoneIcon className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={endCall}
                  className="w-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-xl hover:shadow-2xl hover:translate-y-[-2px] active:translate-y-0 active:scale-95"
                >
                  <PhoneXMarkIcon className="w-6 h-6" />
                  <span>Cancel Call</span>
                </button>
              </div>
            )}

            {/* Ended / Failed State */}
            {(callState === CallState.ENDED || callState === CallState.FAILED) && (
              <div className="space-y-6">
                {callState === CallState.ENDED && callDuration > 0 && (
                  <div className="text-center py-6 bg-slate-50/80 dark:bg-slate-900/80 rounded-2xl">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-2">Final Duration:</p>
                    <p className="text-3xl font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatDuration(callDuration)}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setPhoneNumber('');
                    window.location.reload();
                  }}
                  className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-xl hover:shadow-2xl hover:translate-y-[-2px] active:translate-y-0 active:scale-95"
                >
                  <ArrowPathIcon className="w-6 h-6" />
                  <span>Make Another Call</span>
                </button>
              </div>
            )}

            {/* Info Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 text-center">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Powered by <span className="font-bold text-slate-700 dark:text-slate-300">Intelepeer</span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Real phone calls via backend telephony server
                </p>
              </div>
            </div>
            </div>
            </div>
          );
          })()}

          {/* Column 2: Transcript Panel (Fixed Width) - Only show when call is active or has transcript */}
          {(callState === CallState.CONNECTED || callState === CallState.ENDED || mergedItems.length > 0) && (
            <div className="w-full max-w-[689px] pt-16 pl-8">
              <TranscriptPanel
                items={mergedItems}
                isCallActive={callState === CallState.CONNECTED}
              />
            </div>
          )}

          {/* Column 3: Appointment Summary (Fixed Width, Appears When Bookings Exist) */}
          <div className="w-[450px] pt-16">
            {successfulBookings.length > 0 && (
              <AppointmentSummaryCard
                bookings={successfulBookings}
                parentName={undefined}
              />
            )}
          </div>

        </div>
      </main>

      {/* --- Minimal Footer --- */}
      <footer className="fixed bottom-4 left-0 right-0 z-0 flex justify-center pointer-events-none">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium opacity-50">
          Jefferson Dental Clinics • Phone Mode • Real Outbound Calls
        </span>
      </footer>

    </div>
  );
};
