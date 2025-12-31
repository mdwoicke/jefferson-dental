

import React, { useState } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';
import { TelephonyMode } from './components/TelephonyMode';
import { VoiceProvider } from './types';

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

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('browser');
  const [provider, setProvider] = useState<VoiceProvider>('openai');
  const { connect, disconnect, isConnected, volumeLevel, error, isMuted, toggleMute } = useLiveSession(provider);

  // If telephony mode, render the telephony component
  if (mode === 'telephony') {
    return <TelephonyMode provider={provider} onProviderChange={setProvider} />;
  }

  // Otherwise, render the browser demo mode
  return (
    <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 overflow-hidden selection:bg-blue-100">
      
      {/* --- Ambient Background Animations --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Large Blue Blob */}
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        {/* Large Purple Blob */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        {/* Large Indigo Blob */}
        <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        {/* Texture overlay for grain effect (optional, css pattern) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* --- Floating Header --- */}
      <header className="fixed top-6 left-0 right-0 z-50 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-1.5 rounded-lg shadow-lg shadow-blue-500/30">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-sm">Jefferson Dental Clinics</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Selector - Only show when not connected */}
          {!isConnected && (
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm">
              <span className="text-xs font-medium text-slate-600">Mode:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AppMode)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800"
              >
                <option value="browser">Browser Demo</option>
                <option value="telephony">Phone Call</option>
              </select>
            </div>
          )}
          {/* Provider Selection - Only show when not connected */}
          {!isConnected && (
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm">
              <span className="text-xs font-medium text-slate-600">Provider:</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as VoiceProvider)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          )}

          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-300 border ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
              : 'bg-white/60 text-slate-500 border-white/40'
          }`}>
             <span className={`relative flex h-2.5 w-2.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-500' : 'bg-slate-400 hidden'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
             </span>
             {isConnected ? 'LIVE CALL ACTIVE' : 'OUTBOUND SIMULATION'}
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        
        {/* Error Notification */}
        {error && (
          <div className="absolute top-28 z-50 flex items-center gap-3 bg-red-50 text-red-700 px-5 py-4 rounded-2xl border border-red-100 shadow-xl shadow-red-500/10 animate-bounce">
            <AlertCircleIcon className="w-6 h-6 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {!isConnected ? (
           /* --- IDLE STATE: Hero Section --- */
           <div className="flex flex-col items-center text-center space-y-12 max-w-3xl fade-enter-active">
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-xs font-semibold tracking-wide border border-blue-200/50 mb-2">
                  MEDICAID OUTREACH DEMO
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                   Proactive care for <br />
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">every family.</span>
                </h1>
                <p className="text-lg md:text-2xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
                   Experience "Sophia", the AI agent designed to help families maximize their state dental benefits. 
                </p>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <button
                  onClick={connect}
                  className="relative flex items-center gap-4 bg-slate-900 text-white pl-8 pr-10 py-5 rounded-full font-medium text-xl transition-all hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-blue-900/20 active:scale-95 active:translate-y-0"
                >
                  <span className="bg-white/10 p-2 rounded-full">
                    <PhoneIcon className="w-6 h-6" />
                  </span>
                  Simulate Outbound Call
                </button>
              </div>
              
              <div className="flex gap-8 text-sm text-slate-400 font-medium tracking-wide uppercase">
                <span>• Handle Multiple Patients</span>
                <span>• Verify Benefits</span>
              </div>
           </div>
        ) : (
           /* --- CONNECTED STATE: Visualizer & Controls --- */
           <div className="w-full flex flex-col items-center justify-center gap-10 fade-enter-active">
              
              {/* Visualizer Container */}
              <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
                 {/* Decorative Rings */}
                 <div className="absolute inset-0 border border-indigo-500/10 rounded-full scale-125"></div>
                 <div className="absolute inset-0 border border-blue-500/10 rounded-full scale-150"></div>
                 
                 {/* The Canvas Visualizer */}
                 <Visualizer 
                    inputVolume={isMuted ? 0 : volumeLevel.input} 
                    outputVolume={volumeLevel.output} 
                    isActive={isConnected} 
                 />
                 
                 {/* Status Text */}
                 <div className="absolute bottom-[20%] flex flex-col items-center gap-2">
                    <p className="text-slate-400 font-medium tracking-widest text-xs uppercase">
                      Speaking with Sophia (Outbound)
                    </p>
                 </div>
              </div>

              {/* Floating Control Dock */}
              <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl p-2 rounded-3xl shadow-2xl border border-white/50 transform translate-y-0 transition-all hover:scale-105">
                <button
                  onClick={toggleMute}
                  className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                    isMuted 
                      ? 'bg-amber-100 text-amber-600 shadow-inner' 
                      : 'bg-slate-100 text-slate-600 hover:bg-white hover:shadow-lg'
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicSlashIcon className="w-7 h-7" /> : <MicIcon className="w-7 h-7" />}
                </button>
                
                <div className="w-px h-8 bg-slate-200 mx-1"></div>

                <button
                  onClick={disconnect}
                  className="h-16 px-8 flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95"
                >
                  <PhoneXMarkIcon className="w-6 h-6" />
                  <span>End Simulation</span>
                </button>
              </div>
           </div>
        )}
      </main>

      {/* --- Minimal Footer --- */}
      <footer className="fixed bottom-4 left-0 right-0 z-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-slate-400 font-medium opacity-50">Jefferson Dental Clinics • Internal Demo • Use Case: Medicaid Outreach</span>
      </footer>

    </div>
  );
};

export default App;
