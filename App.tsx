

import React, { useState, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';
import { TelephonyMode } from './components/TelephonyMode';
import { PatientSelector } from './components/PatientSelector';
import { TranscriptPanel } from './components/TranscriptPanel';
import { AppointmentSummaryCard } from './components/AppointmentSummaryCard';
import { ThemeToggle } from './components/ThemeToggle';
import IPhoneCallScreen from './components/IPhoneCallScreen';
import { DemoConfigSelector } from './components/DemoConfigSelector';
import { DemoWizard } from './wizard';
import { extractSuccessfulBookings, extractSMSConfirmationRequest } from './utils/appointment-utils';
import { VoiceProvider } from './types';
import { useDatabase } from './contexts/DatabaseContext';
import { useActiveDemoConfig } from './contexts/DemoConfigContext';
import type { PatientRecord } from './database/db-interface';

type AppMode = 'browser' | 'telephony';

// Modern Icon Components
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

const PhoneXMarkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
    <path d="M21.75 12a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0V12z" />
  </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
  </svg>
);

const MicSlashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v5.139l-7.5-7.5V4.5zM9 16.035V12.75a3.75 3.75 0 00-1.5-3v1.5a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 012.25 2.25v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5a.75.75 0 01.75-.75z" />
    <path d="M3.515 3.515a.75.75 0 10-1.06 1.06L19.439 20.5a.75.75 0 101.06-1.061L3.515 3.515z" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z" clipRule="evenodd" />
  </svg>
);

interface AppProps {
  onNavigateToHistory?: () => void;
}

