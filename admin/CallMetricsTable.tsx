/**
 * Call Metrics Table Component
 * Displays call quality metrics and analytics
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { CallMetrics } from '../database/db-interface';
import { DataExportButton } from '../components/DataExportButton';

export const CallMetricsTable: React.FC = () => {
  const { callMetricsService, isInitialized } = useDatabase();
  const [metrics, setMetrics] = useState<CallMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isInitialized && callMetricsService) {
      loadMetrics();
    }
  }, [isInitialized, callMetricsService]);

  const loadMetrics = async () => {
    if (!callMetricsService) return;

    setLoading(true);
    try {
      const data = await callMetricsService.getAllMetrics(1000);
      setMetrics(data);
      console.log(`✅ Loaded ${data.length} call metrics`);
    } catch (error) {
      console.error('Error loading call metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMetrics = metrics.filter(m =>
    m.conversationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.outcome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOutcomeBadge = (outcome: string) => {
    const styles = { success: 'bg-green-100 text-green-800', partial: 'bg-yellow-100 text-yellow-800', failure: 'bg-red-100 text-red-800', abandoned: 'bg-gray-200 text-gray-700' };
    const style = styles[outcome as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{outcome}</span>;
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

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="text-gray-500">Loading call metrics...</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input type="text" placeholder="Search metrics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <DataExportButton data={filteredMetrics} filename="call-metrics" format="csv" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4"><div className="text-sm text-gray-600">Total Calls</div><div className="text-2xl font-bold text-gray-800">{metrics.length}</div></div>
        <div className="bg-green-50 rounded-lg p-4"><div className="text-sm text-gray-600">Success Rate</div><div className="text-2xl font-bold text-green-700">{metrics.length > 0 ? Math.round((metrics.filter(m => m.outcome === 'success').length / metrics.length) * 100) : 0}%</div></div>
        <div className="bg-blue-50 rounded-lg p-4"><div className="text-sm text-gray-600">Avg Completion</div><div className="text-2xl font-bold text-blue-700">{metrics.length > 0 ? Math.round((metrics.reduce((sum, m) => sum + m.completionRate, 0) / metrics.length) * 100) : 0}%</div></div>
        <div className="bg-purple-50 rounded-lg p-4"><div className="text-sm text-gray-600">Avg Duration</div><div className="text-2xl font-bold text-purple-700">{metrics.length > 0 ? Math.round(metrics.reduce((sum, m) => sum + (m.callDurationSeconds || 0), 0) / metrics.length) : 0}s</div></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMetrics.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{searchQuery ? 'No metrics match your search' : 'No metrics found'}</td></tr>
              ) : (
                filteredMetrics.map((metric) => (
                  <tr key={metric.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{metric.conversationId.substring(0, 16)}...</td>
                    <td className="px-4 py-3 text-sm">{getOutcomeBadge(metric.outcome)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{metric.callDurationSeconds ? `${Math.floor(metric.callDurationSeconds / 60)}m ${metric.callDurationSeconds % 60}s` : 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{renderStars(metric.qualityScore)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{Math.round(metric.completionRate * 100)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{metric.errorCount}</td>
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

export default CallMetricsTable;
