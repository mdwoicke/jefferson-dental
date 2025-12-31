import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DemoConfigProvider } from './contexts/DemoConfigContext';
import { AppWithNav } from './components/AppWithNav';
import AppBasic from './AppBasic';
import { AdminDashboard } from './admin/AdminDashboard';

const AppSelector: React.FC = () => {
  // Check URL parameter for default version
  const urlParams = new URLSearchParams(window.location.search);
  const versionFromUrl = urlParams.get('version');

  const [selectedVersion, setSelectedVersion] = useState<'basic' | 'enhanced' | null>(
    versionFromUrl === 'basic' ? 'basic' : versionFromUrl === 'enhanced' ? 'enhanced' : null
  );

  // If version is selected, render the appropriate component
  if (selectedVersion === 'basic') {
    return <AppBasic />;
  }

  if (selectedVersion === 'enhanced') {
    return <AppWithNav />;
  }

  // Version selector screen
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-200/30 dark:bg-teal-500/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/30 dark:bg-cyan-500/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-slate-900 dark:text-slate-100 mb-4">
            Jefferson Dental Clinics
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Choose your demo version
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Version */}
          <div
            onClick={() => setSelectedVersion('basic')}
            className="group cursor-pointer bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-teal-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                🎯
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Basic Version</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Original static UI with voice AI conversation. Simple and focused on core functionality.
            </p>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-green-500 dark:text-emerald-400">✓</span>
                Voice conversation with Sophia
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500 dark:text-emerald-400">✓</span>
                Audio visualization
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500 dark:text-emerald-400">✓</span>
                OpenAI & Gemini support
              </li>
            </ul>
            <button className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-xl font-semibold transition-all group-hover:bg-blue-50 dark:group-hover:bg-teal-900/30 group-hover:text-blue-700 dark:group-hover:text-teal-300">
              Launch Basic Version →
            </button>
          </div>

          {/* Enhanced Version */}
          <div
            onClick={() => setSelectedVersion('enhanced')}
            className="group cursor-pointer bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-teal-600 dark:to-cyan-700 rounded-3xl p-8 shadow-xl border-2 border-blue-400 dark:border-teal-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <h2 className="text-2xl font-bold">Enhanced Version</h2>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  NEW
                </span>
              </div>
            </div>
            <p className="mb-6 leading-relaxed opacity-95">
              Advanced AI agent with function calling, CRM integration, real-time scheduling, and debug panel.
            </p>
            <ul className="space-y-2 text-sm mb-6 opacity-95">
              <li className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                All basic features
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                Real-time function calling
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                CRM & scheduling integration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                Debug panel with logs
              </li>
            </ul>
            <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-semibold transition-all hover:bg-blue-50 hover:shadow-lg">
              Launch Enhanced Version →
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            💡 Tip: You can also use URL parameters:{' '}
            <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs">?version=basic</code> or{' '}
            <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs">?version=enhanced</code>
          </p>
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <DatabaseProvider>
        <DemoConfigProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppSelector />} />
              <Route path="/admin/*" element={<AdminDashboard />} />
              <Route path="*" element={<div style={{padding: '20px', background: 'red', color: 'white'}}>404 - Route not found: {window.location.pathname}</div>} />
            </Routes>
          </BrowserRouter>
        </DemoConfigProvider>
      </DatabaseProvider>
    </ThemeProvider>
  </React.StrictMode>
);
