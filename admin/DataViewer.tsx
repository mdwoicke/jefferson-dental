/**
 * Data Viewer Component
 * Main admin dashboard with tab navigation for all data tables
 */

import React, { useState } from 'react';
import { ConversationsTable } from './ConversationsTable';
import { AppointmentDataTable } from './AppointmentDataTable';
import { FunctionCallsTable } from './FunctionCallsTable';
import { CallMetricsTable } from './CallMetricsTable';
import { TestScenariosTable } from './TestScenariosTable';
import { SkillExecutionTable } from './SkillExecutionTable';
import { ConversationDetailModal } from './ConversationDetailModal';

type TabId = 'conversations' | 'appointments' | 'function-calls' | 'call-metrics' | 'test-scenarios' | 'skill-logs';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'conversations',
    label: 'Conversations',
    icon: '💬',
    description: 'View all conversation history with drill-down capability'
  },
  {
    id: 'appointments',
    label: 'Appointments',
    icon: '📅',
    description: 'All booked appointments with patient and child details'
  },
  {
    id: 'function-calls',
    label: 'Function Calls',
    icon: '⚙️',
    description: 'Function call logs with arguments and results'
  },
  {
    id: 'call-metrics',
    label: 'Call Metrics',
    icon: '📊',
    description: 'Call quality metrics and analytics'
  },
  {
    id: 'test-scenarios',
    label: 'Test Scenarios',
    icon: '🧪',
    description: 'Test case management and execution results'
  },
  {
    id: 'skill-logs',
    label: 'Skill Execution',
    icon: '🔧',
    description: 'Multi-step skill workflow tracking'
  }
];

export const DataViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('conversations');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedConversationId(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'conversations':
        return <ConversationsTable onViewDetails={handleViewConversation} />;
      case 'appointments':
        return <AppointmentDataTable />;
      case 'function-calls':
        return <FunctionCallsTable />;
      case 'call-metrics':
        return <CallMetricsTable />;
      case 'test-scenarios':
        return <TestScenariosTable />;
      case 'skill-logs':
        return <SkillExecutionTable />;
      default:
        return <div>Tab not found</div>;
    }
  };

  const activeTabData = TABS.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Data Viewer</h1>
        <p className="text-gray-600">
          Comprehensive analytics and verification dashboard for the voice agent
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg p-2">
          <div className="flex flex-wrap gap-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Tab Description */}
        {activeTabData && (
          <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-700">{activeTabData.description}</p>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto">
        <div className="transition-all duration-300 ease-in-out">
          {renderTabContent()}
        </div>
      </div>

      {/* Conversation Detail Modal */}
      <ConversationDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        conversationId={selectedConversationId}
      />
    </div>
  );
};

export default DataViewer;
