import React, { useState } from 'react';
import { useWizardContext } from '../DemoWizard';
import { interpolateTemplate } from '../../types/demo-config';

type PreviewTab = 'prompt' | 'ui' | 'tools' | 'sms';

export const PreviewStep: React.FC = () => {
  const { config } = useWizardContext();
  const [activeTab, setActiveTab] = useState<PreviewTab>('prompt');

  // Create context for template interpolation
  const templateContext = {
    agentName: config.agentConfig?.agentName || 'Agent',
    organizationName: config.businessProfile?.organizationName || 'Organization',
    address: config.businessProfile?.address
      ? `${config.businessProfile.address.street}, ${config.businessProfile.address.city}, ${config.businessProfile.address.state} ${config.businessProfile.address.zip}`
      : '',
    phoneNumber: config.businessProfile?.phoneNumber || '',
    parentName: config.scenario?.demoPatientData?.parentName || 'Customer',
    childName: config.scenario?.demoPatientData?.children?.[0]?.name || 'Child',
    dateTime: 'January 15, 2025 at 2:00 PM',
    date: 'January 15, 2025',
    time: '2:00 PM'
  };

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'prompt', label: 'System Prompt' },
    { id: 'ui', label: 'UI Preview' },
    { id: 'tools', label: 'Tools' },
    { id: 'sms', label: 'SMS Templates' }
  ];

  const renderPromptPreview = () => {
    const interpolatedPrompt = interpolateTemplate(
      config.agentConfig?.systemPrompt || '',
      templateContext
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Generated System Prompt
          </h3>
          <span className="text-xs text-gray-500">
            {interpolatedPrompt.length} characters
          </span>
        </div>

        <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-96">
          <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono">
            {interpolatedPrompt || 'No system prompt configured'}
          </pre>
        </div>

        {config.agentConfig?.openingScript && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Opening Script
            </h4>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {interpolateTemplate(config.agentConfig.openingScript, templateContext)}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUIPreview = () => {
    const labels = config.uiLabels;
    const profile = config.businessProfile;

    return (
      <div className="space-y-4">
        {/* Mock Header */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: profile?.primaryColor || '#3B82F6' }}
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="font-bold">{labels?.headerText || profile?.organizationName || 'Demo'}</span>
              <span className="text-xs opacity-80">{labels?.headerBadge || '(Demo)'}</span>
            </div>
            <span className="text-xs px-2 py-1 bg-white/20 rounded">
              {labels?.badgeText || 'VOICE AI DEMO'}
            </span>
          </div>
        </div>

        {/* Mock Hero */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {labels?.heroTitle || 'Hero Title'}
          </h2>
          {labels?.heroSubtitle && (
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {labels.heroSubtitle}
            </p>
          )}

          <button
            className="mt-4 px-6 py-2 rounded-lg text-white"
            style={{ backgroundColor: profile?.primaryColor || '#3B82F6' }}
          >
            {labels?.callButtonText || 'Start Demo Call'}
          </button>
        </div>

        {/* Mock Transcript */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
            Transcript Preview
          </h4>

          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 w-24">
                {labels?.agentSpeakerLabel || 'Agent'}:
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Hello, this is {config.agentConfig?.agentName || 'the agent'} from {profile?.organizationName || 'our organization'}...
              </span>
            </div>

            <div className="flex gap-2">
              <span className="text-xs font-medium text-green-600 dark:text-green-400 w-24">
                {labels?.userSpeakerLabel || 'Caller'}:
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Hi, yes this is speaking...
              </span>
            </div>
          </div>
        </div>

        {/* Mock Footer */}
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {profile?.organizationName} - {labels?.footerText || 'Demo'}
          </span>
        </div>
      </div>
    );
  };

  const renderToolsPreview = () => {
    const tools = config.toolConfigs || [];
    const enabledTools = tools.filter(t => t.isEnabled);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enabled Tools ({enabledTools.length})
          </h3>
        </div>

        {enabledTools.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {enabledTools.map(tool => (
              <div
                key={tool.toolName}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {tool.displayName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tool.toolName}
                </div>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded ${
                  tool.toolType === 'custom'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {tool.toolType}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No tools enabled
          </p>
        )}
      </div>
    );
  };

  const renderSMSPreview = () => {
    const templates = config.smsTemplates || [];

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          SMS Templates ({templates.length})
        </h3>

        {templates.length > 0 ? (
          <div className="space-y-4">
            {templates.map(template => (
              <div
                key={template.templateType}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm capitalize">
                    {template.templateType}
                  </span>
                  <span className="text-xs text-gray-500">
                    From: {template.senderName}
                  </span>
                </div>

                {/* Phone mockup */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 max-w-xs">
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {interpolateTemplate(template.messageTemplate, templateContext)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No SMS templates configured
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Preview
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review your demo configuration before saving.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'prompt' && renderPromptPreview()}
        {activeTab === 'ui' && renderUIPreview()}
        {activeTab === 'tools' && renderToolsPreview()}
        {activeTab === 'sms' && renderSMSPreview()}
      </div>
    </div>
  );
};

export default PreviewStep;
