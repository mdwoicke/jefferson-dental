/**
 * PromptBuilder Utility
 * Dynamically generates personalized AI prompts by injecting patient data from the database
 * Supports custom system prompts from demo configurations
 */

import type { PatientRecord } from '../database/db-interface';
import { config } from '../config';

// Simplified DemoConfig interface for backend use
// Matches the relevant fields from the frontend DemoConfig type
interface DemoConfigLite {
  name?: string;
  businessProfile?: {
    organizationName?: string;
    phoneNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  agentConfig?: {
    agentName?: string;
    voiceName?: string;
    systemPrompt?: string;
  };
}

export class PromptBuilder {
  /**
   * Interpolate variables in a custom system prompt with patient and demo config data
   */
  private static interpolatePromptVariables(
    prompt: string,
    patient: PatientRecord | null,
    demoConfig?: DemoConfigLite
  ): string {
    const orgName = demoConfig?.businessProfile?.organizationName || '';
    const agentName = demoConfig?.agentConfig?.agentName || '';
    const voiceName = demoConfig?.agentConfig?.voiceName || '';
    const clinicPhone = demoConfig?.businessProfile?.phoneNumber || '';
    const fullAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
      : '';

    // Build context object for variable replacement
    const context: Record<string, string> = {
      // Demo config variables
      organizationName: orgName,
      agentName,
      voiceName,
      clinicPhone,
      clinicAddress: fullAddress,
      businessName: orgName,
    };

    // Add patient variables if available
    if (patient) {
      const childrenNames = patient.children.map(c => c.name).join(' and ');
      const childrenList = patient.children
        .map(c => `${c.name} (age ${c.age}${c.medicaid_id ? `, ID: ${c.medicaid_id}` : ''})`)
        .join(', ');

      Object.assign(context, {
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
      });
    } else {
      // Provide placeholder text for patient variables when no patient data available
      Object.assign(context, {
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
      });
    }

    // Replace {{variable}} patterns in the prompt
    let interpolatedPrompt = prompt;
    for (const [key, value] of Object.entries(context)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      interpolatedPrompt = interpolatedPrompt.replace(pattern, value);
    }

    return interpolatedPrompt;
  }
  /**
   * Build SMS instructions based on configured mode
   */
  private static buildSMSInstructions(mode: string): string {
    switch (mode) {
      case 'ask':
        return `3. **SMS Confirmation Protocol (EXPLICIT CONSENT REQUIRED)**:
   - CRITICAL: NEVER automatically send SMS after booking
   - ALWAYS ask first: "Great! I have you all scheduled. Would you like me to send you a text message confirmation with the appointment details?"
   - WAIT for the parent's response
   - ONLY call send_confirmation_sms() if they explicitly say "yes", "sure", "that would be great", or similar affirmative responses
   - If they say "no", "no thanks", "that's okay", or decline in any way, DO NOT send SMS
   - Instead, verbally confirm all appointment details (date, time, location, what to bring)
   - NEVER send SMS without explicit verbal permission from the parent
   - Do NOT assume consent - they must clearly agree to receive the text message`;

      case 'auto':
        return `3. **SMS Confirmation (Automatic)**: After booking, inform them that a text confirmation has been sent:
   - Say: "Perfect! I've scheduled that for you, and I've just sent a text message confirmation to your phone with all the details."
   - DO NOT call send_confirmation_sms() - the system already sent it automatically
   - The parent can still request additional SMS confirmations if needed`;

      case 'on-demand':
        return `3. **SMS Confirmations (On-Demand ONLY)**:
   - CRITICAL: Only send SMS when the parent EXPLICITLY requests it
   - Listen for requests like "text me", "send me the details", "can you message that to me"
   - Use send_confirmation_sms() ONLY when they ask for it
   - You may offer SMS after providing complex information, but ONLY send if they say yes
   - Example: "Would you like me to text you the clinic address so you have it handy?" - then WAIT for confirmation
   - NEVER send SMS without explicit permission or request`;

      case 'hybrid':
      default:
        return `3. **SMS Confirmations (Auto-Send + On-Demand)**:
   - After booking, a confirmation SMS is automatically sent to the parent's phone
   - Inform them: "Perfect! I've scheduled that for you, and I've just sent a text confirmation to your phone."
   - The parent can ALSO request additional SMS confirmations at any time during the conversation
   - Listen for requests like "text me the address", "send me a reminder", "can you message that to me"
   - For ADDITIONAL SMS beyond the auto-confirmation, ONLY send when they explicitly request it
   - You may offer to text additional info, but ONLY send if they say yes
   - NEVER send SMS without explicit permission or request

**If SMS Fails**:
   - If the system indicates SMS failed, don't panic - verbally confirm all details instead
   - Say: "Let me confirm those details for you..." and repeat the appointment information
   - Offer alternative: "You can also call us at 512-555-0100 for a confirmation"
   - NEVER mention technical issues or error codes to the parent`;
    }
  }

