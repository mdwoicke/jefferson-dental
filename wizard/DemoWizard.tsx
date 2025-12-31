import React, { createContext, useContext } from 'react';
import { useDemoWizard, UseDemoWizardReturn } from './hooks/useDemoWizard';
import { useDemoConfig } from '../contexts/DemoConfigContext';
import { WizardProgress } from './components/WizardProgress';
import { WizardNavigation } from './components/WizardNavigation';
import { ScriptImportStep } from './steps/ScriptImportStep';
import { BusinessProfileStep } from './steps/BusinessProfileStep';
import { AgentConfigStep } from './steps/AgentConfigStep';
import { ScenarioStep } from './steps/ScenarioStep';
import { ToolsConfigStep } from './steps/ToolsConfigStep';
import { SMSTemplatesStep } from './steps/SMSTemplatesStep';
import { UILabelsStep } from './steps/UILabelsStep';
import { PreviewStep } from './steps/PreviewStep';
import { SaveStep } from './steps/SaveStep';
import type { DemoConfig } from '../types/demo-config';

// Create context for wizard state
const WizardContext = createContext<UseDemoWizardReturn | null>(null);

export const useWizardContext = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizardContext must be used within DemoWizard');
  }
  return context;
};

interface DemoWizardProps {
  existingConfigId?: string;
  onComplete?: (configId: string) => void;
  onCancel?: () => void;
}

export const DemoWizard: React.FC<DemoWizardProps> = ({
  existingConfigId,
  onComplete,
  onCancel
}) => {
  const { allConfigs, createConfig, updateConfig } = useDemoConfig();

  // Find existing config if editing
  const existingConfig = existingConfigId
    ? allConfigs.find(c => c.id === existingConfigId)
    : undefined;

  const wizard = useDemoWizard({
    existingConfig,
    onComplete,
    onCancel
  });

  const handleSave = async (setAsActive: boolean) => {
    try {
      let configId: string;

      if (existingConfigId) {
        // Update existing
        await updateConfig(existingConfigId, {
          ...wizard.config,
          isActive: setAsActive
        });
        configId = existingConfigId;
      } else {
        // Create new
        configId = await createConfig({
          ...wizard.config,
          isActive: setAsActive
        });
      }

      wizard.handleComplete(configId);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  };

  const renderCurrentStep = () => {
    switch (wizard.currentStep) {
      case 'script-import':
        return <ScriptImportStep />;
      case 'business-profile':
        return <BusinessProfileStep />;
      case 'agent-config':
        return <AgentConfigStep />;
      case 'scenario':
        return <ScenarioStep />;
      case 'tools':
        return <ToolsConfigStep />;
      case 'sms-templates':
        return <SMSTemplatesStep />;
      case 'ui-labels':
        return <UILabelsStep />;
      case 'preview':
        return <PreviewStep />;
      case 'save':
        return <SaveStep onSave={handleSave} />;
      default:
        return null;
    }
  };

  return (
    <WizardContext.Provider value={wizard}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {existingConfigId ? 'Edit Demo' : 'Create New Demo'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {wizard.stepLabel} ({wizard.currentStepIndex + 1} of {wizard.totalSteps})
                </p>
              </div>
              <button
                onClick={wizard.handleCancel}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <WizardProgress />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              {renderCurrentStep()}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <WizardNavigation />
          </div>
        </div>

        {/* Bottom spacing for fixed nav */}
        <div className="h-20" />
      </div>
    </WizardContext.Provider>
  );
};

export default DemoWizard;
