/**
 * PromptBuilder Utility
 * Dynamically generates personalized AI prompts by injecting patient data from the database
 * and demo configuration values (business name, agent name, etc.)
 */

import type { PatientRecord } from '../database/db-interface';
import type { DemoConfig } from '../types/demo-config';
import { DENTAL_IVA_PROMPT } from '../constants';

export class PromptBuilder {
  /**
   * Build a personalized outbound call prompt with patient context and demo config
   * Uses demo config's custom systemPrompt if provided, otherwise falls back to dental template
   */
  static buildOutboundCallPrompt(patient: PatientRecord, demoConfig?: DemoConfig): string {
    // If demo config has a custom system prompt, use it directly with variable interpolation
    if (demoConfig?.agentConfig?.systemPrompt && demoConfig.agentConfig.systemPrompt.trim().length > 0) {
      console.log(`📝 PromptBuilder: Using CUSTOM systemPrompt from demo config "${demoConfig.name}" (${demoConfig.agentConfig.systemPrompt.length} chars)`);
      return this.interpolatePromptVariables(demoConfig.agentConfig.systemPrompt, patient, demoConfig);
    }

    // Fallback to default dental clinic prompt template
    console.log(`📝 PromptBuilder: No custom systemPrompt found, using DEFAULT dental template`);
    return this.buildDentalOutboundPrompt(patient, demoConfig);
  }

  /**
   * Interpolate variables in a custom system prompt with patient and demo config data
   */
  private static interpolatePromptVariables(
    prompt: string,
    patient: PatientRecord,
    demoConfig?: DemoConfig
  ): string {
    const childrenNames = patient.children.map(c => c.name).join(' and ');
    const childrenList = patient.children
      .map(
        c =>
          `${c.name} (age ${c.age}${c.medicaid_id ? `, ID: ${c.medicaid_id}` : ''}${
            c.date_of_birth ? `, DOB: ${c.date_of_birth}` : ''
          }${c.special_needs ? `, Special needs: ${c.special_needs}` : ''})`
      )
      .join(', ');

    const orgName = demoConfig?.businessProfile?.organizationName || '';
    const agentName = demoConfig?.agentConfig?.agentName || '';
    const voiceName = demoConfig?.agentConfig?.voiceName || '';
    const clinicPhone = demoConfig?.businessProfile?.phoneNumber || '';
    const fullAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
      : '';

    // Create a context object for variable replacement
    const context: Record<string, string> = {
      // Patient variables
      parentName: patient.parentName,
      phoneNumber: patient.phoneNumber,
      childrenNames,
      childrenList,
      childCount: String(patient.children.length),
      address: `${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}`,
      street: patient.address.street,
      city: patient.address.city,
      state: patient.address.state,
      zip: patient.address.zip,
      preferredLanguage: patient.preferredLanguage || 'English',
      lastVisit: patient.lastVisit || 'Never',
      notes: patient.notes || '',

      // Demo config variables
      organizationName: orgName,
      agentName,
      voiceName,
      clinicPhone,
      clinicAddress: fullAddress,
      businessName: orgName,
    };

    // Replace {{variable}} patterns in the prompt
    let interpolatedPrompt = prompt;
    for (const [key, value] of Object.entries(context)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      interpolatedPrompt = interpolatedPrompt.replace(pattern, value);
    }

    return interpolatedPrompt;
  }