const App: React.FC<AppProps> = ({ onNavigateToHistory }) => {
  const [mode, setMode] = useState<AppMode>('browser');
  const [provider, setProvider] = useState<VoiceProvider>('openai');
  const [hasCallEnded, setHasCallEnded] = useState(false);
  const [toolSystemMode, setToolSystemMode] = useState<string>('unknown');

  // Demo configuration
  const { activeConfig } = useActiveDemoConfig();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // SMS Notification state
  const [smsMessage, setSmsMessage] = useState<string>('');
  const [smsVisible, setSmsVisible] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  // Database context for loading patient data
  const { crmService, dbAdapter, isInitialized } = useDatabase();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  // Patient selection state with localStorage persistence
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('selectedPatientId');
    } catch {
      return null;
    }
  });

  // Persist selected patient ID to localStorage
  useEffect(() => {
    try {
      if (selectedPatientId) {
        localStorage.setItem('selectedPatientId', selectedPatientId);
      } else {
        localStorage.removeItem('selectedPatientId');
      }
    } catch (error) {
      console.error('Failed to persist patient selection:', error);
    }
  }, [selectedPatientId]);

  // Load patients from database
  useEffect(() => {
    if (!isInitialized || !crmService) return;

    const loadPatients = async () => {
      try {
        const data = await crmService.listPatients(100, 0);
        setPatients(data);
      } catch (error) {
        console.error('Failed to load patients:', error);
      }
    };

    loadPatients();
  }, [isInitialized, crmService]);

  const {
    connect,
    disconnect,
    isConnected,
    volumeLevel,
    error,
    isMuted,
    toggleMute,
    patient,
    isLoadingPatient,
    transcriptItems = [],
    clearTranscripts,
    toolSystemMode: hookToolSystemMode,
    // Audio device selection
    audioDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    enumerateAudioDevices,
    // Secure context check
    isSecureContext
  } = useLiveSession(provider, selectedPatientId, dbAdapter, setToolSystemMode, activeConfig);

  // Sync hook's toolSystemMode to local state
  React.useEffect(() => {
    if (hookToolSystemMode) {
      setToolSystemMode(hookToolSystemMode);
    }
  }, [hookToolSystemMode]);

  // Debug: Log transcriptItems whenever they change
  React.useEffect(() => {
    console.log('📋 APP.TSX - transcriptItems changed:', transcriptItems.length, 'items');
    console.log('📋 APP.TSX - transcriptItems:', transcriptItems);
  }, [transcriptItems]);

  // Extract successful appointment bookings from transcripts
  const successfulBookings = extractSuccessfulBookings(transcriptItems);

  // Debug: Log successful bookings
  React.useEffect(() => {
    console.log('📋 APP.TSX - successfulBookings:', successfulBookings.length, 'bookings');
    console.log('📋 APP.TSX - bookings data:', successfulBookings);
  }, [successfulBookings]);

  // Format SMS message from booking using dynamic config
  const formatSMSMessage = (booking: any): string => {
    const childNames = booking.child_names.join(' and ');
    const date = new Date(booking.appointment_time);
    const formattedTime = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const orgName = activeConfig?.businessProfile?.organizationName || 'Jefferson Dental';
    const address = activeConfig?.businessProfile?.address;
    const locationStr = address
      ? `${address.street}, ${address.city}`
      : '123 Main St, Austin';
    const phoneNumber = activeConfig?.businessProfile?.phoneNumber || '512-555-0100';

    return `${orgName} Confirmed

${childNames}
${formattedTime}

Location:
${locationStr}

What to bring:
• Medicaid cards for each child
• Photo ID for parent

Questions? Call ${phoneNumber}

Booking ID: ${booking.booking_id}`;
  };

  // Show SMS notification only when user explicitly requests it
  React.useEffect(() => {
    const smsRequest = extractSMSConfirmationRequest(transcriptItems);

    if (smsRequest) {
      // Check if this is a new SMS request (different timestamp)
      const requestTime = smsRequest.timestamp.getTime();
      const lastRequestTime = lastBookingId ? parseInt(lastBookingId) : 0;

      if (requestTime !== lastRequestTime) {
        console.log('📱 SMS CONFIRMATION REQUESTED - Showing SMS notification');
        setLastBookingId(requestTime.toString());

        // Use dynamic config values for SMS message
        const orgName = activeConfig?.businessProfile?.organizationName || 'Jefferson Dental';
        const address = activeConfig?.businessProfile?.address;
        const locationStr = address
          ? `${address.street}, ${address.city}`
          : '123 Main St, Austin';
        const phoneNumber = activeConfig?.businessProfile?.phoneNumber || '512-555-0100';

        const formattedMessage = `${orgName} Confirmed\n\n${smsRequest.appointmentDetails}\n\nLocation:\n${locationStr}\n\nWhat to bring:\n• Medicaid cards for each child\n• Photo ID for parent\n\nQuestions? Call ${phoneNumber}`;

        setSmsMessage(formattedMessage);
        setSmsVisible(true);
      }
    }
  }, [transcriptItems, lastBookingId, activeConfig]);

  // Handle SMS dismissal
  const handleSMSDismiss = () => {
    console.log('📱 SMS notification dismissed');
    setSmsVisible(false);
  };

  // Wrapper to handle call end - keeps interface visible
  const handleDisconnect = () => {
    disconnect();
    setHasCallEnded(true);
  };

  // Reset to initial state (for "Start New Call" button)
  const handleReset = () => {
    setHasCallEnded(false);
    setSmsVisible(false);
    setSmsMessage('');
    setLastBookingId(null);
    clearTranscripts();
  };

  // Mode-aware connect handler - calls appropriate method based on mode
  const handleConnect = async () => {
    // Reset call ended state when starting new call
    setHasCallEnded(false);

    if (mode === 'browser') {
      // Browser mode: Use direct WebRTC connection via useLiveSession
      await connect();
    } else {
      // Telephony mode: Initiate real phone call via backend
      await handleInitiateCall();
    }
  };

  // Handler to initiate outbound call via backend API
  const handleInitiateCall = async () => {
    if (!selectedPatientId) {
      alert('Please select a patient first');
      return;
    }

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    if (!selectedPatient) {
      alert('Selected patient not found');
      return;
    }

    try {
      setIsInitiatingCall(true);
      const response = await fetch('http://localhost:3001/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedPatient.phoneNumber,
          provider: provider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate call');
      }

      const data = await response.json();
      console.log('Call initiated:', data);
      alert(`Outbound call initiated to ${selectedPatient.parentName} (${selectedPatient.phoneNumber})`);
    } catch (error: any) {
      console.error('Error initiating call:', error);
      alert(`Failed to initiate call: ${error.message}`);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // If telephony mode, render the telephony component
  if (mode === 'telephony') {
    return <TelephonyMode provider={provider} onProviderChange={setProvider} />;
  }

  // Otherwise, render the browser demo mode
  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 overflow-hidden selection:bg-blue-100 dark:selection:bg-blue-900/40">

      {/* --- Ambient Background Animations --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Large Blue Blob */}
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-200/40 dark:bg-blue-500/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 animate-blob"></div>
        {/* Large Purple Blob */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        {/* Large Indigo Blob */}
        <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[800px] bg-indigo-200/40 dark:bg-indigo-500/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        {/* Texture overlay for grain effect (optional, css pattern) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-5 brightness-100 contrast-150"></div>
      </div>

      {/* --- Floating Header --- */}
      <header className="fixed top-6 left-0 right-0 z-50 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
            <div
              className="text-white p-1.5 rounded-lg shadow-lg"
              style={{
                background: activeConfig?.businessProfile?.primaryColor
                  ? `linear-gradient(to top right, ${activeConfig.businessProfile.primaryColor}, ${activeConfig.businessProfile.secondaryColor || activeConfig.businessProfile.primaryColor})`
                  : 'linear-gradient(to top right, #2563eb, #6366f1)'
              }}
            >
              <SparklesIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight text-sm">
              {activeConfig?.uiLabels?.headerText || activeConfig?.businessProfile?.organizationName || 'Jefferson Dental Clinics'}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">
              {activeConfig?.uiLabels?.headerBadge || '(Enhanced)'}
            </span>
          </div>

          {/* Demo Config Selector */}
          {!isConnected && (
            <DemoConfigSelector onOpenWizard={() => setIsWizardOpen(true)} />
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Call History Button */}
          {onNavigateToHistory && !isConnected && (
            <button
              onClick={onNavigateToHistory}
              className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-700 dark:text-slate-300">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">History</span>
            </button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Tool System Mode Indicator - Hidden */}
          {/* <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {toolSystemMode === 'dynamic' ? '🔧 Dynamic' : toolSystemMode === 'static' ? '📦 Static' : '⏳ Loading'}
            </span>
          </div> */}

          {/* Mode Selector - Only show when not connected */}
          {!isConnected && (
            <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-200">Mode:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AppMode)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <option value="browser">Browser Demo</option>
                <option value="telephony">Phone Call</option>
              </select>
            </div>
          )}
          {/* Provider Selection - Hidden (OpenAI is default in background) */}
          {/* {!isConnected && (
            <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-200">Provider:</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as VoiceProvider)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          )} */}

          {/* Microphone Selection - Only show when not connected */}
          {!isConnected && audioDevices.length > 0 && (
            <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
              <MicIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-200" />
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800 dark:text-slate-100 max-w-[150px] truncate"
              >
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => enumerateAudioDevices()}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Refresh microphone list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Patient Selector - Only show when not connected */}
          {!isConnected && (
            <PatientSelector
              selectedPatientId={selectedPatientId}
              onSelect={setSelectedPatientId}
            />
          )}

          {/* Debug Panel Toggle */}

          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-300 border ${
            isConnected
              ? 'bg-emerald-500/10 dark:bg-blue-500/20 text-emerald-700 dark:text-blue-300 border-emerald-500/20 dark:border-blue-500/40'
              : 'bg-white/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-200 border-white/40 dark:border-slate-700/70'
          }`}>
             <span className={`relative flex h-2.5 w-2.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-500 dark:bg-blue-400' : 'bg-slate-400 hidden'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500 dark:bg-blue-400' : 'bg-slate-400'}`}></span>
             </span>
             {isConnected ? 'LIVE CALL ACTIVE' : 'OUTBOUND SIMULATION'}
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">

        {/* Error Notification */}
        {error && (
          <div className="absolute top-28 z-50 flex items-center gap-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-5 py-4 rounded-2xl border border-red-100 dark:border-red-800 shadow-xl shadow-red-500/10 animate-bounce">
            <AlertCircleIcon className="w-6 h-6 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {!isConnected && !hasCallEnded ? (
           /* --- IDLE STATE: Hero Section --- */
           <div className="flex flex-col items-center text-center space-y-12 max-w-3xl fade-enter-active">
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 rounded-full bg-blue-100/50 dark:bg-indigo-900/50 text-blue-700 dark:text-indigo-200 text-xs font-semibold tracking-wide border border-blue-200/50 dark:border-indigo-600/60 mb-2">
                  {activeConfig?.uiLabels?.badgeText || 'VOICE AI DEMO'} • FUNCTION CALLING ENABLED
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.1]">
                   {activeConfig?.uiLabels?.heroTitle ? (
                     <>
                       {activeConfig.uiLabels.heroTitle.split(' ').slice(0, -2).join(' ')} <br />
                       <span
                         className="text-transparent bg-clip-text"
                         style={{
                           backgroundImage: activeConfig?.businessProfile?.primaryColor
                             ? `linear-gradient(to right, ${activeConfig.businessProfile.primaryColor}, ${activeConfig.businessProfile.secondaryColor || activeConfig.businessProfile.primaryColor})`
                             : 'linear-gradient(to right, #2563eb, #6366f1)'
                         }}
                       >
                         {activeConfig.uiLabels.heroTitle.split(' ').slice(-2).join(' ')}
                       </span>
                     </>
                   ) : (
                     <>
                       Proactive care for <br />
                       <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-300 dark:to-indigo-300">every family.</span>
                     </>
                   )}
                </h1>
                <p className="text-lg md:text-2xl text-slate-500 dark:text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
                   {activeConfig?.uiLabels?.heroSubtitle || `Experience "${activeConfig?.agentConfig?.agentName || 'Sophia'}", the AI agent with advanced capabilities: check availability, book appointments, query patient data, and send confirmations.`}
                </p>
              </div>

              {/* HTTPS Warning for non-localhost access */}
              {!isSecureContext && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-6 py-4 max-w-xl mx-auto">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-amber-800 dark:text-amber-200 font-medium">Microphone requires HTTPS</p>
                      <p className="text-amber-600 dark:text-amber-400 text-sm">Use <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">https://</code> or access via <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">localhost</code> for browser audio.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <button
                  onClick={handleConnect}
                  disabled={(mode === 'telephony' && isInitiatingCall) || !selectedPatientId || (mode === 'browser' && !isInitialized)}
                  className="relative flex items-center gap-4 bg-slate-900 dark:bg-blue-600 text-white pl-8 pr-10 py-5 rounded-full font-medium text-xl transition-all hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-blue-900/20 dark:hover:shadow-blue-900/40 active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <span className="bg-white/10 p-2 rounded-full">
                    {(mode === 'telephony' && isInitiatingCall) ? (
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <PhoneIcon className="w-6 h-6" />
                    )}
                  </span>
                  {mode === 'telephony' && isInitiatingCall ? 'Initiating Call...' : mode === 'browser' ? (activeConfig?.uiLabels?.callButtonText || 'Start Browser Demo') : 'Initiate Phone Call'}
                </button>
              </div>

              <div className="flex gap-8 text-sm text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">
                <span>• Real-time Function Calls</span>
                <span>• CRM Integration</span>
                <span>• Smart Scheduling</span>
              </div>
           </div>
        ) : (
           /* --- CONNECTED STATE: 3-Column Grid Layout --- */
           <div className="w-full px-8 fade-enter-active">
              <div className="grid grid-cols-[342px_1fr_auto] gap-12 max-w-[1800px] mx-auto items-start">

                {/* Column 1: iPhone Call Screen */}
                <div className="flex flex-col items-center justify-start pt-20">
                  <IPhoneCallScreen
                    inputVolume={isMuted ? 0 : volumeLevel.input}
                    outputVolume={volumeLevel.output}
                    isActive={isConnected}
                    isConnected={isConnected}
                    isMuted={isMuted}
                    contactName="Outbound Call"
                    hasCallEnded={hasCallEnded}
                    smsMessage={smsMessage}
                    smsVisible={smsVisible}
                    onSMSDismiss={handleSMSDismiss}
                    onMute={toggleMute}
                    onEndCall={handleDisconnect}
                    onStartNewCall={handleReset}
                  />
                </div>

                {/* Column 2: Transcript Panel (Fixed Width) - Only show when call is active or has transcript */}
                {(isConnected || transcriptItems.length > 0) && (
                  <div className="w-full max-w-[626px] pt-16 pl-8">
                    <TranscriptPanel
                      items={transcriptItems}
                      isCallActive={isConnected}
                    />
                  </div>
                )}

                {/* Column 3: Appointment Summary (Fixed Width, Appears When Bookings Exist) */}
                <div className="w-[450px] pt-16">
                  {successfulBookings.length > 0 && (
                    <AppointmentSummaryCard
                      bookings={successfulBookings}
                      parentName={patient?.parentName}
                    />
                  )}
                </div>

              </div>
           </div>
        )}
      </main>

      {/* --- Minimal Footer --- */}
      <footer className="fixed bottom-4 left-0 right-0 z-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-slate-400 font-medium opacity-50">
            {activeConfig?.businessProfile?.organizationName || 'Jefferson Dental Clinics'} • {activeConfig?.uiLabels?.footerText || 'Enhanced Demo'} • Function Calling + CRM + Scheduling
          </span>
      </footer>

      {/* --- Demo Wizard Modal --- */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsWizardOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Wizard content */}
            <div className="overflow-y-auto max-h-[90vh]">
              <DemoWizard
                onComplete={() => {
                  setIsWizardOpen(false);
                }}
                onCancel={() => setIsWizardOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
