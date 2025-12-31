import React from 'react';
import { useWizardContext } from '../DemoWizard';
import type { WizardStep } from '../../types/demo-config';

export const WizardProgress: React.FC = () => {
  const { allSteps, currentStepIndex, stepLabels, goToStep } = useWizardContext();

  return (
    <div className="flex items-center justify-between">
      {allSteps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isUpcoming = index > currentStepIndex;

        return (
          <React.Fragment key={step}>
            {/* Step indicator */}
            <button
              onClick={() => isCompleted && goToStep(step)}
              disabled={!isCompleted}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                transition-colors duration-200
                ${isCompleted
                  ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                  : isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
              `}
              title={stepLabels[step]}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </button>

            {/* Connector line (except after last step) */}
            {index < allSteps.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-2
                  ${index < currentStepIndex
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const WizardProgressCompact: React.FC = () => {
  const { currentStepIndex, totalSteps, stepLabel } = useWizardContext();

  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {stepLabel}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default WizardProgress;