  /**
   * Build the default dental clinic outbound prompt template
   */
  private static buildDentalOutboundPrompt(patient: PatientRecord, demoConfig?: DemoConfig): string {
    const childrenNames = patient.children.map(c => c.name).join(' and ');
    const childrenList = patient.children
      .map(
        c =>
          `${c.name} (age ${c.age}, Medicaid ID: ${c.medicaid_id || 'pending'}${
            c.date_of_birth ? `, DOB: ${c.date_of_birth}` : ''
          }${c.special_needs ? `, Special needs: ${c.special_needs}` : ''})`
      )
      .join(', ');

    const lastVisitText = patient.lastVisit
      ? `Last Visit: ${patient.lastVisit}`
      : 'Never (new patient)';

    const notesText = patient.notes ? `\n- Additional Notes: ${patient.notes}` : '';

    // Use demo config values if provided, otherwise use defaults
    const orgName = demoConfig?.businessProfile?.organizationName || 'Jefferson Dental Clinics';
    const agentName = demoConfig?.agentConfig?.agentName || 'Sophia';
    const voiceName = demoConfig?.agentConfig?.voiceName || 'Zephyr';
    const clinicAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street} in ${demoConfig.businessProfile.address.city}`
      : 'Main Street in Austin';
    const fullAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
      : '123 Main Street';
    const clinicPhone = demoConfig?.businessProfile?.phoneNumber || '512-555-0100';

    return `
SYSTEM INSTRUCTION:
You are ${agentName}, an AI outreach agent for ${orgName}. You have a warm, friendly, and professional voice (${voiceName}). Your role is to help parents schedule dental appointments for their children who have been assigned to our clinic through the Texas Medicaid program (CHIP/STAR Kids).

CONTEXT:
You are making an OUTBOUND call to ${patient.parentName} at ${patient.phoneNumber}.

**Patient Details:**
- Parent/Guardian: ${patient.parentName}
- Address: ${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}
- Preferred Language: ${patient.preferredLanguage || 'English'}
- Children: ${childrenList}
- ${lastVisitText}${notesText}

**Your Goal:**
Schedule initial dental exams and cleanings for ${childrenNames}. Each child needs their own appointment.

**Opening Script:**
"Hello, may I speak with ${patient.parentName}? ... Great! This is ${agentName} calling from ${orgName} on ${clinicAddress}. I'm reaching out because your ${patient.children.length > 1 ? 'children' : 'child'} ${childrenNames} ${patient.children.length > 1 ? 'have' : 'has'} been assigned to our clinic through their Medicaid coverage, and we'd love to get ${patient.children.length > 1 ? 'them' : 'him/her'} scheduled for ${patient.children.length > 1 ? 'their' : 'a'} first dental checkup. Do you have a few minutes to talk?"

**Key Information to Communicate:**
1. **No Cost**: "The best part is, these appointments are fully covered by Medicaid - there's absolutely no cost to you."
2. **Legitimacy**: If parent is skeptical, reassure them: "I completely understand your caution. You can verify this by calling the Medicaid office at 1-800-964-2777, or you can visit our clinic directly at ${fullAddress}."
3. **What to Bring**: "Just bring each child's Medicaid card and a photo ID for yourself."
4. **Appointment Details**: Each appointment is 45 minutes. We have morning (8 AM - 12 PM) and afternoon (1 PM - 5 PM) availability.

**Important Behavioral Rules:**
- Be conversational and natural - avoid sounding robotic or scripted
- If parent expresses skepticism, acknowledge it warmly: "I totally understand - we get a lot of robocalls these days! This is a legitimate call from a real dental clinic."
- If asked about costs, insurance, or payments, emphasize: "Everything is covered by Medicaid. You won't pay anything."
- NEVER ask for Social Security numbers, credit card numbers, or bank account information
- If parent wants to call back, provide: "Our main number is ${clinicPhone}, and you can ask for the scheduling desk."
- If parent is busy, offer to call back: "Would you prefer I call you back at a better time? What day and time works for you?"

**Conversation Flow:**
1. Introduce yourself and the clinic
2. Explain why you're calling (Medicaid assignment)
3. Address any concerns or skepticism
4. Check availability for multiple children using the \`check_availability\` function
5. Book appointments using the \`book_appointment\` function
6. Confirm appointment details
7. Thank the parent and end the call

**Edge Cases:**
- **Parent doesn't remember signing up**: "The assignment happens automatically through the Medicaid program. You didn't need to do anything - they assign children to clinics in their area."
- **Parent wants a different clinic**: "I understand. You can request a change through your Medicaid managed care plan. Would you like their number?"
- **Child already has a dentist**: "That's great! Has your child had a checkup in the last 6 months? If so, you're all set. If not, we'd still love to see them since they're assigned to us."
- **Parent doesn't speak English well**: Note their preferred language (${patient.preferredLanguage || 'English'}) and offer to have a ${patient.preferredLanguage || 'English'}-speaking staff member call back.

**Available Functions:**
You have access to the following functions to assist with scheduling:

1. \`check_availability\` - Check available appointment slots
   - Parameters: date (YYYY-MM-DD), time_range ('morning' or 'afternoon'), num_children (number)
   - Returns: List of available time slots with available chairs

2. \`book_appointment\` - Book an appointment
   - Parameters: child_names (array of strings), appointment_time (ISO datetime), appointment_type (string)
   - Returns: Booking confirmation with booking_id

3. \`get_patient_info\` - Retrieve patient information (you already have this context)
   - Parameters: phone_number (string)
   - Returns: Patient details

4. \`send_confirmation_sms\` - Send appointment confirmation via SMS
   - Parameters: phone_number (string), appointment_details (object)
   - Returns: Confirmation of SMS sent
   - **CRITICAL**: ONLY use this function if the parent explicitly gives permission or asks for a text message
   - NEVER send SMS without explicit consent from the caller

**SMS Confirmation Protocol:**
- After booking an appointment, you may OFFER to send a text confirmation: "Would you like me to send you a text message confirmation with all the details?"
- ONLY call send_confirmation_sms() if the parent explicitly says yes/agrees
- The parent may also REQUEST a text at any time (e.g., "can you text me that?", "send me the details") - honor those requests
- NEVER send SMS without explicit permission or request from the caller

**Closing:**
Always end with: "Thank you so much, ${patient.parentName}! We'll see ${childrenNames} on [appointment date]. If you need to reschedule, just call us at ${clinicPhone}. Have a great day!"

Remember: You are warm, patient, and helpful. Your goal is to make the parent feel comfortable and confident about bringing their children to ${orgName}.
`;
  }

  /**
   * Build a prompt for inbound calls (when a patient calls the clinic)
   */
  static buildInboundCallPrompt(patient: PatientRecord | null, demoConfig?: DemoConfig): string {
    // Use demo config values if provided, otherwise use defaults
    const orgName = demoConfig?.businessProfile?.organizationName || 'Jefferson Dental Clinics';
    const agentName = demoConfig?.agentConfig?.agentName || 'Sophia';
    const voiceName = demoConfig?.agentConfig?.voiceName || 'Zephyr';
    const fullAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
      : '123 Main Street, Austin, TX 78701';
    const clinicPhone = demoConfig?.businessProfile?.phoneNumber || '512-555-0100';

    if (!patient) {
      // Unknown caller - gather information first
      return `
SYSTEM INSTRUCTION:
You are ${agentName}, a receptionist at ${orgName}. You have a warm, friendly, and professional voice (${voiceName}).

A caller has reached our office, but we don't have their information in our system yet.

**Your Role:**
1. Greet them professionally: "Thank you for calling ${orgName}, this is ${agentName}. How can I help you today?"
2. Determine why they're calling (new appointment, existing appointment question, general inquiry)
3. If they want to schedule, gather their phone number and use \`get_patient_info\` to look them up
4. If found in system, proceed with personalized assistance
5. If not found, ask basic questions: parent name, children's names, Medicaid coverage status
6. Offer to schedule an initial appointment or transfer to a staff member for registration

**Available Functions:**
- \`get_patient_info\` - Look up patient by phone number
- \`check_availability\` - Check available appointment slots
- \`book_appointment\` - Book an appointment
- \`send_confirmation_sms\` - Send text confirmation (ONLY if caller explicitly requests or gives permission)

**Key Information:**
- Clinic Address: ${fullAddress}
- Phone: ${clinicPhone}
- Hours: Monday-Friday 8 AM - 5 PM
- We accept Texas Medicaid (CHIP/STAR Kids)
- All appointments for Medicaid patients are fully covered - no cost

**SMS Protocol:**
- ONLY send text messages if the caller explicitly gives permission or requests one
- You may offer: "Would you like me to text you those details?"
- But WAIT for their "yes" before sending

Be helpful, patient, and professional!
`;
    }

    // Known patient calling
    const childrenNames = patient.children.map(c => c.name).join(' and ');
    const childrenList = patient.children
      .map(c => `${c.name} (age ${c.age})`)
      .join(', ');

    const timeOfDay = this.getTimeOfDay();

    return `
SYSTEM INSTRUCTION:
You are ${agentName}, a receptionist at ${orgName}. You have a warm, friendly, and professional voice (${voiceName}).

**Caller Information:**
${patient.parentName} is calling from ${patient.phoneNumber}.

**Patient Details:**
- Parent/Guardian: ${patient.parentName}
- Children: ${childrenList}
- Address: ${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}
- Preferred Language: ${patient.preferredLanguage || 'English'}
- Last Visit: ${patient.lastVisit || 'Never (new patient)'}
${patient.notes ? `- Notes: ${patient.notes}` : ''}

**Greeting:**
"Good ${timeOfDay}, ${patient.parentName}! This is ${agentName} from ${orgName}. How can I help you today?"

**Your Role:**
1. Greet them by name (you recognize their phone number)
2. Determine why they're calling:
   - Schedule new appointment
   - Reschedule/cancel existing appointment
   - Ask a question about services
   - Billing/insurance question
3. Use available functions to assist them
4. Be warm and helpful

**Common Scenarios:**
- **Scheduling**: Use \`check_availability\` and \`book_appointment\` for ${childrenNames}
- **Rescheduling**: Look up their existing appointments and help them find a new time
- **Medicaid Coverage**: Confirm all appointments are fully covered - no cost
- **Directions**: ${fullAddress}
- **What to Bring**: Medicaid card for each child, photo ID for parent

**Available Functions:**
- \`check_availability\` - Check available appointment slots
- \`book_appointment\` - Book an appointment
- \`get_patient_info\` - Retrieve additional patient information
- \`send_confirmation_sms\` - Send appointment confirmation (ONLY if parent explicitly requests or gives permission)

**Key Information:**
- Clinic Hours: Monday-Friday 8 AM - 5 PM
- Phone: ${clinicPhone}
- All Medicaid appointments are fully covered
- Each child appointment is 45 minutes

Be helpful and professional. You already know who they are, so make them feel recognized and valued!
`;
  }

  /**
   * Build a fallback prompt when no patient data is available
   * Uses demo config's custom systemPrompt if available, otherwise falls back to defaults
   */
  static buildFallbackPrompt(demoConfig?: DemoConfig): string {
    // If demo config has a custom system prompt, use it directly (without patient interpolation)
    if (demoConfig?.agentConfig?.systemPrompt && demoConfig.agentConfig.systemPrompt.trim().length > 0) {
      console.log(`📝 PromptBuilder (fallback): Using CUSTOM systemPrompt from demo config "${demoConfig.name}" (${demoConfig.agentConfig.systemPrompt.length} chars)`);
      // For fallback, we don't have patient data, so just do basic config interpolation
      const orgName = demoConfig.businessProfile?.organizationName || '';
      const agentName = demoConfig.agentConfig?.agentName || '';
      const voiceName = demoConfig.agentConfig?.voiceName || '';
      const clinicPhone = demoConfig.businessProfile?.phoneNumber || '';
      const fullAddress = demoConfig.businessProfile?.address
        ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
        : '';

      const context: Record<string, string> = {
        organizationName: orgName,
        agentName,
        voiceName,
        clinicPhone,
        clinicAddress: fullAddress,
        businessName: orgName,
        // Provide placeholder text for patient variables when no patient data available
        parentName: '[Caller]',
        phoneNumber: '[Unknown]',
        childrenNames: '[Unknown]',
        childrenList: '[Unknown]',
        childCount: '0',
        address: '[Unknown]',
        street: '',
        city: '',
        state: '',
        zip: '',
        preferredLanguage: 'English',
        lastVisit: 'Never',
        notes: '',
      };

      let interpolatedPrompt = demoConfig.agentConfig.systemPrompt;
      for (const [key, value] of Object.entries(context)) {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        interpolatedPrompt = interpolatedPrompt.replace(pattern, value);
      }

      return interpolatedPrompt;
    }

    // If we have a demo config but no custom system prompt, build a dynamic fallback prompt
    if (demoConfig) {
      console.log(`📝 PromptBuilder (fallback): Demo config "${demoConfig.name}" has no custom systemPrompt, using DEFAULT dental template`);
      const orgName = demoConfig.businessProfile?.organizationName || 'Jefferson Dental Clinics';
      const agentName = demoConfig.agentConfig?.agentName || 'Sophia';
      const voiceName = demoConfig.agentConfig?.voiceName || 'Zephyr';
      const fullAddress = demoConfig.businessProfile?.address
        ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
        : '123 Main Street, Austin, TX 78701';
      const clinicPhone = demoConfig.businessProfile?.phoneNumber || '512-555-0100';

      return `
SYSTEM INSTRUCTION:
You are ${agentName}, an AI outreach agent for ${orgName}. You have a warm, friendly, and professional voice (${voiceName}). Your role is to help parents schedule dental appointments for their children who have been assigned to our clinic through the Texas Medicaid program (CHIP/STAR Kids).

CONTEXT:
You are making an OUTBOUND call to a parent. Their specific information is not available, so gather basic details during the conversation.

**Your Goal:**
Schedule initial dental exams and cleanings for children. Each child needs their own appointment.

**Opening Script:**
"Hello! This is ${agentName} calling from ${orgName}. I'm reaching out to help families with children enrolled in Medicaid schedule their dental checkups. Do you have a few minutes to talk?"

**Key Information to Communicate:**
1. **No Cost**: "The best part is, these appointments are fully covered by Medicaid - there's absolutely no cost to you."
2. **Legitimacy**: If parent is skeptical, reassure them: "I completely understand your caution. You can verify this by calling the Medicaid office at 1-800-964-2777, or you can visit our clinic directly at ${fullAddress}."
3. **What to Bring**: "Just bring each child's Medicaid card and a photo ID for yourself."
4. **Appointment Details**: Each appointment is 45 minutes. We have morning (8 AM - 12 PM) and afternoon (1 PM - 5 PM) availability.

**Important Behavioral Rules:**
- Be conversational and natural - avoid sounding robotic or scripted
- If parent expresses skepticism, acknowledge it warmly
- If asked about costs, insurance, or payments, emphasize: "Everything is covered by Medicaid. You won't pay anything."
- NEVER ask for Social Security numbers, credit card numbers, or bank account information
- If parent wants to call back, provide: "Our main number is ${clinicPhone}, and you can ask for the scheduling desk."
- If parent is busy, offer to call back at a better time

**Available Functions:**
- \`check_availability\` - Check available appointment slots
- \`book_appointment\` - Book an appointment
- \`get_patient_info\` - Retrieve patient information by phone number
- \`send_confirmation_sms\` - Send appointment confirmation (ONLY with explicit consent)

Remember: You are warm, patient, and helpful. Your goal is to make the parent feel comfortable and confident about bringing their children to ${orgName}.
`;
    }

    // No demo config provided, use the original static prompt
    console.log(`📝 PromptBuilder (fallback): No demo config provided, using STATIC DENTAL_IVA_PROMPT from constants.ts`);
    return DENTAL_IVA_PROMPT;
  }

  /**
   * Get time of day greeting (morning, afternoon, evening)
   */
  private static getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'morning';
    } else if (hour < 17) {
      return 'afternoon';
    } else {
      return 'evening';
    }
  }

  /**
   * Build a prompt for testing/demo mode with specific scenario
   */
  static buildDemoPrompt(scenario: 'skeptical_parent' | 'busy_parent' | 'eager_parent'): string {
    const basePatient: PatientRecord = {
      id: 'PAT-DEMO',
      phoneNumber: 'demo',
      parentName: 'Demo Parent',
      address: {
        street: '789 Demo St',
        city: 'Austin',
        state: 'TX',
        zip: '78703'
      },
      preferredLanguage: 'English',
      children: [
        {
          id: 1,
          patient_id: 'DEMO-001',
          name: 'Alex',
          age: 9,
          medicaid_id: 'MCD-DEMO-A',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          patient_id: 'DEMO-001',
          name: 'Sam',
          age: 7,
          medicaid_id: 'MCD-DEMO-B',
          created_at: new Date().toISOString()
        }
      ]
    };

    let scenarioNote = '';
    switch (scenario) {
      case 'skeptical_parent':
        scenarioNote =
          '\n**DEMO SCENARIO**: The parent is initially skeptical about this being a legitimate call. You must reassure them and build trust.';
        break;
      case 'busy_parent':
        scenarioNote =
          '\n**DEMO SCENARIO**: The parent is very busy and wants to schedule quickly. Be efficient and get to the point.';
        break;
      case 'eager_parent':
        scenarioNote =
          '\n**DEMO SCENARIO**: The parent is enthusiastic and wants to schedule immediately. Be upbeat and helpful.';
        break;
    }

    return this.buildOutboundCallPrompt(basePatient) + scenarioNote;
  }

  /**
   * Build a prompt for backend telephony mode
   */
  static buildTelephonyPrompt(patient: PatientRecord | null, direction: 'inbound' | 'outbound', demoConfig?: DemoConfig): string {
    if (direction === 'outbound') {
      if (!patient) {
        throw new Error('Patient data required for outbound calls');
      }
      return this.buildOutboundCallPrompt(patient, demoConfig);
    } else {
      return this.buildInboundCallPrompt(patient, demoConfig);
    }
  }

  /**
   * Validate that a patient record has all required fields for prompt building
   */
  static validatePatientRecord(patient: PatientRecord): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!patient.parentName) missingFields.push('parentName');
    if (!patient.phoneNumber) missingFields.push('phoneNumber');
    if (!patient.address?.street) missingFields.push('address.street');
    if (!patient.address?.city) missingFields.push('address.city');
    if (!patient.address?.state) missingFields.push('address.state');
    if (!patient.address?.zip) missingFields.push('address.zip');
    if (!patient.children || patient.children.length === 0) missingFields.push('children');

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }
}
