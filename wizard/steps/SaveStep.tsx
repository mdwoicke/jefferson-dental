import React, { useState } from 'react';
import { useWizardContext } from '../DemoWizard';
import { generateSlug } from '../../types/demo-config';

interface SaveStepProps {
  onSave: (setAsActive: boolean) => Promise<void>;
}

export const SaveStep: React.FC<SaveStepProps> = ({ onSave }) => {
  const { config, updateConfig, validationErrors, validateCurrentStep } = useWizardContext();

  const [isSaving, setIsSaving] = useState(false);
  const [setAsActive, setSetAsActive] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleNameChange = (name: string) => {
    updateConfig({
      name,
      slug: generateSlug(name)
    });
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(setAsActive);
    } catch (error: any) {
      console.error('Save error:', error);
      setSaveError(error.message || 'Failed to save demo configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate summary stats
  const stats = {
    tools: (config.toolConfigs || []).filter(t => t.isEnabled).length,
    smsTemplates: (config.smsTemplates || []).length,
    objections: (config.agentConfig?.objectionHandling || []).length,
    children: (config.scenario?.demoPatientData?.children || []).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Save Demo Configuration
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Give your demo a name and save it to your library.
        </p>
      </div>

      {/* Demo Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Demo Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Jefferson Dental - Medicaid Outreach"
          className={`w-full px-4 py-2 border rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     ${validationErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {validationErrors.name && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.name[0]}</p>
        )}
        {config.slug && (
          <p className="mt-1 text-xs text-gray-500">
            URL slug: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{config.slug}</code>
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (optional)
        </label>
        <textarea
          value={config.description || ''}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Brief description of this demo..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Configuration Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Configuration Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.tools}</div>
            <div className="text-xs text-gray-500">Tools Enabled</div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.smsTemplates}</div>
            <div className="text-xs text-gray-500">SMS Templates</div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.objections}</div>
            <div className="text-xs text-gray-500">Objection Handlers</div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.children}</div>
            <div className="text-xs text-gray-500">Demo Children</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Organization:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {config.businessProfile?.organizationName || '-'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Agent:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {config.agentConfig?.agentName || '-'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Voice:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {config.agentConfig?.voiceName || '-'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Call Direction:</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">
              {config.scenario?.callDirection || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Set as Active */}
      <label className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer">
        <input
          type="checkbox"
          checked={setAsActive}
          onChange={(e) => setSetAsActive(e.target.checked)}
          className="w-5 h-5 text-blue-600 rounded"
        />
        <div>
          <span className="font-medium text-gray-900 dark:text-white">
            Set as active demo
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This demo will be loaded when you open the application
          </p>
        </div>
      </label>

      {/* Error Message */}
      {saveError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Save Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {saveError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !config.name}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg
                     hover:from-blue-700 hover:to-indigo-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 font-medium"
        >
          {isSaving ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Demo
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SaveStep;
