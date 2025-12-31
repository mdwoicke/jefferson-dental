import React, { useState } from 'react';
import { useWizardContext } from '../DemoWizard';
import { PREDEFINED_TOOLS, PredefinedToolName, ToolConfig } from '../../types/demo-config';

export const ToolsConfigStep: React.FC = () => {
  const { config, toggleTool, setToolConfigs } = useWizardContext();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTool, setCustomTool] = useState<Partial<ToolConfig>>({
    toolName: '',
    displayName: '',
    description: '',
    toolType: 'custom',
    isEnabled: true,
    parametersSchema: { type: 'object', properties: {}, required: [] },
    mockResponseTemplate: '{}',
    mockResponseDelayMs: 300
  });

  const toolConfigs = config.toolConfigs || [];

  const isToolEnabled = (toolName: string): boolean => {
    const existing = toolConfigs.find(t => t.toolName === toolName);
    return existing?.isEnabled ?? false;
  };

  const handleSaveCustomTool = () => {
    if (!customTool.toolName || !customTool.displayName) return;

    const newTool: ToolConfig = {
      id: `TC-${Date.now()}`,
      demoConfigId: '',
      toolName: customTool.toolName!,
      displayName: customTool.displayName!,
      description: customTool.description || '',
      toolType: 'custom',
      isEnabled: true,
      parametersSchema: customTool.parametersSchema || { type: 'object', properties: {}, required: [] },
      mockResponseTemplate: customTool.mockResponseTemplate,
      mockResponseDelayMs: customTool.mockResponseDelayMs || 300
    };

    setToolConfigs([...toolConfigs, newTool]);
    setShowCustomForm(false);
    setCustomTool({
      toolName: '',
      displayName: '',
      description: '',
      toolType: 'custom',
      isEnabled: true,
      parametersSchema: { type: 'object', properties: {}, required: [] },
      mockResponseTemplate: '{}',
      mockResponseDelayMs: 300
    });
  };

  const handleRemoveCustomTool = (toolName: string) => {
    setToolConfigs(toolConfigs.filter(t => t.toolName !== toolName));
  };

  const predefinedToolNames = Object.keys(PREDEFINED_TOOLS) as PredefinedToolName[];
  const customTools = toolConfigs.filter(t => t.toolType === 'custom');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tool Configuration
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select which tools the AI agent can use during calls.
        </p>
      </div>

      {/* Predefined Tools */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Predefined Tools
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {predefinedToolNames.map(toolName => {
            const tool = PREDEFINED_TOOLS[toolName];
            const enabled = isToolEnabled(toolName);

            return (
              <label
                key={toolName}
                className={`
                  flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors
                  ${enabled
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggleTool(toolName, e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {tool.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tool.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Custom Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Tools
          </h3>
          <button
            onClick={() => setShowCustomForm(true)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Custom Tool
          </button>
        </div>

        {customTools.length > 0 ? (
          <div className="space-y-2">
            {customTools.map(tool => (
              <div
                key={tool.toolName}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {tool.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {tool.toolName}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCustomTool(tool.toolName)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No custom tools defined.
          </p>
        )}
      </div>

      {/* Custom Tool Form Modal */}
      {showCustomForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Custom Tool
              </h3>
              <button
                onClick={() => setShowCustomForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tool Name (snake_case)
                </label>
                <input
                  type="text"
                  value={customTool.toolName}
                  onChange={(e) => setCustomTool({ ...customTool, toolName: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., send_invoice"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={customTool.displayName}
                  onChange={(e) => setCustomTool({ ...customTool, displayName: e.target.value })}
                  placeholder="e.g., Send Invoice"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={customTool.description}
                  onChange={(e) => setCustomTool({ ...customTool, description: e.target.value })}
                  placeholder="Describe what this tool does..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mock Response (JSON)
                </label>
                <textarea
                  value={customTool.mockResponseTemplate}
                  onChange={(e) => setCustomTool({ ...customTool, mockResponseTemplate: e.target.value })}
                  placeholder='{"success": true, "message": "Action completed"}'
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowCustomForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomTool}
                disabled={!customTool.toolName || !customTool.displayName}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsConfigStep;
