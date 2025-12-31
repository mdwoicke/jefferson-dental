import React from 'react';
import { useWizardContext } from '../DemoWizard';

export const WizardNavigation: React.FC = () => {
  const {
    canGoBack,
    canGoNext,
    isFirstStep,
    isLastStep,
    goBack,
    goNext,
    skipStep,
    currentStep,
    validateCurrentStep,
    handleCancel
  } = useWizardContext();

  const handleNext = () => {
    // Validate before proceeding (skip validation for optional steps)
    const optionalSteps = ['script-import', 'sms-templates'];
    if (!optionalSteps.includes(currentStep)) {
      if (!validateCurrentStep()) {
        return;
      }
    }
    goNext();
  };

  const handleSkip = () => {
    skipStep();
  };

  // Determine if current step is skippable
  const isSkippable = currentStep === 'script-import';

  return (
    <div className="flex items-center justify-between">
      {/* Left side - Back/Cancel */}
      <div>
        {canGoBack ? (
          <button
            onClick={goBack}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Right side - Skip/Next */}
      <div className="flex items-center gap-3">
        {isSkippable && (
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Skip
          </button>
        )}

        {!isLastStep && (
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardNavigation;
