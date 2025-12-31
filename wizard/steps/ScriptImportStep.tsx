import React, { useState } from 'react';
import { useWizardContext } from '../DemoWizard';

export const ScriptImportStep: React.FC = () => {
  const {
    rawScript,
    setRawScript,
    isAiParsing,
    aiParseError,
    setAiParsing,
    applyParsedConfig,
    goNext
  } = useWizardContext();

  const [localScript, setLocalScript] = useState(rawScript || '');

  const handleParseWithAI = async () => {
    if (!localScript.trim()) {
      return;
    }

    setRawScript(localScript);
    setAiParsing(true);

    try {
      // Import the parser dynamically to avoid loading OpenAI unless needed
      const { DemoConfigParser } = await import('../../services/demo-config-parser');

      const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY ||
                     (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '');

      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.');
      }

      const parser = new DemoConfigParser(apiKey);
      const result = await parser.parseCallScript(localScript);

      if (result.success) {
        applyParsedConfig(result.extractedConfig);
        setAiParsing(false);

        // Show success and warnings
        if (result.warnings.length > 0) {
          console.warn('AI parsing warnings:', result.warnings);
        }

        // Move to next step
        goNext();
      } else {
        throw new Error('Failed to parse script');
      }
    } catch (error: any) {
      console.error('AI parsing error:', error);
      setAiParsing(false, error.message || 'Failed to parse script');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setLocalScript(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Import Call Script (Optional)
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste a sample call script and our AI will extract the configuration automatically.
          You can also skip this step and configure everything manually.
        </p>
      </div>

      {/* Script Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Call Script
          </label>
          <label className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
            <input
              type="file"
              accept=".txt,.md,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            Upload file
          </label>
        </div>

        <textarea
          value={localScript}
          onChange={(e) => setLocalScript(e.target.value)}
          placeholder={`Paste your call script here...

Example:
"Hello, this is Sarah from ABC Medical Center. I'm calling to schedule your annual checkup. We have appointments available next week on Tuesday and Thursday afternoons. Would either of those work for you?"

Include any:
- Business name and contact info
- Agent name and personality
- Opening/closing scripts
- Objection handling
- Available services
- Scheduling logic`}
          className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     resize-none font-mono text-sm"
          disabled={isAiParsing}
        />
      </div>

      {/* Error Message */}
      {aiParseError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Parsing Error
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {aiParseError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleParseWithAI}
          disabled={!localScript.trim() || isAiParsing}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg
                     hover:from-purple-700 hover:to-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 font-medium"
        >
          {isAiParsing ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Parsing with AI...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Parse with AI
            </>
          )}
        </button>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          or skip to configure manually
        </span>
      </div>

      {/* Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Tips for better results
        </h4>
        <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Include the full call script with agent dialogue</li>
          <li>Mention the business name, address, and phone number</li>
          <li>Include any objection handling responses</li>
          <li>Describe what actions the agent should be able to take</li>
        </ul>
      </div>
    </div>
  );
};

export default ScriptImportStep;
