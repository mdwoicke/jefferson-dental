/**
 * Skill Execution Table Component
 * Displays multi-step skill workflow executions
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { SkillExecutionLog } from '../database/db-interface';
import { DataExportButton } from '../components/DataExportButton';

export const SkillExecutionTable: React.FC = () => {
  const { dbAdapter, isInitialized } = useDatabase();
  const [executions, setExecutions] = useState<SkillExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isInitialized && dbAdapter) {
      loadExecutions();
    }
  }, [isInitialized, dbAdapter]);

  const loadExecutions = async () => {
    if (!dbAdapter) return;

    setLoading(true);
    try {
      const data = await dbAdapter.listAllSkillExecutions(1000);
      setExecutions(data);
      console.log(`✅ Loaded ${data.length} skill execution logs`);
    } catch (error) {
      console.error('Error loading skill executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExecutions = executions.filter(e =>
    e.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.stepName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.toolUsed && e.toolUsed.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const styles = { success: 'bg-green-100 text-green-800', failure: 'bg-red-100 text-red-800', skipped: 'bg-gray-200 text-gray-700' };
    const style = styles[status as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{status}</span>;
  };

  // Group executions by conversation and skill
  const groupedExecutions = filteredExecutions.reduce((acc, exec) => {
    const key = `${exec.conversationId}-${exec.skillName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exec);
    return acc;
  }, {} as Record<string, SkillExecutionLog[]>);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="text-gray-500">Loading skill executions...</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input type="text" placeholder="Search skill executions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <DataExportButton data={filteredExecutions} filename="skill-executions" format="csv" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4"><div className="text-sm text-gray-600">Total Steps</div><div className="text-2xl font-bold text-gray-800">{executions.length}</div></div>
        <div className="bg-green-50 rounded-lg p-4"><div className="text-sm text-gray-600">Successful</div><div className="text-2xl font-bold text-green-700">{executions.filter(e => e.executionStatus === 'success').length}</div></div>
        <div className="bg-red-50 rounded-lg p-4"><div className="text-sm text-gray-600">Failed</div><div className="text-2xl font-bold text-red-700">{executions.filter(e => e.executionStatus === 'failure').length}</div></div>
        <div className="bg-blue-50 rounded-lg p-4"><div className="text-sm text-gray-600">Unique Skills</div><div className="text-2xl font-bold text-blue-700">{new Set(executions.map(e => e.skillName)).size}</div></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool Used</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exec Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExecutions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{searchQuery ? 'No executions match your search' : 'No skill executions found'}</td></tr>
              ) : (
                filteredExecutions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{exec.skillName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900"><span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center mr-2">{exec.stepNumber}</span>{exec.stepName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exec.toolUsed || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(exec.executionStatus)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{exec.executionTimeMs ? `${exec.executionTimeMs}ms` : 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(exec.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SkillExecutionTable;
