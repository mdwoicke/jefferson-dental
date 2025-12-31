import React, { useState, useEffect } from 'react';
import { TranscriptPanel } from './TranscriptPanel';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import type { Conversation, ConversationTurn, FunctionCallLog } from '../database/db-interface';

interface ConversationDetailProps {
  conversationId: string;
  onBack?: () => void;
}

interface ConversationStats {
  conversationId: string;
  duration?: number;
  outcome?: string;
  totalTurns: number;
  userTurns: number;
  assistantTurns: number;
  totalFunctionCalls: number;
  successfulFunctionCalls: number;
  failedFunctionCalls: number;
  provider: string;
  direction: string;
}

interface ConversationData {
  conversation: Conversation;
  turns: ConversationTurn[];
  functionCalls: FunctionCallLog[];
  stats: ConversationStats;
}

// Icon Components
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
  </svg>
);

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
  </svg>
);

export const ConversationDetail: React.FC<ConversationDetailProps> = ({ conversationId, onBack }) => {
  const { theme } = useTheme();
  const { dbAdapter, isInitialized } = useDatabase();
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && dbAdapter) {
      fetchConversationDetails();
    }
  }, [conversationId, isInitialized, dbAdapter]);

  const fetchConversationDetails = async () => {
    if (!dbAdapter) {
      setError('Database not initialized');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch conversation, turns, and function calls in parallel
      const [conversation, turns, functionCalls] = await Promise.all([
        dbAdapter.getConversation(conversationId),
        dbAdapter.getConversationHistory(conversationId),
        dbAdapter.getFunctionCalls(conversationId)
      ]);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Calculate stats locally
      const userTurns = turns.filter(t => t.role === 'user').length;
      const assistantTurns = turns.filter(t => t.role === 'assistant').length;
      const successfulFunctionCalls = functionCalls.filter(fc => fc.status === 'success').length;
      const failedFunctionCalls = functionCalls.filter(fc => fc.status === 'error').length;

      const stats: ConversationStats = {
        conversationId: conversation.id,
        duration: conversation.duration_seconds,
        outcome: conversation.outcome,
        totalTurns: turns.length,
        userTurns,
        assistantTurns,
        totalFunctionCalls: functionCalls.length,
        successfulFunctionCalls,
        failedFunctionCalls,
        provider: conversation.provider,
        direction: conversation.direction
      };

      setData({
        conversation,
        turns,
        functionCalls,
        stats
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  // Helper to safely parse JSON
  const safeJsonParse = (str: string | undefined) => {
    if (!str) return undefined;
    try {
      return JSON.parse(str);
    } catch {
      return str; // Return as-is if not valid JSON
    }
  };

  // Convert turns to transcript items format (matching TranscriptPanel's expected interface)
  const transcriptItems = data?.turns
    .filter(turn => turn.role === 'user' || turn.role === 'assistant')
    .map((turn, index) => {
      const timestamp = new Date(turn.timestamp);
      return {
        id: `turn-${turn.id}`,
        role: turn.role as 'user' | 'assistant',
        text: turn.content_text || '',
        timestamp,
        createdAt: timestamp,
        sequenceNumber: turn.turn_number || index,
        isPartial: false
      };
    }) || [];

  // Add function calls as transcript items
  const functionCallItems = data?.functionCalls.map((fc, index) => {
    const timestamp = new Date(fc.timestamp);
    return {
      id: `fc-${fc.id}`,
      type: 'function_call' as const,
      callId: fc.call_id || '',
      functionName: fc.function_name,
      arguments: safeJsonParse(fc.arguments) || {},
      result: safeJsonParse(fc.result),
      status: fc.status as 'pending' | 'success' | 'error',
      executionTimeMs: fc.execution_time_ms,
      errorMessage: fc.error_message,
      timestamp,
      createdAt: timestamp,
      sequenceNumber: 1000 + index // Offset to interleave with turns properly
    };
  }) || [];

  // Merge items - TranscriptPanel handles the sorting internally
  const allItems = [...transcriptItems, ...functionCallItems];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to History
          </button>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-300">{error || 'Conversation not found'}</p>
            <button
              onClick={fetchConversationDetails}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="font-medium">Back to History</span>
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                {data.conversation.phone_number}
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                {formatDate(data.conversation.started_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                data.conversation.direction === 'outbound'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
              }`}>
                {data.conversation.direction.charAt(0).toUpperCase() + data.conversation.direction.slice(1)}
              </span>
              <span className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {data.conversation.provider === 'openai' ? 'OpenAI' : 'Gemini'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Duration</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {formatDuration(data.conversation.duration_seconds)}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Turns</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {data.stats.totalTurns}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Function Calls</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {data.stats.totalFunctionCalls}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Outcome</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {data.conversation.outcome?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main transcript - takes 2 columns */}
          <div className="lg:col-span-2">
            <TranscriptPanel items={allItems} isCallActive={false} />
          </div>

          {/* Statistics sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Conversation Stats
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">User Messages</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {data.stats.userTurns}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">AI Messages</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {data.stats.assistantTurns}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Successful Functions</span>
                    <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {data.stats.successfulFunctionCalls}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Failed Functions</span>
                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {data.stats.failedFunctionCalls}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation ID */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Conversation ID</p>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                {data.conversation.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
