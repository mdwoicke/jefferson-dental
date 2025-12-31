import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import App from '../App';
import { ConversationHistory } from './ConversationHistory';
import { ConversationDetail } from './ConversationDetail';
import { ThemeToggle } from './ThemeToggle';

// Icon Components
const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
  </svg>
);

type ViewMode = 'app' | 'history' | 'detail';

export const AppWithNav: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('app');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setViewMode('detail');
  };

  const handleBackToHistory = () => {
    setSelectedConversationId(null);
    setViewMode('history');
  };

  const handleBackToApp = () => {
    setSelectedConversationId(null);
    setViewMode('app');
  };

  return (
    <div className="relative min-h-screen">
      {/* Navigation Bar - Only show when not in the main app */}
      {viewMode !== 'app' && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToApp}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'app'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <HomeIcon className="w-5 h-5" />
                <span>New Call</span>
              </button>
              <button
                onClick={handleBackToHistory}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'history' || viewMode === 'detail'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <ClockIcon className="w-5 h-5" />
                <span>Call History</span>
              </button>
            </div>

            <ThemeToggle />
          </div>
        </nav>
      )}

      {/* Content */}
      <div className={viewMode !== 'app' ? 'pt-20' : ''}>
        {viewMode === 'app' && <App onNavigateToHistory={() => setViewMode('history')} />}
        {viewMode === 'history' && <ConversationHistory onSelectConversation={handleSelectConversation} />}
        {viewMode === 'detail' && selectedConversationId && (
          <ConversationDetail conversationId={selectedConversationId} onBack={handleBackToHistory} />
        )}
      </div>
    </div>
  );
};
