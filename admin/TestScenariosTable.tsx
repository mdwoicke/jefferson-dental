/**
 * Test Scenarios Table Component
 * Displays and manages test scenarios
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { TestScenario } from '../database/db-interface';
import { DataExportButton } from '../components/DataExportButton';

export const TestScenariosTable: React.FC = () => {
  const { testingService, isInitialized } = useDatabase();
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isInitialized && testingService) {
      loadScenarios();
    }
  }, [isInitialized, testingService]);

  const loadScenarios = async () => {
    if (!testingService) return;

    setLoading(true);
    try {
      const data = await testingService.listAllScenarios(1000);
      setScenarios(data);
      console.log(`✅ Loaded ${data.length} test scenarios`);
    } catch (error) {
      console.error('Error loading test scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenarios = scenarios.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const styles = { active: 'bg-green-100 text-green-800', deprecated: 'bg-gray-200 text-gray-700', draft: 'bg-yellow-100 text-yellow-800' };
    const style = styles[status as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{status}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const styles = { functional: 'bg-blue-100 text-blue-800', 'edge-case': 'bg-purple-100 text-purple-800', regression: 'bg-orange-100 text-orange-800', performance: 'bg-pink-100 text-pink-800' };
    const style = styles[category as keyof typeof styles] || 'bg-gray-200 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{category.replace('-', ' ')}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="text-gray-500">Loading test scenarios...</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input type="text" placeholder="Search scenarios..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <DataExportButton data={filteredScenarios} filename="test-scenarios" format="csv" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4"><div className="text-sm text-gray-600">Total</div><div className="text-2xl font-bold text-gray-800">{scenarios.length}</div></div>
        <div className="bg-green-50 rounded-lg p-4"><div className="text-sm text-gray-600">Active</div><div className="text-2xl font-bold text-green-700">{scenarios.filter(s => s.status === 'active').length}</div></div>
        <div className="bg-yellow-50 rounded-lg p-4"><div className="text-sm text-gray-600">Draft</div><div className="text-2xl font-bold text-yellow-700">{scenarios.filter(s => s.status === 'draft').length}</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-sm text-gray-600">Deprecated</div><div className="text-2xl font-bold text-gray-700">{scenarios.filter(s => s.status === 'deprecated').length}</div></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredScenarios.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{searchQuery ? 'No scenarios match your search' : 'No scenarios found'}</td></tr>
              ) : (
                filteredScenarios.map((scenario) => (
                  <tr key={scenario.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><div className="text-sm font-medium text-gray-900">{scenario.name}</div>{scenario.description && <div className="text-xs text-gray-500 mt-1">{scenario.description.substring(0, 60)}{scenario.description.length > 60 ? '...' : ''}</div>}</td>
                    <td className="px-4 py-3 text-sm">{getCategoryBadge(scenario.category)}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(scenario.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(scenario.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(scenario.updatedAt).toLocaleDateString()}</td>
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

export default TestScenariosTable;
