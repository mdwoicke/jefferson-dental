import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useDemoConfig } from '../contexts/DemoConfigContext';
import type { DemoConfig, BusinessProfile, AgentConfig, ScenarioConfig, UILabels, VoiceName, ToolConfig, PredefinedToolName } from '../types/demo-config';
import { interpolateTemplate, PREDEFINED_TOOLS } from '../types/demo-config';

type TabType = 'general' | 'business' | 'agent' | 'scenario' | 'tools' | 'sms' | 'ui';

// Expanded textarea modal component
interface ExpandedTextareaModalProps {
  isOpen: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const ExpandedTextareaModal: React.FC<ExpandedTextareaModalProps> = ({
  isOpen,
  title,
  value,
  onChange,
  onClose,
  placeholder,
  required,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            {error && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                {error}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full h-full min-h-[400px] px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm resize-none dark:bg-slate-700 dark:text-white ${
              error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            }`}
            placeholder={placeholder}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {value.length} characters
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Expandable textarea wrapper component
interface ExpandableTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
  error,
  helperText,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Expand editor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Expand
          </button>
        </div>
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-700 dark:text-white ${
              error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
            } ${className}`}
            rows={rows}
            placeholder={placeholder}
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        {helperText && !error && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>}
      </div>

      <ExpandedTextareaModal
        isOpen={isExpanded}
        title={label}
        value={value}
        onChange={onChange}
        onClose={() => setIsExpanded(false)}
        placeholder={placeholder}
        required={required}
        error={error}
      />
    </>
  );
};

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

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
];

