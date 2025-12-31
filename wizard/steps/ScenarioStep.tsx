import React from 'react';
import { useWizardContext } from '../DemoWizard';

export const ScenarioStep: React.FC = () => {
  const { config, updateScenario, validationErrors } = useWizardContext();
  const scenario = config.scenario;

  const handleChange = (field: string, value: any) => {
    updateScenario({ [field]: value } as any);
  };

  const handlePatientDataChange = (field: string, value: any) => {
    updateScenario({
      demoPatientData: {
        ...scenario?.demoPatientData,
        [field]: value
      }
    } as any);
  };

  const handleChildAdd = () => {
    const current = scenario?.demoPatientData?.children || [];
    updateScenario({
      demoPatientData: {
        ...scenario?.demoPatientData,
        children: [...current, { name: '', age: 0 }]
      }
    } as any);
  };

  const handleChildChange = (index: number, field: string, value: any) => {
    const current = [...(scenario?.demoPatientData?.children || [])];
    current[index] = { ...current[index], [field]: value };
    updateScenario({
      demoPatientData: {
        ...scenario?.demoPatientData,
        children: current
      }
    } as any);
  };

  const handleChildRemove = (index: number) => {
    const current = [...(scenario?.demoPatientData?.children || [])];
    current.splice(index, 1);
    updateScenario({
      demoPatientData: {
        ...scenario?.demoPatientData,
        children: current
      }
    } as any);
  };

  const handleTalkingPointAdd = () => {
    const current = scenario?.keyTalkingPoints || [];
    updateScenario({ keyTalkingPoints: [...current, ''] });
  };

  const handleTalkingPointChange = (index: number, value: string) => {
    const current = [...(scenario?.keyTalkingPoints || [])];
    current[index] = value;
    updateScenario({ keyTalkingPoints: current });
  };

  const handleTalkingPointRemove = (index: number) => {
    const current = [...(scenario?.keyTalkingPoints || [])];
    current.splice(index, 1);
    updateScenario({ keyTalkingPoints: current });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Call Scenario
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define the call scenario and demo patient data.
        </p>
      </div>

      {/* Call Direction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Call Direction
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="callDirection"
              value="outbound"
              checked={scenario?.callDirection === 'outbound'}
              onChange={() => handleChange('callDirection', 'outbound')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Outbound</span>
            <span className="text-xs text-gray-500">(Agent calls customer)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="callDirection"
              value="inbound"
              checked={scenario?.callDirection === 'inbound'}
              onChange={() => handleChange('callDirection', 'inbound')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Inbound</span>
            <span className="text-xs text-gray-500">(Customer calls agent)</span>
          </label>
        </div>
      </div>

      {/* Use Case */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Use Case <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={scenario?.useCase || ''}
          onChange={(e) => handleChange('useCase', e.target.value)}
          placeholder="e.g., Medicaid Dental Outreach, Appointment Scheduling, Follow-up Calls"
          className={`w-full px-4 py-2 border rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     ${validationErrors.useCase ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {validationErrors.useCase && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.useCase[0]}</p>
        )}
      </div>

      {/* Target Audience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Target Audience
        </label>
        <input
          type="text"
          value={scenario?.targetAudience || ''}
          onChange={(e) => handleChange('targetAudience', e.target.value)}
          placeholder="e.g., Parents with children on Medicaid"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Demo Patient Data */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Demo Patient Data
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Parent/Guardian Name
            </label>
            <input
              type="text"
              value={scenario?.demoPatientData?.parentName || ''}
              onChange={(e) => handlePatientDataChange('parentName', e.target.value)}
              placeholder="e.g., Maria Johnson"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={scenario?.demoPatientData?.phoneNumber || ''}
              onChange={(e) => handlePatientDataChange('phoneNumber', e.target.value)}
              placeholder="e.g., 512-555-1234"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Children */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Children
            </label>
            <button
              onClick={handleChildAdd}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Child
            </button>
          </div>

          {(scenario?.demoPatientData?.children || []).map((child, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="text"
                value={child.name}
                onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                placeholder="Child name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={child.age || ''}
                onChange={(e) => handleChildChange(index, 'age', parseInt(e.target.value) || 0)}
                placeholder="Age"
                min="0"
                max="18"
                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleChildRemove(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Key Talking Points */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Key Talking Points
          </label>
          <button
            onClick={handleTalkingPointAdd}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Point
          </button>
        </div>

        {(scenario?.keyTalkingPoints || []).map((point, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
            <input
              type="text"
              value={point}
              onChange={(e) => handleTalkingPointChange(index, e.target.value)}
              placeholder="Enter a key talking point..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => handleTalkingPointRemove(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScenarioStep;
