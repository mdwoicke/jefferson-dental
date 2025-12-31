/**
 * Demo Config Parser Service
 *
 * Uses OpenAI GPT-4 to parse call scripts and extract demo configuration.
 */

import type {
  DemoConfig,
  AIParseResult,
  BusinessProfile,
  AgentConfig,
  ScenarioConfig,
  ToolConfig,
  PREDEFINED_TOOLS,
  PredefinedToolName
} from '../types/demo-config';

const SYSTEM_PROMPT = `You are an expert at analyzing call center scripts and extracting structured configuration data.

Given a sample call script, you will extract the following information and return it as JSON:

1. **Business Information**:
   - Organization name
   - Address (street, city, state, zip)
   - Phone number
   - Operating hours if mentioned

2. **AI Agent Details**:
   - Agent name (if mentioned)
   - Personality/tone description
   - Opening script
   - Closing script

3. **Scenario Details**:
   - Is this inbound or outbound?
   - What's the use case?
   - Target audience
   - Demo patient data if applicable

4. **Required Functions/Tools**:
   - What actions does the agent need to perform?
   - Suggest from this list: check_availability, book_appointment, get_patient_info, send_confirmation_sms, reschedule_appointment, cancel_appointment, get_appointment_history, add_appointment_notes, send_appointment_reminder, check_insurance_eligibility, get_clinic_hours, get_directions, get_available_services, get_appointment_preparation

5. **Objection Handling**:
   - Common objections mentioned
   - Scripted responses

Return a JSON object matching this schema:

{
  "businessProfile": {
    "organizationName": "string",
    "address": {
      "street": "string or empty",
      "city": "string or empty",
      "state": "string or empty",
      "zip": "string or empty"
    },
    "phoneNumber": "string or empty"
  },
  "agentConfig": {
    "agentName": "string (default to 'AI Agent' if not found)",
    "voiceName": "alloy",
    "personalityDescription": "string describing tone and style",
    "systemPrompt": "A comprehensive system prompt for the AI based on the script",
    "openingScript": "The opening greeting/introduction",
    "closingScript": "The closing statement if any",
    "objectionHandling": [
      { "objection": "string", "response": "string" }
    ]
  },
  "scenario": {
    "callDirection": "inbound or outbound",
    "useCase": "string describing the purpose",
    "targetAudience": "string describing who receives calls",
    "demoPatientData": {
      "parentName": "string",
      "phoneNumber": "string",
      "address": { "street": "", "city": "", "state": "", "zip": "" },
      "children": [{ "name": "string", "age": number }]
    },
    "keyTalkingPoints": ["array of key points"]
  },
  "suggestedTools": ["array of tool names from the list above"],
  "confidence": 0.0-1.0,
  "warnings": ["array of any issues or missing information"]
}

Important:
- Generate a complete system prompt based on the script content
- Extract actual dialogue and talking points from the script
- Identify the agent name if mentioned
- Determine call direction from context clues
- Include all objection handling pairs found
- Set confidence based on how complete the extracted data is`;

export class DemoConfigParser {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Parse a call script and extract configuration
   */
  async parseCallScript(rawScript: string): Promise<AIParseResult> {
    console.log('🔍 Parsing call script with AI...');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Parse this call script and extract the configuration:\n\n${rawScript}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content);
      console.log('✅ AI parsing complete');