  /**
   * Build a personalized outbound call prompt with patient context
   * Uses demo config's custom systemPrompt if provided, otherwise falls back to dental template
   */
  static buildOutboundCallPrompt(patient: PatientRecord, demoConfig?: DemoConfigLite): string {
    // If demo config has a custom system prompt, use it directly with variable interpolation
    if (demoConfig?.agentConfig?.systemPrompt && demoConfig.agentConfig.systemPrompt.trim().length > 0) {
      console.log(`📝 PromptBuilder (backend): Using CUSTOM systemPrompt from demo config "${demoConfig.name}" (${demoConfig.agentConfig.systemPrompt.length} chars)`);
      return this.interpolatePromptVariables(demoConfig.agentConfig.systemPrompt, patient, demoConfig);
    }

    // Fallback to default dental clinic prompt template
    console.log(`📝 PromptBuilder (backend): No custom systemPrompt found, using DEFAULT dental template`);
    return this.buildDentalOutboundPrompt(patient, demoConfig);
  }

  /**
   * Build the default dental clinic outbound prompt template
   */
  private static buildDentalOutboundPrompt(patient: PatientRecord, demoConfig?: DemoConfigLite): string {
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

    return `
SYSTEM INSTRUCTION:
You are ${agentName}, an AI outreach agent for ${orgName}. You have a warm, friendly, and professional voice. Your role is to help parents schedule dental appointments for their children who have been assigned to our clinic through the Texas Medicaid program (CHIP/STAR Kids).

🚨 CRITICAL RULE - SMS CONSENT PROTOCOL (HIGHEST PRIORITY):
- NEVER send SMS without explicit verbal permission from the parent
- After booking an appointment, you MUST ask: "Would you like me to text you a confirmation with the appointment details?"
- WAIT for their response before taking any action
- ONLY call send_confirmation_sms() if they clearly say "yes", "sure", "that would be great", or similar affirmative responses
- If they say "no", "no thanks", "that's okay", or decline in any way, DO NOT call send_confirmation_sms()
- If they decline SMS, verbally confirm all appointment details instead
- Rejection of SMS is completely acceptable - never pressure them
- This consent requirement cannot be waived under any circumstances

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

**CRITICAL FIRST STEP - DO THIS IMMEDIATELY:**
Before saying anything, you MUST call the log_conversation_start function with greeting_confirmed=true. This is required for system logging and testing.

**Opening Script (after calling log_conversation_start):**
"Hello, may I speak with ${patient.parentName}? ... Great! This is Sophia calling from Jefferson Dental Clinics on Main Street in Austin. I'm reaching out because your ${patient.children.length > 1 ? 'children' : 'child'} ${childrenNames} ${patient.children.length > 1 ? 'have' : 'has'} been assigned to our clinic through their Medicaid coverage, and we'd love to get ${patient.children.length > 1 ? 'them' : 'him/her'} scheduled for ${patient.children.length > 1 ? 'their' : 'a'} first dental checkup. Do you have a few minutes to talk?"

**Key Information to Communicate:**
1. **No Cost**: "The best part is, these appointments are fully covered by Medicaid - there's absolutely no cost to you."
2. **Legitimacy**: If parent is skeptical, reassure them: "I completely understand your caution. You can verify this by calling the Medicaid office at 1-800-964-2777, or you can visit our clinic directly at 123 Main Street."
3. **What to Bring**: "Just bring each child's Medicaid card and a photo ID for yourself."
4. **Appointment Details**: Each appointment is 45 minutes. We have morning (8 AM - 12 PM) and afternoon (1 PM - 5 PM) availability.

**Important Behavioral Rules:**
- Be conversational and natural - avoid sounding robotic or scripted
- If parent expresses skepticism, acknowledge it warmly: "I totally understand - we get a lot of robocalls these days! This is a legitimate call from a real dental clinic."
- If asked about costs, insurance, or payments, emphasize: "Everything is covered by Medicaid. You won't pay anything."
- NEVER ask for Social Security numbers, credit card numbers, or bank account information
- If parent wants to call back, provide: "Our main number is 512-555-0100, and you can ask for the scheduling desk."
- If parent is busy, offer to call back: "Would you prefer I call you back at a better time? What day and time works for you?"

**Conversation Flow:**
1. Introduce yourself and the clinic using the Opening Script above
2. Explain why you're calling (Medicaid assignment)
3. Address any concerns or skepticism
4. Ask about the parent's availability and schedule preferences
5. **IMPORTANT**: When parent expresses interest, use check_availability() to get real available times
6. Offer the actual available appointment times returned by the function
7. Use book_appointment() when parent confirms a time
8. Confirm appointment details verbally
9. Thank the parent and end the call

**Edge Cases:**
- **Parent doesn't remember signing up**: "The assignment happens automatically through the Medicaid program. You didn't need to do anything - they assign children to clinics in their area."
- **Parent wants a different clinic**: "I understand. You can request a change through your Medicaid managed care plan. Would you like their number?"
- **Child already has a dentist**: "That's great! Has your child had a checkup in the last 6 months? If so, you're all set. If not, we'd still love to see them since they're assigned to us."
- **Parent doesn't speak English well**: Note their preferred language (${patient.preferredLanguage || 'English'}) and offer to have a ${patient.preferredLanguage || 'English'}-speaking staff member call back.

**Appointment Scheduling Process:**
Follow these steps to schedule appointments:

1. **Check Availability First** - ALWAYS use check_availability() when the parent asks about times or expresses interest in scheduling
   - Call check_availability with the date, time_range (morning/afternoon/evening), and num_children
   - Wait for the real availability data before suggesting times
   - Use the actual available slots returned by the function

2. **Book the Appointment** - Use book_appointment() after the parent confirms their chosen time
   - This creates the appointment in the system
   - Wait for the booking confirmation before proceeding

${this.buildSMSInstructions(config.sms.mode)}

**DO NOT use the schedule_appointment skill** - It bypasses the SMS confirmation protocol above. Always use individual functions (check_availability, book_appointment, send_confirmation_sms) to maintain proper consent flow.

**General Rules:**
- For multiple children, offer consecutive time slots from the availability results
- Verbally confirm all appointment details at the end
- NEVER make up appointment times - always check actual availability first

**Closing:**
Always end with: "Thank you so much, ${patient.parentName}! We'll see ${childrenNames} on [appointment date]. If you need to reschedule, just call us at 512-555-0100. Have a great day!"

Remember: You are warm, patient, and helpful. Your goal is to make the parent feel comfortable and confident about bringing their children to Jefferson Dental Clinics.
`;
  }

