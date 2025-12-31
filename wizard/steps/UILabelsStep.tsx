import React from 'react';
import { useWizardContext } from '../DemoWizard';

export const UILabelsStep: React.FC = () => {
  const { config, updateUILabels } = useWizardContext();
  const labels = config.uiLabels;
  const businessName = config.businessProfile?.organizationName || 'Demo Clinic';
  const agentName = config.agentConfig?.agentName || 'Agent';

  const handleChange = (field: string, value: string) => {
    updateUILabels({ [field]: value } as any);
  };

  // Auto-populate from other config if empty
  const getDefaultValue = (field: string): string => {
    switch (field) {
      case 'headerText':
        return businessName;
      case 'agentSpeakerLabel':
        return `Agent (${agentName})`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          UI Labels
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize the text displayed in the demo interface.
        </p>
      </div>

      {/* Header Section */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Header & Navigation
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Header Text
            </label>
            <input
              type="text"
              value={labels?.headerText || ''}
              onChange={(e) => handleChange('headerText', e.target.value)}
              placeholder={getDefaultValue('headerText')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Header Badge
            </label>
            <input
              type="text"
              value={labels?.headerBadge || ''}
              onChange={(e) => handleChange('headerBadge', e.target.value)}
              placeholder="(Enhanced)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Badge Text (Status Bar)
          </label>
          <input
            type="text"
            value={labels?.badgeText || ''}
            onChange={(e) => handleChange('badgeText', e.target.value)}
            placeholder="VOICE AI DEMO"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Hero Section */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Hero Section
        </h3>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Hero Title
          </label>
          <input
            type="text"
            value={labels?.heroTitle || ''}
            onChange={(e) => handleChange('heroTitle', e.target.value)}
            placeholder="Proactive care for every family"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Hero Subtitle (optional)
          </label>
          <input
            type="text"
            value={labels?.heroSubtitle || ''}
            onChange={(e) => handleChange('heroSubtitle', e.target.value)}
            placeholder="Experience our AI-powered scheduling assistant"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Transcript Labels */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Transcript Labels
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              User/Caller Label
            </label>
            <input
              type="text"
              value={labels?.userSpeakerLabel || ''}
              onChange={(e) => handleChange('userSpeakerLabel', e.target.value)}
              placeholder="Caller"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Agent Label
            </label>
            <input
              type="text"
              value={labels?.agentSpeakerLabel || ''}
              onChange={(e) => handleChange('agentSpeakerLabel', e.target.value)}
              placeholder={getDefaultValue('agentSpeakerLabel')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Button Labels */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Button Labels
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Start Call Button
            </label>
            <input
              type="text"
              value={labels?.callButtonText || ''}
              onChange={(e) => handleChange('callButtonText', e.target.value)}
              placeholder="Start Demo Call"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              End Call Button
            </label>
            <input
              type="text"
              value={labels?.endCallButtonText || ''}
              onChange={(e) => handleChange('endCallButtonText', e.target.value)}
              placeholder="End Call"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Footer
        </h3>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Footer Text
          </label>
          <input
            type="text"
            value={labels?.footerText || ''}
            onChange={(e) => handleChange('footerText', e.target.value)}
            placeholder="Enhanced Demo"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default UILabelsStep;
