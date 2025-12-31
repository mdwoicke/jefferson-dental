/**
 * Function Calls Table Component
 * Displays all function calls made by the voice agent
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { FunctionCallLog } from '../database/db-interface';
import { DataExportButton } from '../components/DataExportButton';

export const FunctionCallsTable: React.FC = () => {
  const { dbAdapter, isInitialized } = useDatabase();
  const [functionCalls, setFunctionCalls] = useState<FunctionCallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isInitialized && dbAdapter) {
      loadFunctionCalls();
    }
  }, [isInitialized, dbAdapter]);

  const loadFunctionCalls = async () => {
    if (!dbAdapter) return;

    setLoading(true);
    try {
      // Get all conversations and then their function calls
      const conversations = await dbAdapter.listConversations({ limit: 100 });
      const allCalls: FunctionCallLog[] = [];

      for (const conv of conversations) {
        const calls = await dbAdapter.getFunctionCalls(conv.id);
        allCalls.push(...calls);
      }

      setFunctionCalls(allCalls);
      console.log(`✅ Loaded ${allCalls.length} function calls`);
    } catch (error) {
      console.error('Error loading function calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredCalls = functionCalls.filter(fc =>
    fc.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fc.conversation_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    const style = styles[status as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{status}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="text-gray-500">Loading function calls...</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search function calls..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <DataExportButton data={filteredCalls} filename="function-calls" format="csv" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Calls</div>
          <div className="text-2xl font-bold text-gray-800">{functionCalls.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Successful</div>
          <div className="text-2xl font-bold text-green-700">{functionCalls.filter(fc => fc.status === 'success').length}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Errors</div>
          <div className="text-2xl font-bold text-red-700">{functionCalls.filter(fc => fc.status === 'error').length}</div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Function Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Execution Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCalls.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{searchQuery ? 'No function calls match your search' : 'No function calls found'}</td></tr>
              ) : (
                filteredCalls.map((fc) => (
                  <React.Fragment key={fc.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{fc.function_name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{fc.conversation_id.substring(0, 16)}...</td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(fc.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{fc.execution_time_ms ? `${fc.execution_time_ms}ms` : 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(fc.timestamp).toLocaleTimeString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => toggleRow(fc.id!)} className="text-blue-600 hover:text-blue-800 font-medium">
                          {expandedRows.has(fc.id!) ? 'Hide' : 'Show'}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(fc.id!) && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Arguments:</span> <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto">{fc.arguments}</pre></div>
                            {fc.result && <div><span className="font-medium">Result:</span> <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto">{fc.result}</pre></div>}
                            {fc.error_message && <div><span className="font-medium text-red-600">Error:</span> <p className="mt-1 text-red-600">{fc.error_message}</p></div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FunctionCallsTable;