  /**
   * Build a prompt for inbound calls (when a patient calls the clinic)
   * Uses demo config's custom systemPrompt if provided, otherwise falls back to dental template
   */
  static buildInboundCallPrompt(patient: PatientRecord | null, demoConfig?: DemoConfigLite): string {
    // If demo config has a custom system prompt, use it directly with variable interpolation
    if (demoConfig?.agentConfig?.systemPrompt && demoConfig.agentConfig.systemPrompt.trim().length > 0) {
      console.log(`📝 PromptBuilder (backend/inbound): Using CUSTOM systemPrompt from demo config "${demoConfig.name}"`);
      return this.interpolatePromptVariables(demoConfig.agentConfig.systemPrompt, patient, demoConfig);
    }

    // Use demo config values if provided, otherwise use defaults
    const orgName = demoConfig?.businessProfile?.organizationName || 'Jefferson Dental Clinics';
    const agentName = demoConfig?.agentConfig?.agentName || 'Sophia';
    const clinicAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
      : '123 Main Street, Austin, TX 78701';
    const clinicPhone = demoConfig?.businessProfile?.phoneNumber || '512-555-0100';

    if (!patient) {
      // Unknown caller - gather information first
      return `
SYSTEM INSTRUCTION:
You are ${agentName}, a receptionist at ${orgName}. You have a warm, friendly, and professional voice.

A caller has reached our office, but we don't have their information in our system yet.

**Your Role:**
1. Greet them professionally: "Thank you for calling ${orgName}, this is ${agentName}. How can I help you today?"
2. Determine why they're calling (new appointment, existing appointment question, general inquiry)
3. If they want to schedule, gather their phone number and basic information
4. Ask basic questions: parent name, children's names, ages, Medicaid coverage status
5. Offer specific appointment times (e.g., "I have Thursday at 3 PM or Friday at 10 AM available")
6. Verbally confirm appointment details and ASK if they'd like a text confirmation (only send if they say yes)

**Key Information:**
- Clinic Address: ${clinicAddress}
- Phone: ${clinicPhone}
- Hours: Monday-Friday 8 AM - 5 PM
- We accept Texas Medicaid (CHIP/STAR Kids)
- All appointments for Medicaid patients are fully covered - no cost

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
You are ${agentName}, a receptionist at ${orgName}. You have a warm, friendly, and professional voice.

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
"Good ${timeOfDay}, ${patient.parentName}! This is ${agentName} from ${orgName}. I see we have ${childrenNames} in our system. How can I help you today?"

**Your Role:**
1. Greet them by name (you recognize their phone number)
2. Determine why they're calling:
   - Schedule new appointment
   - Reschedule/cancel existing appointment
   - Ask a question about services
   - Billing/insurance question
3. Provide helpful information and assistance
4. Be warm and helpful

**Common Scenarios:**
- **Scheduling**: Ask about their availability and offer specific appointment times for ${childrenNames} (e.g., "I have Thursday at 2 PM available" or "How about next Monday at 10 AM?")
- **Rescheduling**: Help them find a new time that works better for their schedule
- **Medicaid Coverage**: Confirm all appointments are fully covered - no cost
- **Directions**: ${clinicAddress}
- **What to Bring**: Medicaid card for each child, photo ID for parent

**Appointment Scheduling:**
- Offer specific dates and times during clinic hours (Mon-Fri, 8 AM - 5 PM)
- For multiple children, suggest consecutive slots
- You can use the schedule_appointment skill to handle the complete workflow automatically
- Verbally confirm all details
${this.buildSMSInstructions(config.sms.mode)}

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
  static buildFallbackPrompt(demoConfig?: DemoConfigLite): string {
    // If demo config has a custom system prompt, use it directly
    if (demoConfig?.agentConfig?.systemPrompt && demoConfig.agentConfig.systemPrompt.trim().length > 0) {
      console.log(`📝 PromptBuilder (backend/fallback): Using CUSTOM systemPrompt from demo config "${demoConfig.name}"`);
      return this.interpolatePromptVariables(demoConfig.agentConfig.systemPrompt, null, demoConfig);
    }

    // Use demo config values if provided, otherwise use defaults
    const orgName = demoConfig?.businessProfile?.organizationName || 'Jefferson Dental Clinics';
    const agentName = demoConfig?.agentConfig?.agentName || 'Sophia';
    const clinicAddress = demoConfig?.businessProfile?.address
      ? `${demoConfig.businessProfile.address.street}, ${demoConfig.businessProfile.address.city}, ${demoConfig.businessProfile.address.state} ${demoConfig.businessProfile.address.zip}`
      : '123 Main Street, Austin, TX 78701';
    const clinicPhone = demoConfig?.businessProfile?.phoneNumber || '512-555-0100';

    return `
SYSTEM INSTRUCTION:
You are ${agentName}, a receptionist at ${orgName}. You have a warm, friendly, and professional voice.

**Your Role:**
You are assisting with phone calls at our clinic. Be warm, professional, and helpful.

**Key Information:**
- Organization: ${orgName}
- Address: ${clinicAddress}
- Phone: ${clinicPhone}
- Hours: Monday-Friday 8 AM - 5 PM
- We accept Texas Medicaid (CHIP/STAR Kids)
- All Medicaid appointments are fully covered

**When Scheduling:**
- Gather caller's information (name, phone, children's names and ages)
- Offer specific appointment times during clinic hours
- You can use the schedule_appointment skill to handle the complete workflow, or use individual functions (check_availability, book_appointment, send_confirmation_sms)
- Verbally confirm all details
${this.buildSMSInstructions(config.sms.mode)}

**Greeting:**
"Thank you for calling ${orgName}, this is ${agentName}. How can I help you today?"

Be helpful, patient, and professional!
`;
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
          patient_id: 'PAT-DEMO',
          name: 'Alex',
          age: 9,
          medicaid_id: 'MCD-DEMO-A',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          patient_id: 'PAT-DEMO',
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
   * Accepts optional demo config for custom system prompts
   */
  static buildTelephonyPrompt(
    patient: PatientRecord | null,
    direction: 'inbound' | 'outbound',
    demoConfig?: DemoConfigLite
  ): string {
    if (direction === 'outbound') {
      if (!patient) {
        // For outbound without patient, use fallback
        return this.buildFallbackPrompt(demoConfig);
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
