import { useState, useCallback, useEffect } from 'react';
import {
  WizardStep,
  WizardState,
  DemoConfig,
  createEmptyDemoConfig,
  generateSlug,
  PREDEFINED_TOOLS,
  PredefinedToolName
} from '../../types/demo-config';

const WIZARD_STEPS: WizardStep[] = [
  'script-import',
  'business-profile',
  'agent-config',
  'scenario',
  'tools',
  'sms-templates',
  'ui-labels',
  'preview',
  'save'
];

const STEP_LABELS: Record<WizardStep, string> = {
  'script-import': 'Import Script',
  'business-profile': 'Business Profile',
  'agent-config': 'AI Agent',
  'scenario': 'Scenario',
  'tools': 'Tools',
  'sms-templates': 'SMS Templates',
  'ui-labels': 'UI Labels',
  'preview': 'Preview',
  'save': 'Save'
};

const LOCAL_STORAGE_KEY = 'demo-wizard-draft';

interface UseDemoWizardOptions {
  existingConfig?: DemoConfig;
  onComplete?: (configId: string) => void;
  onCancel?: () => void;
}

export function useDemoWizard(options: UseDemoWizardOptions = {}) {
  const { existingConfig, onComplete, onCancel } = options;

  const [state, setState] = useState<WizardState>(() => {
    // Try to restore from localStorage if no existing config
    if (!existingConfig) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            isAiParsing: false,
            aiParseError: undefined
          };
        } catch (e) {
          console.warn('Failed to restore wizard draft:', e);
        }
      }
    }

    return {
      currentStep: 'script-import',
      isAiParsing: false,
      aiParseError: undefined,
      rawScript: undefined,
      demoConfig: existingConfig || createEmptyDemoConfig(),
      validationErrors: {},
      isDirty: false
    };
  });

  // Auto-save to localStorage when state changes
  useEffect(() => {
    if (state.isDirty) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        currentStep: state.currentStep,
        rawScript: state.rawScript,
        demoConfig: state.demoConfig,
        validationErrors: state.validationErrors,
        isDirty: state.isDirty
      }));
    }
  }, [state]);

  // Clear draft on complete
  const clearDraft = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  // Navigation
  const currentStepIndex = WIZARD_STEPS.indexOf(state.currentStep);

  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step
    }));
  }, []);

  const goNext = useCallback(() => {
    if (canGoNext) {
      setState(prev => ({
        ...prev,
        currentStep: WIZARD_STEPS[currentStepIndex + 1]
      }));
    }
  }, [canGoNext, currentStepIndex]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      setState(prev => ({
        ...prev,
        currentStep: WIZARD_STEPS[currentStepIndex - 1]
      }));
    }
  }, [canGoBack, currentStepIndex]);

  const skipStep = useCallback(() => {
    goNext();
  }, [goNext]);

  // Config updates
  const updateConfig = useCallback((updates: Partial<DemoConfig>) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        ...updates
      },
      isDirty: true
    }));
  }, []);

  const updateBusinessProfile = useCallback((updates: Partial<DemoConfig['businessProfile']>) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        businessProfile: {
          ...prev.demoConfig.businessProfile!,
          ...updates
        }
      },
      isDirty: true
    }));
  }, []);

  const updateAgentConfig = useCallback((updates: Partial<DemoConfig['agentConfig']>) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        agentConfig: {
          ...prev.demoConfig.agentConfig!,
          ...updates
        }
      },
      isDirty: true
    }));
  }, []);

  const updateScenario = useCallback((updates: Partial<DemoConfig['scenario']>) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        scenario: {
          ...prev.demoConfig.scenario!,
          ...updates
        }
      },
      isDirty: true
    }));
  }, []);

  const updateUILabels = useCallback((updates: Partial<DemoConfig['uiLabels']>) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        uiLabels: {
          ...prev.demoConfig.uiLabels!,
          ...updates
        }
      },
      isDirty: true
    }));
  }, []);

  const setToolConfigs = useCallback((toolConfigs: DemoConfig['toolConfigs']) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        toolConfigs
      },
      isDirty: true
    }));
  }, []);

  const toggleTool = useCallback((toolName: string, enabled: boolean) => {
    setState(prev => {
      const existing = prev.demoConfig.toolConfigs || [];
      const toolIndex = existing.findIndex(t => t.toolName === toolName);

      let newTools;
      if (toolIndex >= 0) {
        // Update existing
        newTools = [...existing];
        newTools[toolIndex] = { ...newTools[toolIndex], isEnabled: enabled };
      } else if (enabled && toolName in PREDEFINED_TOOLS) {
        // Add from predefined
        const predefined = PREDEFINED_TOOLS[toolName as PredefinedToolName];
        newTools = [...existing, {
          ...predefined,
          id: `TC-${Date.now()}`,
          demoConfigId: ''
        }];
      } else {
        newTools = existing;
      }

      return {
        ...prev,
        demoConfig: {
          ...prev.demoConfig,
          toolConfigs: newTools
        },
        isDirty: true
      };
    });
  }, []);

  const setSMSTemplates = useCallback((smsTemplates: DemoConfig['smsTemplates']) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        smsTemplates
      },
      isDirty: true
    }));
  }, []);

  // AI Parsing
  const setRawScript = useCallback((script: string) => {
    setState(prev => ({
      ...prev,
      rawScript: script,
      isDirty: true
    }));
  }, []);

  const setAiParsing = useCallback((isParsing: boolean, error?: string) => {
    setState(prev => ({
      ...prev,
      isAiParsing: isParsing,
      aiParseError: error
    }));
  }, []);

  const applyParsedConfig = useCallback((parsed: Partial<DemoConfig>) => {
    setState(prev => ({
      ...prev,
      demoConfig: {
        ...prev.demoConfig,
        ...parsed,
        // Merge nested objects
        businessProfile: {
          ...prev.demoConfig.businessProfile,
          ...parsed.businessProfile
        },
        agentConfig: {
          ...prev.demoConfig.agentConfig,
          ...parsed.agentConfig
        },
        scenario: {
          ...prev.demoConfig.scenario,
          ...parsed.scenario
        },
        uiLabels: {
          ...prev.demoConfig.uiLabels,
          ...parsed.uiLabels
        }
      },
      isDirty: true
    }));
  }, []);

  // Validation
  const validateCurrentStep = useCallback((): boolean => {
    const errors: Record<string, string[]> = {};
    const config = state.demoConfig;

    switch (state.currentStep) {
      case 'business-profile':
        if (!config.businessProfile?.organizationName) {
          errors.organizationName = ['Organization name is required'];
        }
        if (!config.businessProfile?.phoneNumber) {
          errors.phoneNumber = ['Phone number is required'];
        }
        break;

      case 'agent-config':
        if (!config.agentConfig?.agentName) {
          errors.agentName = ['Agent name is required'];
        }
        if (!config.agentConfig?.systemPrompt) {
          errors.systemPrompt = ['System prompt is required'];
        }
        break;

      case 'scenario':
        if (!config.scenario?.useCase) {
          errors.useCase = ['Use case is required'];
        }
        break;

      case 'save':
        if (!config.name) {
          errors.name = ['Demo name is required'];
        }
        break;
    }

    setState(prev => ({
      ...prev,
      validationErrors: errors
    }));

    return Object.keys(errors).length === 0;
  }, [state.currentStep, state.demoConfig]);

  // Generate slug from name
  const autoGenerateSlug = useCallback(() => {
    const name = state.demoConfig.name;
    if (name) {
      updateConfig({ slug: generateSlug(name) });
    }
  }, [state.demoConfig.name, updateConfig]);

  // Reset wizard
  const reset = useCallback(() => {
    clearDraft();
    setState({
      currentStep: 'script-import',
      isAiParsing: false,
      aiParseError: undefined,
      rawScript: undefined,
      demoConfig: createEmptyDemoConfig(),
      validationErrors: {},
      isDirty: false
    });
  }, [clearDraft]);

  // Handle complete
  const handleComplete = useCallback((configId: string) => {
    clearDraft();
    onComplete?.(configId);
  }, [clearDraft, onComplete]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (state.isDirty) {
      // Could prompt user here
    }
    onCancel?.();
  }, [state.isDirty, onCancel]);

  return {
    // State
    state,
    currentStep: state.currentStep,
    currentStepIndex,
    totalSteps: WIZARD_STEPS.length,
    stepLabel: STEP_LABELS[state.currentStep],
    allSteps: WIZARD_STEPS,
    stepLabels: STEP_LABELS,

    // Navigation
    canGoBack,
    canGoNext,
    isFirstStep,
    isLastStep,
    goToStep,
    goNext,
    goBack,
    skipStep,

    // Config
    config: state.demoConfig,
    updateConfig,
    updateBusinessProfile,
    updateAgentConfig,
    updateScenario,
    updateUILabels,
    setToolConfigs,
    toggleTool,
    setSMSTemplates,

    // AI Parsing
    rawScript: state.rawScript,
    setRawScript,
    isAiParsing: state.isAiParsing,
    aiParseError: state.aiParseError,
    setAiParsing,
    applyParsedConfig,

    // Validation
    validationErrors: state.validationErrors,
    validateCurrentStep,

    // Helpers
    autoGenerateSlug,
    isDirty: state.isDirty,

    // Actions
    reset,
    clearDraft,
    handleComplete,
    handleCancel
  };
}

export type UseDemoWizardReturn = ReturnType<typeof useDemoWizard>;
