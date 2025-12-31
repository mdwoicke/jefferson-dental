/**
 * Conversations Table Component
 * Displays all voice agent conversations with metrics and drill-down
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { Conversation } from '../database/db-interface';
import { DataExportButton } from '../components/DataExportButton';

interface ConversationsTableProps {
  onViewDetails?: (conversationId: string) => void;
}

export const ConversationsTable: React.FC<ConversationsTableProps> = ({ onViewDetails }) => {
  const { dbAdapter, isInitialized } = useDatabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isInitialized && dbAdapter) {
      loadConversations();
    }
  }, [isInitialized, dbAdapter]);

  const loadConversations = async () => {
    if (!dbAdapter) return;

    setLoading(true);
    try {
      const data = await dbAdapter.listConversations({ limit: 1000, offset: 0 });
      setConversations(data);
      console.log(`✅ Loaded ${data.length} conversations`);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone_number.includes(searchQuery) ||
    (conv.patient_id && conv.patient_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (conv.outcome && conv.outcome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-xs">Unknown</span>;

    const styles = {
      success: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      failure: 'bg-red-100 text-red-800',
      abandoned: 'bg-gray-200 text-gray-700'
    };

    const style = styles[outcome as keyof typeof styles] || 'bg-gray-200 text-gray-700';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {outcome}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and export */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <DataExportButton
          data={filteredConversations}
          filename="conversations"
          format="csv"
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-800">{conversations.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Success</div>
          <div className="text-2xl font-bold text-green-700">
            {conversations.filter(c => c.outcome === 'success').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Partial</div>
          <div className="text-2xl font-bold text-yellow-700">
            {conversations.filter(c => c.outcome === 'partial').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-2xl font-bold text-red-700">
            {conversations.filter(c => c.outcome === 'failure' || c.outcome === 'abandoned').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversation ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConversations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No conversations match your search' : 'No conversations found'}
                  </td>
                </tr>
              ) : (
                filteredConversations.map((conversation) => (
                  <tr key={conversation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {conversation.id.substring(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {conversation.phone_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        conversation.direction === 'outbound'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {conversation.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 uppercase">
                      {conversation.provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(conversation.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDuration(conversation.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getOutcomeBadge(conversation.outcome)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => onViewDetails && onViewDetails(conversation.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer stats */}
      <div className="text-sm text-gray-500 text-center">
        Showing {filteredConversations.length} of {conversations.length} conversations
      </div>
    </div>
  );
};

export default ConversationsTable;
