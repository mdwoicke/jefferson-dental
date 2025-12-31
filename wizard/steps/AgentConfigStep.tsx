import React from 'react';
import { useWizardContext } from '../DemoWizard';
import type { VoiceName } from '../../types/demo-config';

const VOICE_OPTIONS: { value: VoiceName; label: string; provider: string }[] = [
  { value: 'alloy', label: 'Alloy', provider: 'OpenAI' },
  { value: 'echo', label: 'Echo', provider: 'OpenAI' },
  { value: 'fable', label: 'Fable', provider: 'OpenAI' },
  { value: 'onyx', label: 'Onyx', provider: 'OpenAI' },
  { value: 'nova', label: 'Nova', provider: 'OpenAI' },
  { value: 'shimmer', label: 'Shimmer', provider: 'OpenAI' },
  { value: 'Zephyr', label: 'Zephyr', provider: 'Gemini' },
  { value: 'Puck', label: 'Puck', provider: 'Gemini' },
  { value: 'Charon', label: 'Charon', provider: 'Gemini' },
  { value: 'Kore', label: 'Kore', provider: 'Gemini' },
  { value: 'Fenrir', label: 'Fenrir', provider: 'Gemini' },
  { value: 'Aoede', label: 'Aoede', provider: 'Gemini' },
];

export const AgentConfigStep: React.FC = () => {
  const { config, updateAgentConfig, validationErrors } = useWizardContext();
  const agent = config.agentConfig;

  const handleChange = (field: string, value: any) => {
    updateAgentConfig({ [field]: value } as any);
  };

  const handleObjectionAdd = () => {
    const current = agent?.objectionHandling || [];
    updateAgentConfig({
      objectionHandling: [...current, { objection: '', response: '' }]
    });
  };

  const handleObjectionChange = (index: number, field: 'objection' | 'response', value: string) => {
    const current = [...(agent?.objectionHandling || [])];
    current[index] = { ...current[index], [field]: value };
    updateAgentConfig({ objectionHandling: current });
  };

  const handleObjectionRemove = (index: number) => {
    const current = [...(agent?.objectionHandling || [])];
    current.splice(index, 1);
    updateAgentConfig({ objectionHandling: current });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Agent Configuration
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure the AI agent's identity, voice, and behavior.
        </p>
      </div>

      {/* Agent Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Agent Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={agent?.agentName || ''}
          onChange={(e) => handleChange('agentName', e.target.value)}
          placeholder="e.g., Sophia"
          className={`w-full px-4 py-2 border rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     ${validationErrors.agentName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {validationErrors.agentName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.agentName[0]}</p>
        )}
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Voice
        </label>
        <select
          value={agent?.voiceName || 'alloy'}
          onChange={(e) => handleChange('voiceName', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <optgroup label="OpenAI Voices">
            {VOICE_OPTIONS.filter(v => v.provider === 'OpenAI').map(voice => (
              <option key={voice.value} value={voice.value}>{voice.label}</option>
            ))}
          </optgroup>
          <optgroup label="Gemini Voices">
            {VOICE_OPTIONS.filter(v => v.provider === 'Gemini').map(voice => (
              <option key={voice.value} value={voice.value}>{voice.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Personality Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Personality Description
        </label>
        <textarea
          value={agent?.personalityDescription || ''}
          onChange={(e) => handleChange('personalityDescription', e.target.value)}
          placeholder="Describe the agent's personality and tone, e.g., 'Warm, professional, and helpful. Speaks clearly and patiently.'"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          System Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={agent?.systemPrompt || ''}
          onChange={(e) => handleChange('systemPrompt', e.target.value)}
          placeholder={`Enter the full system prompt for the AI agent...

Example:
You are {{agentName}}, an outreach agent for {{organizationName}}. Your role is to help schedule appointments for patients.

Key behaviors:
- Be warm and professional
- Answer questions clearly
- Help schedule appointments
- Address concerns patiently`}
          rows={10}
          className={`w-full px-4 py-2 border rounded-lg font-mono text-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y
                     ${validationErrors.systemPrompt ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {validationErrors.systemPrompt && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.systemPrompt[0]}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Use {'{{variableName}}'} syntax for dynamic values like {'{{agentName}}'}, {'{{organizationName}}'}, {'{{phoneNumber}}'}
        </p>
      </div>

      {/* Opening Script */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Opening Script
        </label>
        <textarea
          value={agent?.openingScript || ''}
          onChange={(e) => handleChange('openingScript', e.target.value)}
          placeholder="Hello! This is {{agentName}} calling from {{organizationName}}..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Objection Handling */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Objection Handling
          </label>
          <button
            onClick={handleObjectionAdd}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Objection
          </button>
        </div>

        {(agent?.objectionHandling || []).map((item, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Objection #{index + 1}
              </span>
              <button
                onClick={() => handleObjectionRemove(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Customer says...
              </label>
              <input
                type="text"
                value={item.objection}
                onChange={(e) => handleObjectionChange(index, 'objection', e.target.value)}
                placeholder='e.g., "Is this a scam?"'
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Agent responds...
              </label>
              <textarea
                value={item.response}
                onChange={(e) => handleObjectionChange(index, 'response', e.target.value)}
                placeholder="I completely understand your concern..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        ))}

        {(agent?.objectionHandling || []).length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No objection handling configured. Add common objections and responses.
          </p>
        )}
      </div>
    </div>
  );
};

export default AgentConfigStep;