      return {
        success: true,
        extractedConfig: this.mapToPartialConfig(parsed),
        confidence: parsed.confidence || 0.7,
        suggestions: this.generateSuggestions(parsed),
        warnings: parsed.warnings || []
      };
    } catch (error: any) {
      console.error('❌ AI parsing failed:', error);
      return {
        success: false,
        extractedConfig: {},
        confidence: 0,
        suggestions: [],
        warnings: [error.message || 'Failed to parse script']
      };
    }
  }

  /**
   * Map AI response to partial DemoConfig
   */
  private mapToPartialConfig(parsed: any): Partial<DemoConfig> {
    const config: Partial<DemoConfig> = {};

    // Business Profile
    if (parsed.businessProfile) {
      config.businessProfile = {
        id: '',
        demoConfigId: '',
        organizationName: parsed.businessProfile.organizationName || '',
        address: {
          street: parsed.businessProfile.address?.street || '',
          city: parsed.businessProfile.address?.city || '',
          state: parsed.businessProfile.address?.state || '',
          zip: parsed.businessProfile.address?.zip || ''
        },
        phoneNumber: parsed.businessProfile.phoneNumber || '',
        primaryColor: '#3B82F6',
        secondaryColor: '#6366F1',
        hours: {
          monday: { open: '08:00', close: '17:00', isOpen: true },
          tuesday: { open: '08:00', close: '17:00', isOpen: true },
          wednesday: { open: '08:00', close: '17:00', isOpen: true },
          thursday: { open: '08:00', close: '17:00', isOpen: true },
          friday: { open: '08:00', close: '17:00', isOpen: true },
          saturday: { open: 'closed', close: 'closed', isOpen: false },
          sunday: { open: 'closed', close: 'closed', isOpen: false }
        }
      };
    }

    // Agent Config
    if (parsed.agentConfig) {
      config.agentConfig = {
        id: '',
        demoConfigId: '',
        agentName: parsed.agentConfig.agentName || 'AI Agent',
        voiceName: parsed.agentConfig.voiceName || 'alloy',
        personalityDescription: parsed.agentConfig.personalityDescription,
        systemPrompt: parsed.agentConfig.systemPrompt || '',
        openingScript: parsed.agentConfig.openingScript,
        closingScript: parsed.agentConfig.closingScript,
        objectionHandling: parsed.agentConfig.objectionHandling || []
      };
    }

    // Scenario
    if (parsed.scenario) {
      config.scenario = {
        id: '',
        demoConfigId: '',
        callDirection: parsed.scenario.callDirection || 'outbound',
        useCase: parsed.scenario.useCase || '',
        targetAudience: parsed.scenario.targetAudience,
        demoPatientData: {
          parentName: parsed.scenario.demoPatientData?.parentName || '',
          phoneNumber: parsed.scenario.demoPatientData?.phoneNumber || '',
          address: {
            street: parsed.scenario.demoPatientData?.address?.street || '',
            city: parsed.scenario.demoPatientData?.address?.city || '',
            state: parsed.scenario.demoPatientData?.address?.state || '',
            zip: parsed.scenario.demoPatientData?.address?.zip || ''
          },
          children: parsed.scenario.demoPatientData?.children || []
        },
        keyTalkingPoints: parsed.scenario.keyTalkingPoints || [],
        edgeCases: []
      };
    }

    // Tool Configs from suggestions
    if (parsed.suggestedTools && Array.isArray(parsed.suggestedTools)) {
      config.toolConfigs = parsed.suggestedTools.map((toolName: string) => ({
        id: `TC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        demoConfigId: '',
        toolName,
        toolType: 'predefined' as const,
        isEnabled: true,
        displayName: this.formatToolName(toolName),
        description: '',
        parametersSchema: { type: 'object' as const, properties: {}, required: [] },
        mockResponseDelayMs: 300
      }));
    }

    // UI Labels (derive from business profile and agent)
    config.uiLabels = {
      id: '',
      demoConfigId: '',
      headerText: config.businessProfile?.organizationName || '',
      headerBadge: '(Demo)',
      footerText: 'Enhanced Demo',
      heroTitle: 'Proactive care for every family',
      userSpeakerLabel: 'Caller',
      agentSpeakerLabel: config.agentConfig?.agentName
        ? `Agent (${config.agentConfig.agentName})`
        : 'Agent',
      callButtonText: 'Start Demo Call',
      endCallButtonText: 'End Call',
      badgeText: 'VOICE AI DEMO'
    };

    return config;
  }

  /**
   * Format tool name to display name
   */
  private formatToolName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate suggestions based on parsed data
   */
  private generateSuggestions(parsed: any): string[] {
    const suggestions: string[] = [];

    if (!parsed.businessProfile?.organizationName) {
      suggestions.push('Add an organization name for better branding');
    }

    if (!parsed.businessProfile?.phoneNumber) {
      suggestions.push('Consider adding a business phone number');
    }

    if (!parsed.agentConfig?.systemPrompt || parsed.agentConfig.systemPrompt.length < 100) {
      suggestions.push('The system prompt could be more detailed');
    }

    if (!parsed.agentConfig?.objectionHandling?.length) {
      suggestions.push('Add objection handling for common customer concerns');
    }

    if (!parsed.suggestedTools?.length) {
      suggestions.push('Enable tools to allow the agent to take actions');
    }

    if (parsed.suggestedTools?.includes('send_confirmation_sms')) {
      suggestions.push('Configure SMS templates for appointment confirmations');
    }

    return suggestions;
  }
}

/**
 * Simple script analyzer for quick extraction without AI
 * (Fallback when API is not available)
 */
export function quickParseScript(script: string): Partial<DemoConfig> {
  const config: Partial<DemoConfig> = {};

  // Try to extract organization name (look for patterns like "from XYZ" or "at XYZ")
  const orgMatch = script.match(/(?:from|at|with|calling from)\s+([A-Z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/);
  if (orgMatch) {
    config.businessProfile = {
      id: '',
      demoConfigId: '',
      organizationName: orgMatch[1].trim(),
      address: { street: '', city: '', state: '', zip: '' },
      phoneNumber: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#6366F1',
      hours: {
        monday: { open: '08:00', close: '17:00', isOpen: true },
        tuesday: { open: '08:00', close: '17:00', isOpen: true },
        wednesday: { open: '08:00', close: '17:00', isOpen: true },
        thursday: { open: '08:00', close: '17:00', isOpen: true },
        friday: { open: '08:00', close: '17:00', isOpen: true },
        saturday: { open: 'closed', close: 'closed', isOpen: false },
        sunday: { open: 'closed', close: 'closed', isOpen: false }
      }
    };
  }

  // Try to extract agent name (look for "This is X" or "My name is X")
  const nameMatch = script.match(/(?:this is|my name is|I'm|I am)\s+([A-Z][a-z]+)/i);
  if (nameMatch) {
    config.agentConfig = {
      id: '',
      demoConfigId: '',
      agentName: nameMatch[1],
      voiceName: 'alloy',
      systemPrompt: script,
      objectionHandling: []
    };
  }

  // Try to extract phone number
  const phoneMatch = script.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch && config.businessProfile) {
    config.businessProfile.phoneNumber = phoneMatch[0];
  }

  // Determine call direction
  const isOutbound = script.toLowerCase().includes('calling to') ||
                     script.toLowerCase().includes('reaching out') ||
                     script.toLowerCase().includes('following up');

  config.scenario = {
    id: '',
    demoConfigId: '',
    callDirection: isOutbound ? 'outbound' : 'inbound',
    useCase: '',
    demoPatientData: {
      parentName: '',
      phoneNumber: '',
      address: { street: '', city: '', state: '', zip: '' },
      children: []
    },
    keyTalkingPoints: [],
    edgeCases: []
  };

  return config;
}
