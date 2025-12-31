import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import type { Conversation } from '../database/db-interface';

interface ConversationHistoryProps {
  onSelectConversation?: (conversationId: string) => void;
}

// Icon Components
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
  </svg>
);

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ onSelectConversation }) => {
  const { theme } = useTheme();
  const { dbAdapter, isInitialized } = useDatabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'outbound' | 'inbound'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'appointment_scheduled' | 'no_answer'>('all');

  useEffect(() => {
    if (isInitialized && dbAdapter) {
      fetchConversations();
    }
  }, [isInitialized, dbAdapter]);

  const fetchConversations = async () => {
    if (!dbAdapter) {
      setError('Database not initialized');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await dbAdapter.listConversations({ limit: 100 });
      setConversations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getOutcomeIcon = (outcome?: string) => {
    if (!outcome) return <ClockIcon className="w-5 h-5 text-gray-400" />;

    if (outcome.includes('scheduled') || outcome.includes('success')) {
      return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
    }

    return <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return 'In Progress';

    return outcome
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getOutcomeColor = (outcome?: string) => {
    if (!outcome) return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

    if (outcome.includes('scheduled') || outcome.includes('success')) {
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    }

    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  const filteredConversations = conversations.filter(conv => {
    if (filter !== 'all' && conv.direction !== filter) return false;
    if (outcomeFilter !== 'all' && conv.outcome !== outcomeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Call History
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          View and analyze past conversations
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All Calls
          </button>
          <button
            onClick={() => setFilter('outbound')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'outbound'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Outbound
          </button>
          <button
            onClick={() => setFilter('inbound')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'inbound'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Inbound
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOutcomeFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              outcomeFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All Outcomes
          </button>
          <button
            onClick={() => setOutcomeFilter('appointment_scheduled')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              outcomeFilter === 'appointment_scheduled'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Scheduled
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-300">Loading conversations...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchConversations}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredConversations.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg">
            <PhoneIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-300 text-lg">No conversations found</p>
          </div>
        )}

        {!loading && !error && filteredConversations.length > 0 && (
          <div className="grid gap-4">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation?.(conv.id)}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      conv.direction === 'outbound'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      <PhoneIcon className={`w-6 h-6 ${
                        conv.direction === 'outbound'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {conv.phone_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          conv.direction === 'outbound'
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                        }`}>
                          {conv.direction.charAt(0).toUpperCase() + conv.direction.slice(1)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {conv.provider === 'openai' ? 'OpenAI' : 'Gemini'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>{formatDate(conv.started_at)}</span>
                        </div>
                        {conv.duration_seconds !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>Duration: {formatDuration(conv.duration_seconds)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getOutcomeIcon(conv.outcome)}
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getOutcomeColor(conv.outcome)}`}>
                      {getOutcomeBadge(conv.outcome)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
