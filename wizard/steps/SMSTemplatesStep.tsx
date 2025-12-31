import React from 'react';
import { useWizardContext } from '../DemoWizard';
import type { SMSTemplate } from '../../types/demo-config';

const DEFAULT_TEMPLATES: Partial<SMSTemplate>[] = [
  {
    templateType: 'confirmation',
    templateName: 'Appointment Confirmation',
    senderName: '',
    messageTemplate: `Hi {{parentName}}! Your appointment at {{organizationName}} is confirmed for {{dateTime}}.

Location: {{address}}

Please bring:
- Medicaid cards for each child
- Photo ID

Questions? Call {{phoneNumber}}

Reply STOP to unsubscribe.`
  },
  {
    templateType: 'reminder',
    templateName: 'Appointment Reminder',
    senderName: '',
    messageTemplate: `Hi {{parentName}}! This is a reminder about your appointment at {{organizationName}} tomorrow at {{time}}.

Location: {{address}}

See you soon!`
  },
  {
    templateType: 'cancellation',
    templateName: 'Cancellation Confirmation',
    senderName: '',
    messageTemplate: `Hi {{parentName}}, your appointment at {{organizationName}} has been cancelled.

To reschedule, call {{phoneNumber}} or reply to this message.`
  }
];

export const SMSTemplatesStep: React.FC = () => {
  const { config, setSMSTemplates, updateBusinessProfile } = useWizardContext();
  const templates = config.smsTemplates || [];
  const defaultSenderName = config.businessProfile?.organizationName || 'Demo Clinic';

  const getTemplate = (type: string): SMSTemplate | undefined => {
    return templates.find(t => t.templateType === type);
  };

  const handleTemplateChange = (type: string, field: keyof SMSTemplate, value: string) => {
    const existing = getTemplate(type);
    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.templateType === type);

    if (existing) {
      // Update existing
      setSMSTemplates(templates.map(t =>
        t.templateType === type ? { ...t, [field]: value } : t
      ));
    } else {
      // Create new from default
      setSMSTemplates([...templates, {
        id: `SMS-${Date.now()}`,
        demoConfigId: '',
        templateType: type as any,
        templateName: defaultTemplate?.templateName || type,
        senderName: field === 'senderName' ? value : defaultSenderName,
        messageTemplate: field === 'messageTemplate' ? value : (defaultTemplate?.messageTemplate || '')
      }]);
    }
  };

  const initializeTemplate = (type: string) => {
    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.templateType === type);
    if (!defaultTemplate) return;

    setSMSTemplates([...templates, {
      id: `SMS-${Date.now()}`,
      demoConfigId: '',
      templateType: type as any,
      templateName: defaultTemplate.templateName || type,
      senderName: defaultSenderName,
      messageTemplate: defaultTemplate.messageTemplate || ''
    }]);
  };

  const removeTemplate = (type: string) => {
    setSMSTemplates(templates.filter(t => t.templateType !== type));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          SMS Templates
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure SMS message templates for different scenarios.
        </p>
      </div>

      {/* Available Variables */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Available Variables
        </h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {['{{parentName}}', '{{organizationName}}', '{{address}}', '{{phoneNumber}}', '{{dateTime}}', '{{date}}', '{{time}}', '{{childName}}'].map(variable => (
            <code key={variable} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs">
              {variable}
            </code>
          ))}
        </div>
      </div>

      {/* Template Cards */}
      <div className="space-y-4">
        {(['confirmation', 'reminder', 'cancellation'] as const).map(type => {
          const template = getTemplate(type);
          const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.templateType === type);
          const isConfigured = !!template;

          return (
            <div
              key={type}
              className={`p-4 rounded-lg border ${
                isConfigured
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-dashed border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                    {type} Template
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {type === 'confirmation' && 'Sent after booking an appointment'}
                    {type === 'reminder' && 'Sent before an upcoming appointment'}
                    {type === 'cancellation' && 'Sent when an appointment is cancelled'}
                  </p>
                </div>

                {isConfigured ? (
                  <button
                    onClick={() => removeTemplate(type)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => initializeTemplate(type)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add Template
                  </button>
                )}
              </div>

              {isConfigured && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={template?.senderName || ''}
                      onChange={(e) => handleTemplateChange(type, 'senderName', e.target.value)}
                      placeholder={defaultSenderName}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                                 placeholder-gray-400 dark:placeholder-gray-500
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Message Template
                    </label>
                    <textarea
                      value={template?.messageTemplate || ''}
                      onChange={(e) => handleTemplateChange(type, 'messageTemplate', e.target.value)}
                      placeholder={defaultTemplate?.messageTemplate}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                                 placeholder-gray-400 dark:placeholder-gray-500
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {template?.messageTemplate?.length || 0} characters
                      {(template?.messageTemplate?.length || 0) > 160 && (
                        <span className="text-yellow-600"> (may be split into multiple SMS)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional note */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        SMS templates are optional. If not configured, the agent will compose messages dynamically.
      </p>
    </div>
  );
};

export default SMSTemplatesStep;