export const DemoEditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isInitialized } = useDatabase();
  const { refreshConfigs, demoConfigService } = useDemoConfig();

  const isEditMode = !!id && id !== 'new';

  console.log('DemoEditForm: Rendering', { id, isEditMode, isInitialized, hasDemoConfigService: !!demoConfigService });
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [generalData, setGeneralData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const [businessData, setBusinessData] = useState({
    organizationName: '',
    street: '',
    city: '',
    state: 'TX',
    zip: '',
    phoneNumber: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#6366F1',
  });

  const [agentData, setAgentData] = useState({
    agentName: 'Sophia',
    voiceName: 'alloy' as VoiceName,
    personalityDescription: '',
    systemPrompt: '',
    openingScript: '',
    closingScript: '',
  });

  const [scenarioData, setScenarioData] = useState({
    callDirection: 'outbound' as 'inbound' | 'outbound',
    useCase: '',
    targetAudience: '',
  });

  const [uiData, setUiData] = useState({
    headerText: '',
    headerBadge: '(Enhanced)',
    footerText: '',
    heroTitle: 'Proactive care for every family',
    heroSubtitle: '',
    userSpeakerLabel: 'Caller',
    agentSpeakerLabel: 'Agent',
    callButtonText: 'Start Demo Call',
    endCallButtonText: 'End Call',
    badgeText: 'VOICE AI DEMO',
  });

  // Ambient Audio state
  const [ambientAudioData, setAmbientAudioData] = useState({
    enabled: false,
    volume: 0.3,
    audioFile: '/audio/office-ambience.mp3',
  });

  // SMS Opt-in Template state
  const [smsData, setSmsData] = useState({
    senderName: '',
    optInMessage: `Hi {{parentName}}! This is {{organizationName}}.

Thanks for confirming your appointment! Here are your details:

Date: {{dateTime}}
Location: {{address}}

Please bring:
- Medicaid cards for each child
- Photo ID

Questions? Call {{phoneNumber}}

Reply STOP to unsubscribe.`,
  });

  // Tools configuration state
  const [toolConfigs, setToolConfigs] = useState<ToolConfig[]>([]);
  const [showCustomToolForm, setShowCustomToolForm] = useState(false);
  const [editingToolName, setEditingToolName] = useState<string | null>(null); // null = adding new, string = editing existing
  const [customTool, setCustomTool] = useState<Partial<ToolConfig>>({
    toolName: '',
    displayName: '',
    description: '',
    toolType: 'custom',
    isEnabled: true,
    parametersSchema: { type: 'object', properties: {}, required: [] },
    mockResponseTemplate: '{}',
    mockResponseDelayMs: 300
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // For new demo mode, make sure loading is false
    if (!isEditMode) {
      setLoading(false);
      return;
    }

    // Wait for database to be ready
    if (!isInitialized || !demoConfigService) {
      console.log('DemoEditForm: Waiting for database initialization...', { isInitialized, hasDemoConfigService: !!demoConfigService });
      return;
    }

    const loadDemo = async () => {
      console.log('DemoEditForm: Loading demo with id:', id);
      try {
        setLoading(true);
        const demo = await demoConfigService.getDemoConfigById(id!);
        console.log('DemoEditForm: Loaded demo:', demo?.name || 'NOT FOUND');

        if (!demo) {
          showToast('Demo not found', 'error');
          navigate('/admin/demos');
          return;
        }

        // Populate form data
        setGeneralData({
          name: demo.name,
          slug: demo.slug,
          description: demo.description || '',
        });

        if (demo.businessProfile) {
          setBusinessData({
            organizationName: demo.businessProfile.organizationName,
            street: demo.businessProfile.address?.street || '',
            city: demo.businessProfile.address?.city || '',
            state: demo.businessProfile.address?.state || 'TX',
            zip: demo.businessProfile.address?.zip || '',
            phoneNumber: demo.businessProfile.phoneNumber,
            primaryColor: demo.businessProfile.primaryColor,
            secondaryColor: demo.businessProfile.secondaryColor,
          });
        }

        if (demo.agentConfig) {
          setAgentData({
            agentName: demo.agentConfig.agentName,
            voiceName: demo.agentConfig.voiceName,
            personalityDescription: demo.agentConfig.personalityDescription || '',
            systemPrompt: demo.agentConfig.systemPrompt,
            openingScript: demo.agentConfig.openingScript || '',
            closingScript: demo.agentConfig.closingScript || '',
          });
        }

        if (demo.scenario) {
          setScenarioData({
            callDirection: demo.scenario.callDirection,
            useCase: demo.scenario.useCase,
            targetAudience: demo.scenario.targetAudience || '',
          });
        }

        if (demo.uiLabels) {
          setUiData({
            headerText: demo.uiLabels.headerText,
            headerBadge: demo.uiLabels.headerBadge,
            footerText: demo.uiLabels.footerText,
            heroTitle: demo.uiLabels.heroTitle,
            heroSubtitle: demo.uiLabels.heroSubtitle || '',
            userSpeakerLabel: demo.uiLabels.userSpeakerLabel,
            agentSpeakerLabel: demo.uiLabels.agentSpeakerLabel,
            callButtonText: demo.uiLabels.callButtonText,
            endCallButtonText: demo.uiLabels.endCallButtonText,
            badgeText: demo.uiLabels.badgeText,
          });
        }

        // Load ambient audio config
        if (demo.ambientAudio) {
          setAmbientAudioData({
            enabled: demo.ambientAudio.enabled,
            volume: demo.ambientAudio.volume,
            audioFile: demo.ambientAudio.audioFile,
          });
        }

        // Load tool configs
        if (demo.toolConfigs && demo.toolConfigs.length > 0) {
          setToolConfigs(demo.toolConfigs);
        }
      } catch (error) {
        console.error('Failed to load demo:', error);
        showToast('Failed to load demo data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDemo();
  }, [id, isEditMode, isInitialized, demoConfigService]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // General validation
    if (!generalData.name.trim()) {
      newErrors.name = 'Demo name is required';
    }

    // Business validation
    if (!businessData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    // Agent validation
    if (!agentData.agentName.trim()) {
      newErrors.agentName = 'Agent name is required';
    }
    if (!agentData.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    if (!demoConfigService) {
      showToast('Service not ready', 'error');
      return;
    }

    try {
      setSaving(true);

      const demoData: Partial<DemoConfig> = {
        name: generalData.name.trim(),
        slug: generalData.slug.trim() || generateSlug(generalData.name),
        description: generalData.description.trim() || undefined,
        businessProfile: {
          organizationName: businessData.organizationName.trim(),
          address: {
            street: businessData.street.trim(),
            city: businessData.city.trim(),
            state: businessData.state,
            zip: businessData.zip.trim(),
          },
          phoneNumber: businessData.phoneNumber.trim(),
          primaryColor: businessData.primaryColor,
          secondaryColor: businessData.secondaryColor,
        } as BusinessProfile,
        agentConfig: {
          agentName: agentData.agentName.trim(),
          voiceName: agentData.voiceName,
          personalityDescription: agentData.personalityDescription.trim() || undefined,
          systemPrompt: agentData.systemPrompt.trim(),
          openingScript: agentData.openingScript.trim() || undefined,
          closingScript: agentData.closingScript.trim() || undefined,
          objectionHandling: [],
        } as AgentConfig,
        scenario: {
          callDirection: scenarioData.callDirection,
          useCase: scenarioData.useCase.trim(),
          targetAudience: scenarioData.targetAudience.trim() || undefined,
          demoPatientData: {
            parentName: '',
            phoneNumber: '',
            address: { street: '', city: '', state: '', zip: '' },
            children: [],
          },
          keyTalkingPoints: [],
          edgeCases: [],
        } as ScenarioConfig,
        uiLabels: {
          headerText: uiData.headerText.trim(),
          headerBadge: uiData.headerBadge.trim(),
          footerText: uiData.footerText.trim(),
          heroTitle: uiData.heroTitle.trim(),
          heroSubtitle: uiData.heroSubtitle.trim() || undefined,
          userSpeakerLabel: uiData.userSpeakerLabel.trim(),
          agentSpeakerLabel: uiData.agentSpeakerLabel.trim(),
          callButtonText: uiData.callButtonText.trim(),
          endCallButtonText: uiData.endCallButtonText.trim(),
          badgeText: uiData.badgeText.trim(),
        } as UILabels,
        toolConfigs: toolConfigs,
        ambientAudio: {
          enabled: ambientAudioData.enabled,
          volume: ambientAudioData.volume,
          audioFile: ambientAudioData.audioFile.trim(),
        },
      };

      if (isEditMode) {
        await demoConfigService.updateDemoConfig(id!, demoData);
        showToast('Demo updated successfully', 'success');
      } else {
        await demoConfigService.createDemoConfig(demoData);
        showToast('Demo created successfully', 'success');
      }

      await refreshConfigs();

      setTimeout(() => {
        navigate('/admin/demos');
      }, 1000);
    } catch (error) {
      console.error('Failed to save demo:', error);
      showToast('Failed to save demo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'business',
      label: 'Business Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'agent',
      label: 'AI Agent',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'scenario',
      label: 'Scenario',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'sms',
      label: 'SMS Format',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'ui',
      label: 'UI Labels',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
  ];

  if (!isInitialized || loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">{loading ? 'Loading demo...' : 'Initializing...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/demos"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? 'Edit Demo' : 'Create New Demo'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {isEditMode ? 'Update demo configuration' : 'Set up a new demo scenario'}
          </p>
        </div>
        {/* Color Preview */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg shadow-inner border border-slate-200 dark:border-slate-600"
            style={{ backgroundColor: businessData.primaryColor }}
            title="Primary Color"
          />
          <div
            className="w-8 h-8 rounded-lg shadow-inner border border-slate-200 dark:border-slate-600"
            style={{ backgroundColor: businessData.secondaryColor }}
            title="Secondary Color"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Demo Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={generalData.name}
                    onChange={(e) => {
                      setGeneralData({ ...generalData, name: e.target.value });
                      if (!generalData.slug || generalData.slug === generateSlug(generalData.name)) {
                        setGeneralData(prev => ({ ...prev, name: e.target.value, slug: generateSlug(e.target.value) }));
                      }
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-700 dark:text-white ${
                      errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                    }`}
                    placeholder="e.g., Jefferson Dental - Medicaid Outreach"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    URL Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">/demo/</span>
                    <input
                      type="text"
                      value={generalData.slug}
                      onChange={(e) => setGeneralData({ ...generalData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="jefferson-dental-medicaid"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Used for shareable demo URLs</p>
                </div>

                <ExpandableTextarea
                  label="Description"
                  value={generalData.description}
                  onChange={(value) => setGeneralData({ ...generalData, description: value })}
                  rows={3}
                  placeholder="Brief description of this demo scenario..."
                />
              </div>
            )}

            {/* Business Profile Tab */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessData.organizationName}
                    onChange={(e) => setBusinessData({ ...businessData, organizationName: e.target.value })}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-700 dark:text-white ${
                      errors.organizationName ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                    }`}
                    placeholder="e.g., Jefferson Dental Clinics"
                  />
                  {errors.organizationName && <p className="text-red-500 text-sm mt-1">{errors.organizationName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={businessData.phoneNumber}
                    onChange={(e) => setBusinessData({ ...businessData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g., (214) 555-0100"
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Address</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Street</label>
                      <input
                        type="text"
                        value={businessData.street}
                        onChange={(e) => setBusinessData({ ...businessData, street: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., 123 Main Street"
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">City</label>
                        <input
                          type="text"
                          value={businessData.city}
                          onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="e.g., Dallas"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">State</label>
                        <select
                          value={businessData.state}
                          onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                          {US_STATES.map(state => (
                            <option key={state.value} value={state.value}>{state.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">ZIP</label>
                        <input
                          type="text"
                          value={businessData.zip}
                          onChange={(e) => setBusinessData({ ...businessData, zip: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="e.g., 75201"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Brand Colors</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={businessData.primaryColor}
                          onChange={(e) => setBusinessData({ ...businessData, primaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 dark:border-slate-600"
                        />
                        <input
                          type="text"
                          value={businessData.primaryColor}
                          onChange={(e) => setBusinessData({ ...businessData, primaryColor: e.target.value })}
                          className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Secondary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={businessData.secondaryColor}
                          onChange={(e) => setBusinessData({ ...businessData, secondaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 dark:border-slate-600"
                        />
                        <input
                          type="text"
                          value={businessData.secondaryColor}
                          onChange={(e) => setBusinessData({ ...businessData, secondaryColor: e.target.value })}
                          className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                          placeholder="#6366F1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Config Tab */}
            {activeTab === 'agent' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Agent Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentData.agentName}
                      onChange={(e) => setAgentData({ ...agentData, agentName: e.target.value })}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-slate-700 dark:text-white ${
                        errors.agentName ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                      }`}
                      placeholder="e.g., Sophia"
                    />
                    {errors.agentName && <p className="text-red-500 text-sm mt-1">{errors.agentName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Voice
                    </label>
                    <select
                      value={agentData.voiceName}
                      onChange={(e) => setAgentData({ ...agentData, voiceName: e.target.value as VoiceName })}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                </div>

                <ExpandableTextarea
                  label="Personality Description"
                  value={agentData.personalityDescription}
                  onChange={(value) => setAgentData({ ...agentData, personalityDescription: value })}
                  rows={2}
                  placeholder="e.g., Warm, professional, and empathetic healthcare representative..."
                />

                <ExpandableTextarea
                  label="System Prompt"
                  value={agentData.systemPrompt}
                  onChange={(value) => setAgentData({ ...agentData, systemPrompt: value })}
                  rows={10}
                  required
                  error={errors.systemPrompt}
                  placeholder="You are Sophia, an AI assistant for Jefferson Dental Clinics..."
                  helperText="The main instructions for the AI agent. Include conversation flow, objection handling, and key information."
                  className="font-mono text-sm"
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <ExpandableTextarea
                    label="Opening Script"
                    value={agentData.openingScript}
                    onChange={(value) => setAgentData({ ...agentData, openingScript: value })}
                    rows={4}
                    placeholder="Hello! This is Sophia calling from Jefferson Dental Clinics..."
                  />
                  <ExpandableTextarea
                    label="Closing Script"
                    value={agentData.closingScript}
                    onChange={(value) => setAgentData({ ...agentData, closingScript: value })}
                    rows={4}
                    placeholder="Thank you so much for your time today. We look forward to seeing you..."
                  />
                </div>
              </div>
            )}

            {/* Scenario Tab */}
            {activeTab === 'scenario' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Call Direction
                    </label>
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${
                        scenarioData.callDirection === 'outbound'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="callDirection"
                          value="outbound"
                          checked={scenarioData.callDirection === 'outbound'}
                          onChange={(e) => setScenarioData({ ...scenarioData, callDirection: 'outbound' })}
                          className="sr-only"
                        />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        Outbound
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl cursor-pointer transition-all ${
                        scenarioData.callDirection === 'inbound'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="callDirection"
                          value="inbound"
                          checked={scenarioData.callDirection === 'inbound'}
                          onChange={(e) => setScenarioData({ ...scenarioData, callDirection: 'inbound' })}
                          className="sr-only"
                        />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                        Inbound
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Target Audience
                    </label>
                    <input
                      type="text"
                      value={scenarioData.targetAudience}
                      onChange={(e) => setScenarioData({ ...scenarioData, targetAudience: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g., Parents with children on Medicaid"
                    />
                  </div>
                </div>

                <ExpandableTextarea
                  label="Use Case Description"
                  value={scenarioData.useCase}
                  onChange={(value) => setScenarioData({ ...scenarioData, useCase: value })}
                  rows={4}
                  placeholder="Describe the primary use case for this demo scenario..."
                />

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Demo Patient Data</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Demo patient data (mock caller information) can be configured in the admin Patients section and will be used during demo calls.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tool Configuration</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select which tools the AI agent can use during calls. Tools enable the agent to perform actions like checking availability, booking appointments, and sending confirmations.
                  </p>
                </div>

                {/* Predefined Tools */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Predefined Tools</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(Object.keys(PREDEFINED_TOOLS) as PredefinedToolName[]).map(toolName => {
                      const tool = PREDEFINED_TOOLS[toolName];
                      const isEnabled = toolConfigs.some(t => t.toolName === toolName && t.isEnabled);

                      return (
                        <label
                          key={toolName}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isEnabled
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Add tool to configs
                                const newTool: ToolConfig = {
                                  id: `TC-${Date.now()}-${toolName}`,
                                  demoConfigId: id || '',
                                  toolName,
                                  toolType: 'predefined',
                                  isEnabled: true,
                                  displayName: tool.displayName,
                                  description: tool.description,
                                  parametersSchema: tool.parametersSchema,
                                  mockResponseDelayMs: tool.mockResponseDelayMs,
                                };
                                setToolConfigs([...toolConfigs.filter(t => t.toolName !== toolName), newTool]);
                              } else {
                                // Remove tool from configs
                                setToolConfigs(toolConfigs.filter(t => t.toolName !== toolName));
                              }
                            }}
                            className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-500 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white text-sm">
                              {tool.displayName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {tool.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Tools Section */}
                <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custom Tools</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingToolName(null);
                        setCustomTool({
                          toolName: '',
                          displayName: '',
                          description: '',
                          toolType: 'custom',
                          isEnabled: true,
                          parametersSchema: { type: 'object', properties: {}, required: [] },
                          mockResponseTemplate: '{}',
                          mockResponseDelayMs: 300
                        });
                        setShowCustomToolForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Custom Tool
                    </button>
                  </div>

                  {toolConfigs.filter(t => t.toolType === 'custom').length > 0 ? (
                    <div className="space-y-2">
                      {toolConfigs.filter(t => t.toolType === 'custom').map(tool => (
                        <div
                          key={tool.toolName}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white text-sm">
                              {tool.displayName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {tool.toolName}
                            </div>
                            {tool.description && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                {tool.description}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingToolName(tool.toolName);
                                setCustomTool({
                                  toolName: tool.toolName,
                                  displayName: tool.displayName,
                                  description: tool.description,
                                  toolType: 'custom',
                                  isEnabled: tool.isEnabled,
                                  parametersSchema: tool.parametersSchema,
                                  mockResponseTemplate: tool.mockResponseTemplate,
                                  mockResponseDelayMs: tool.mockResponseDelayMs
                                });
                                setShowCustomToolForm(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit tool"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setToolConfigs(toolConfigs.filter(t => t.toolName !== tool.toolName))}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete tool"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600">
                      <svg className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <p className="text-sm text-slate-500 dark:text-slate-400">No custom tools defined</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click "Add Custom Tool" to create one</p>
                    </div>
                  )}
                </div>

                {/* Tool Stats */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Enabled Tools:</span>
                      <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                        {toolConfigs.filter(t => t.isEnabled).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Predefined:</span>
                      <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                        {toolConfigs.filter(t => t.toolType === 'predefined').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Custom:</span>
                      <span className="ml-2 font-semibold text-purple-600 dark:text-purple-400">
                        {toolConfigs.filter(t => t.toolType === 'custom').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Tool Form Modal */}
            {showCustomToolForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingToolName ? 'Edit Custom Tool' : 'Add Custom Tool'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomToolForm(false);
                        setEditingToolName(null);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Tool Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customTool.toolName}
                        onChange={(e) => setCustomTool({ ...customTool, toolName: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                        disabled={!!editingToolName}
                        className={`w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono ${editingToolName ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-600' : ''}`}
                        placeholder="e.g., send_invoice"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {editingToolName ? 'Tool name cannot be changed' : 'Use snake_case (letters, numbers, underscores only)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Display Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customTool.displayName}
                        onChange={(e) => setCustomTool({ ...customTool, displayName: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., Send Invoice"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={customTool.description}
                        onChange={(e) => setCustomTool({ ...customTool, description: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        rows={2}
                        placeholder="Describe what this tool does..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mock Response (JSON)
                      </label>
                      <textarea
                        value={customTool.mockResponseTemplate}
                        onChange={(e) => setCustomTool({ ...customTool, mockResponseTemplate: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-mono text-sm"
                        rows={3}
                        placeholder='{"success": true, "message": "Action completed"}'
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The mock response returned during demo calls</p>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomToolForm(false);
                        setEditingToolName(null);
                      }}
                      className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!customTool.toolName || !customTool.displayName) return;

                        if (editingToolName) {
                          // Update existing tool
                          setToolConfigs(toolConfigs.map(t =>
                            t.toolName === editingToolName
                              ? {
                                  ...t,
                                  displayName: customTool.displayName!,
                                  description: customTool.description || '',
                                  parametersSchema: customTool.parametersSchema || { type: 'object', properties: {}, required: [] },
                                  mockResponseTemplate: customTool.mockResponseTemplate,
                                  mockResponseDelayMs: customTool.mockResponseDelayMs || 300
                                }
                              : t
                          ));
                        } else {
                          // Add new tool
                          const newTool: ToolConfig = {
                            id: `TC-${Date.now()}`,
                            demoConfigId: id || '',
                            toolName: customTool.toolName,
                            displayName: customTool.displayName,
                            description: customTool.description || '',
                            toolType: 'custom',
                            isEnabled: true,
                            parametersSchema: customTool.parametersSchema || { type: 'object', properties: {}, required: [] },
                            mockResponseTemplate: customTool.mockResponseTemplate,
                            mockResponseDelayMs: customTool.mockResponseDelayMs || 300
                          };
                          setToolConfigs([...toolConfigs, newTool]);
                        }

                        setShowCustomToolForm(false);
                        setEditingToolName(null);
                        setCustomTool({
                          toolName: '',
                          displayName: '',
                          description: '',
                          toolType: 'custom',
                          isEnabled: true,
                          parametersSchema: { type: 'object', properties: {}, required: [] },
                          mockResponseTemplate: '{}',
                          mockResponseDelayMs: 300
                        });
                      }}
                      disabled={!customTool.toolName || !customTool.displayName}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingToolName ? 'Save Changes' : 'Add Tool'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SMS Format Tab */}
            {activeTab === 'sms' && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">SMS Opt-In Message</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Configure the SMS message sent to users when they opt-in during the call. Use dynamic variables to personalize the message.
                  </p>
                </div>

                {/* Two-column layout: Input on left, Preview on right */}
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Left Side - Input Fields */}
                  <div className="space-y-6">
                    {/* Sender Name */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Sender Name
                      </label>
                      <input
                        type="text"
                        value={smsData.senderName}
                        onChange={(e) => setSmsData({ ...smsData, senderName: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder={businessData.organizationName || 'e.g., Jefferson Dental'}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        The name shown as the sender. Defaults to organization name if empty.
                      </p>
                    </div>

                    {/* Available Variables */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Available Dynamic Variables
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                        Click to insert into your message. These will be replaced with actual values during the call.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { var: '{{parentName}}', desc: 'Caller name' },
                          { var: '{{organizationName}}', desc: 'Business name' },
                          { var: '{{address}}', desc: 'Business address' },
                          { var: '{{phoneNumber}}', desc: 'Business phone' },
                          { var: '{{dateTime}}', desc: 'Full date & time' },
                          { var: '{{date}}', desc: 'Date only' },
                          { var: '{{time}}', desc: 'Time only' },
                          { var: '{{childName}}', desc: 'Child name' },
                        ].map(({ var: variable, desc }) => (
                          <button
                            key={variable}
                            type="button"
                            onClick={() => {
                              const textarea = document.getElementById('sms-message-textarea') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = smsData.optInMessage;
                                const before = text.substring(0, start);
                                const after = text.substring(end);
                                setSmsData({ ...smsData, optInMessage: before + variable + after });
                                // Restore cursor position after state update
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(start + variable.length, start + variable.length);
                                }, 0);
                              } else {
                                setSmsData({ ...smsData, optInMessage: smsData.optInMessage + variable });
                              }
                            }}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-mono hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                            title={desc}
                          >
                            {variable}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Template */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Message Template
                        </label>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {smsData.optInMessage.length} characters
                          {smsData.optInMessage.length > 160 && (
                            <span className="text-amber-600 dark:text-amber-400"> (may be split into multiple SMS)</span>
                          )}
                        </span>
                      </div>
                      <textarea
                        id="sms-message-textarea"
                        value={smsData.optInMessage}
                        onChange={(e) => setSmsData({ ...smsData, optInMessage: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm resize-y"
                        rows={12}
                        placeholder="Enter your SMS message template..."
                      />
                    </div>

                    {/* Example Values Info */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preview Example Values</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div><span className="font-mono text-slate-500">parentName:</span> Maria Garcia</div>
                        <div><span className="font-mono text-slate-500">organizationName:</span> {businessData.organizationName || 'Demo Clinic'}</div>
                        <div><span className="font-mono text-slate-500">childName:</span> Tony</div>
                        <div><span className="font-mono text-slate-500">dateTime:</span> Jan 15, 2025 at 2:00 PM</div>
                        <div><span className="font-mono text-slate-500">date:</span> January 15, 2025</div>
                        <div><span className="font-mono text-slate-500">time:</span> 2:00 PM</div>
                        <div className="col-span-2"><span className="font-mono text-slate-500">address:</span> {businessData.street ? `${businessData.street}, ${businessData.city}, ${businessData.state} ${businessData.zip}` : '123 Main St, Dallas, TX 75201'}</div>
                        <div><span className="font-mono text-slate-500">phoneNumber:</span> {businessData.phoneNumber || '(214) 555-0100'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - iPhone SMS Preview */}
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 self-start">Live Preview</h4>

                    {/* iPhone Frame */}
                    <div
                      className="relative rounded-[2.5rem] p-3 shadow-2xl"
                      style={{
                        background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                        width: '320px',
                      }}
                    >
                      {/* Dynamic Island / Notch */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20"></div>

                      {/* Screen */}
                      <div
                        className="rounded-[2rem] overflow-hidden relative"
                        style={{
                          background: 'linear-gradient(180deg, #1c1c1e 0%, #000000 100%)',
                          height: '580px',
                        }}
                      >
                        {/* Status Bar */}
                        <div className="flex items-center justify-between px-6 py-2 text-white text-xs">
                          <span className="font-semibold">9:41</span>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9v-3.1c1.45-.48 3-.73 4.6-.73s3.15.25 4.6.73v3.1c0 .4.23.74.56.9.98.49 1.87 1.12 2.67 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/>
                            </svg>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
                            </svg>
                          </div>
                        </div>

                        {/* SMS Notification Banner */}
                        <div className="absolute top-10 left-2 right-2 z-50">
                          <div
                            className="mx-auto rounded-xl overflow-hidden shadow-lg backdrop-blur-xl"
                            style={{
                              maxWidth: '360px',
                              background: 'rgba(255, 255, 255, 0.92)',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                            }}
                          >
                            {/* Compact Banner Header */}
                            <div className="flex items-start gap-2.5 px-3 py-2.5">
                              {/* Messages App Icon */}
                              <div
                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                                style={{
                                  background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                                }}
                              >
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                              </div>

                              {/* Message Info */}
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-semibold text-xs text-black">Messages</span>
                                  <span className="text-xs text-gray-500 flex-shrink-0">now</span>
                                </div>
                                <div className="text-xs text-gray-700 font-medium mb-0.5">
                                  {smsData.senderName || businessData.organizationName || 'Demo Clinic'}
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">
                                  {(() => {
                                    const previewContext = {
                                      parentName: 'Maria Garcia',
                                      organizationName: businessData.organizationName || 'Demo Clinic',
                                      address: businessData.street
                                        ? `${businessData.street}, ${businessData.city}, ${businessData.state} ${businessData.zip}`
                                        : '123 Main St, Dallas, TX 75201',
                                      phoneNumber: businessData.phoneNumber || '(214) 555-0100',
                                      dateTime: 'Jan 15, 2025 at 2:00 PM',
                                      date: 'January 15, 2025',
                                      time: '2:00 PM',
                                      childName: 'Tony',
                                    };
                                    return interpolateTemplate(smsData.optInMessage, previewContext);
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Green accent bar */}
                            <div
                              className="h-1"
                              style={{
                                background: 'linear-gradient(to right, rgba(52, 199, 89, 0.3), rgba(48, 209, 88, 0.3))',
                              }}
                            />
                          </div>
                        </div>

                        {/* Lock Screen Background */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                          <div className="text-white text-6xl font-extralight mb-2">9:41</div>
                          <div className="text-white text-lg font-light">Wednesday, January 15</div>
                        </div>

                        {/* Home Indicator */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center max-w-xs">
                      This preview shows how the SMS will appear on the recipient's phone when they receive the opt-in confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* UI Labels Tab */}
            {activeTab === 'ui' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Header Text
                    </label>
                    <input
                      type="text"
                      value={uiData.headerText}
                      onChange={(e) => setUiData({ ...uiData, headerText: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g., Jefferson Dental"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Header Badge
                    </label>
                    <input
                      type="text"
                      value={uiData.headerBadge}
                      onChange={(e) => setUiData({ ...uiData, headerBadge: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g., (Enhanced)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={uiData.heroTitle}
                    onChange={(e) => setUiData({ ...uiData, heroTitle: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g., Proactive care for every family"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Hero Subtitle
                  </label>
                  <input
                    type="text"
                    value={uiData.heroSubtitle}
                    onChange={(e) => setUiData({ ...uiData, heroSubtitle: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Optional subtitle text..."
                  />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Conversation Labels</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        User Speaker Label
                      </label>
                      <input
                        type="text"
                        value={uiData.userSpeakerLabel}
                        onChange={(e) => setUiData({ ...uiData, userSpeakerLabel: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., Caller"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Agent Speaker Label
                      </label>
                      <input
                        type="text"
                        value={uiData.agentSpeakerLabel}
                        onChange={(e) => setUiData({ ...uiData, agentSpeakerLabel: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., Sophia"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Button Labels</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Call Button Text
                      </label>
                      <input
                        type="text"
                        value={uiData.callButtonText}
                        onChange={(e) => setUiData({ ...uiData, callButtonText: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., Start Demo Call"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        End Call Button Text
                      </label>
                      <input
                        type="text"
                        value={uiData.endCallButtonText}
                        onChange={(e) => setUiData({ ...uiData, endCallButtonText: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., End Call"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={uiData.badgeText}
                      onChange={(e) => setUiData({ ...uiData, badgeText: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g., VOICE AI DEMO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={uiData.footerText}
                      onChange={(e) => setUiData({ ...uiData, footerText: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g., Enhanced Demo"
                    />
                  </div>
                </div>

                {/* Ambient Audio Settings */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Background Ambient Audio</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Add subtle background audio (like office sounds) during calls for a more realistic experience.
                  </p>

                  <div className="space-y-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ambientAudioData.enabled}
                          onChange={(e) => setAmbientAudioData({ ...ambientAudioData, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Enable ambient audio
                      </span>
                    </div>

                    {/* Volume Slider - only show when enabled */}
                    {ambientAudioData.enabled && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Volume: {Math.round(ambientAudioData.volume * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={ambientAudioData.volume}
                            onChange={(e) => setAmbientAudioData({ ...ambientAudioData, volume: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Audio File Path
                          </label>
                          <input
                            type="text"
                            value={ambientAudioData.audioFile}
                            onChange={(e) => setAmbientAudioData({ ...ambientAudioData, audioFile: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="/audio/office-ambience.mp3"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-between items-center px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Navigate between tabs to configure all settings
            </div>
            <div className="flex gap-3">
              <Link
                to="/admin/demos"
                className="px-6 py-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors border border-slate-200 dark:border-slate-600"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditMode ? 'Update Demo' : 'Create Demo'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default DemoEditForm;
