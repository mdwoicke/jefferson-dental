/**
 * Conversation Detail Modal Component
 * Displays full conversation transcript and metadata
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { Conversation, ConversationTurn, FunctionCallLog, CallMetrics } from '../database/db-interface';

interface ConversationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
}

export const ConversationDetailModal: React.FC<ConversationDetailModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const { dbAdapter, callMetricsService, isInitialized } = useDatabase();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [functionCalls, setFunctionCalls] = useState<FunctionCallLog[]>([]);
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFunctionId, setExpandedFunctionId] = useState<number | string | null>(null);

  useEffect(() => {
    if (isOpen && conversationId && isInitialized && dbAdapter) {
      loadConversationDetails();
    }
  }, [isOpen, conversationId, isInitialized, dbAdapter]);

  const loadConversationDetails = async () => {
    if (!dbAdapter || !conversationId) return;

    setLoading(true);
    try {
      // Load conversation
      const conversations = await dbAdapter.listConversations({ limit: 1000 });
      const conv = conversations.find(c => c.id === conversationId);
      setConversation(conv || null);

      // Load turns
      const conversationTurns = await dbAdapter.getConversationHistory(conversationId);
      setTurns(conversationTurns);

      // Load function calls
      const calls = await dbAdapter.getFunctionCalls(conversationId);
      setFunctionCalls(calls);

      // Load metrics if available
      if (callMetricsService) {
        try {
          const allMetrics = await callMetricsService.getAllMetrics(1000);
          const conversationMetrics = allMetrics.find(m => m.conversationId === conversationId);
          setMetrics(conversationMetrics || null);
        } catch (error) {
          console.log('No metrics found for this conversation');
        }
      }

      console.log(`✅ Loaded details for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error loading conversation details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Ongoing';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      abandoned: 'bg-gray-200 text-gray-700'
    };
    const style = styles[status as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{status}</span>;
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      user: 'bg-purple-100 text-purple-800',
      assistant: 'bg-blue-100 text-blue-800',
      system: 'bg-gray-100 text-gray-800'
    };
    const style = styles[role as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{role}</span>;
  };

  const renderStars = (score?: number) => {
    if (!score) return <span className="text-gray-400">N/A</span>;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= score ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        ))}
      </div>
    );
  };

  const formatJson = (jsonString: string | undefined) => {
    if (!jsonString) return 'N/A';
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  const toggleFunctionExpanded = (id: number | string | undefined) => {
    if (!id) return;
    setExpandedFunctionId(expandedFunctionId === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Conversation Details</h2>
            {conversation && (
              <p className="text-sm text-gray-500 mt-1 font-mono">{conversation.id}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-gray-500">Loading conversation details...</div>
            </div>
          ) : conversation ? (
            <>
              {/* Metadata Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Conversation Metadata</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Status</div>
                    {getStatusBadge(conversation.outcome || 'unknown')}
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Provider</div>
                    <div className="text-sm font-medium text-gray-800">{conversation.provider || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Duration</div>
                    <div className="text-sm font-medium text-gray-800">
                      {formatDuration(conversation.started_at, conversation.ended_at || null)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Direction</div>
                    <div className="text-sm font-medium text-gray-800 capitalize">{conversation.direction || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Call Metrics Section */}
              {metrics && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Call Quality Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Outcome</div>
                      <div className="text-sm font-medium text-gray-800 capitalize">{metrics.outcome}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Quality Score</div>
                      {renderStars(metrics.qualityScore)}
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Completion Rate</div>
                      <div className="text-sm font-medium text-gray-800">{Math.round(metrics.completionRate * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Errors</div>
                      <div className="text-sm font-medium text-gray-800">{metrics.errorCount}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Function Calls Section */}
              {functionCalls.length > 0 && (
                <div className="bg-white/80 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Function Calls ({functionCalls.length})
                  </h3>
                  <div className="space-y-2">
                    {functionCalls.map((fc, idx) => {
                      const isExpanded = expandedFunctionId === (fc.id || idx);
                      return (
                        <div key={fc.id || idx} className="bg-gray-50 rounded overflow-hidden">
                          <button
                            onClick={() => toggleFunctionExpanded(fc.id || idx)}
                            className="w-full p-3 text-sm hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <svg
                                  className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="font-medium text-gray-900">{fc.function_name}</span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                fc.status === 'success' ? 'bg-green-100 text-green-800' :
                                fc.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {fc.status}
                              </span>
                            </div>
                            <div className="flex gap-4 text-xs text-gray-600">
                              {fc.execution_time_ms && (
                                <span>⏱ {fc.execution_time_ms}ms</span>
                              )}
                              <span>🕐 {new Date(fc.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
                              {/* Input Arguments */}
                              <div>
                                <div className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                                  Input Arguments
                                </div>
                                <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto font-mono">
                                  {formatJson(fc.arguments)}
                                </pre>
                              </div>

                              {/* Output Result */}
                              <div>
                                <div className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                                  Output Result
                                </div>
                                <pre className="bg-gray-900 text-blue-400 rounded p-3 text-xs overflow-x-auto font-mono">
                                  {formatJson(fc.result)}
                                </pre>
                              </div>

                              {/* Error Message (if any) */}
                              {fc.error_message && (
                                <div>
                                  <div className="text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">
                                    Error Message
                                  </div>
                                  <div className="bg-red-50 text-red-800 rounded p-3 text-xs">
                                    {fc.error_message}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conversation Transcript Section */}
              <div className="bg-white/80 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Transcript ({turns.length} messages)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {turns.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No messages in this conversation</div>
                  ) : (
                    turns.map((turn, idx) => (
                      <div key={turn.id || idx} className="flex gap-3">
                        <div className="flex-shrink-0 pt-1">
                          {getRoleBadge(turn.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                              {turn.content_text || '(No text content)'}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(turn.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Conversation not found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetailModal;
