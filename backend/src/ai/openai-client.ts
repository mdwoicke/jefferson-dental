import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { IVoiceProvider, ProviderConfig, VoiceProviderCallbacks, ProviderMessage, ToolConfigLite } from '../types';
import type { DatabaseAdapter } from '../database/db-interface';
import { ConversationLogger } from '../services/conversation-logger';
import { AppointmentService } from '../services/appointment-service';
import { CRMService } from '../services/crm-service';
import { NotificationService } from '../services/notification-service';
import { ClinicService } from '../services/clinic-service';
import { NEMTService } from '../services/nemt-service';
import { config } from '../config';
import { ToolRegistry } from '../lib/tool-registry';
import { ScheduleAppointmentSkill } from '../skills/scheduling';
import type { SkillContext } from '../skills/skill-base';

/**
 * OpenAI Realtime API provider for backend (Node.js)
 * Adapted from frontend OpenAI provider
 *
 * NOTE: Full function calling and conversation logging support is planned
 * but not yet implemented in the backend. This is a simplified version
 * that accepts database adapter and patient context for future use.
 */
export class OpenAIClient extends EventEmitter implements IVoiceProvider {
  private ws: WebSocket | null = null;
  private callbacks: VoiceProviderCallbacks | null = null;
  private connected: boolean = false;
  private dbAdapter: DatabaseAdapter | null = null;
  private conversationLogger: ConversationLogger | null = null;
  private conversationId: string | null = null;
  private currentPatientId: string | null = null;
  private phoneNumber: string | null = null;
  private appointmentService: AppointmentService | null = null;
  private crmService: CRMService | null = null;
  private notificationService: NotificationService | null = null;
  private clinicService: ClinicService | null = null;
  private functionCallBuffer: Map<string, string> = new Map();
  private toolRegistry: ToolRegistry;

  // Track when speech actually started (for accurate transcript ordering)
  private speechStartTimes: Map<string, Date> = new Map();
  private transcriptBuffers: Map<string, { role: 'user' | 'assistant'; text: string; itemId?: string }> = new Map();

  // Audio timing tracking for transcript pacing
  // Tracks cumulative audio bytes sent per response (for calculating speech duration)
  private audioBytesSent: Map<string, number> = new Map();
  // Tracks word count per response (for calculating expected word timing)
  private wordCountPerResponse: Map<string, number> = new Map();

  constructor(dbAdapter?: DatabaseAdapter) {
    super();

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry();

    if (dbAdapter) {
      this.dbAdapter = dbAdapter;
      this.conversationLogger = new ConversationLogger(dbAdapter);
      this.appointmentService = new AppointmentService(dbAdapter);
      this.crmService = new CRMService(dbAdapter);
      this.notificationService = new NotificationService();
      this.clinicService = new ClinicService();

      // Register all tools in the registry
      this.registerTools();

      // Log skill availability
      console.log('📚 Skills loaded:');
      console.log('  ✅ ScheduleAppointmentSkill - Multi-step appointment scheduling workflow');
    } else {
      console.warn('⚠️  OpenAI Client: No database adapter provided. Function calling will be disabled.');
    }
  }

  /**
   * Set patient context for conversation logging
   */
  setPatientContext(patientId: string, phoneNumber: string): void {
    this.currentPatientId = patientId;
    this.phoneNumber = phoneNumber;

    // Propagate patient context to AppointmentService for booking
    if (this.appointmentService) {
      this.appointmentService.setCurrentPatient(patientId);
    }

    console.log(`📋 Patient context set: ${patientId} (${phoneNumber})`);
  }

  /**
   * Set conversation ID for transcript logging
   */
  setConversationId(conversationId: string): void {
    this.conversationId = conversationId;
    console.log(`💬 OpenAI Client - Conversation ID set: ${conversationId}`);
  }

  /**
   * Register all tools in the tool registry
   * These can be called individually or orchestrated by skills
   */
  private registerTools(): void {
    console.log('🔧 Registering tools in ToolRegistry...');

    // Register all individual tools
    this.toolRegistry.register('log_conversation_start',
      async (args) => this.handleLogConversationStart(args),
      'Log conversation start (test skill)'
    );

    this.toolRegistry.register('check_availability',
      async (args) => this.handleCheckAvailability(args),
      'Check available appointment slots'
    );

    this.toolRegistry.register('book_appointment',
      async (args) => this.handleBookAppointment(args),
      'Book a dental appointment'
    );

    this.toolRegistry.register('get_patient_info',
      async (args) => this.handleGetPatientInfo(args),
      'Get patient information from CRM'
    );

    this.toolRegistry.register('send_confirmation_sms',
      async (args) => this.handleSendConfirmationSMS(args),
      'Send SMS confirmation'
    );

    this.toolRegistry.register('reschedule_appointment',
      async (args) => this.handleRescheduleAppointment(args),
      'Reschedule an existing appointment'
    );

    this.toolRegistry.register('cancel_appointment',
      async (args) => this.handleCancelAppointment(args),
      'Cancel an existing appointment'
    );

    this.toolRegistry.register('get_appointment_history',
      async (args) => this.handleGetAppointmentHistory(args),
      'Get appointment history'
    );

    this.toolRegistry.register('add_appointment_notes',
      async (args) => this.handleAddAppointmentNotes(args),
      'Add notes to appointment'
    );

    this.toolRegistry.register('send_appointment_reminder',
      async (args) => this.handleSendAppointmentReminder(args),
      'Send appointment reminder'
    );

    this.toolRegistry.register('check_insurance_eligibility',
      async (args) => this.handleCheckInsuranceEligibility(args),
      'Check insurance eligibility'
    );

    this.toolRegistry.register('get_clinic_hours',
      async (args) => this.handleGetClinicHours(args),
      'Get clinic hours'
    );

    this.toolRegistry.register('get_directions',
      async (args) => this.handleGetDirections(args),
      'Get clinic directions'
    );

    this.toolRegistry.register('get_available_services',
      async (args) => this.handleGetAvailableServices(args),
      'Get available services'
    );

    this.toolRegistry.register('get_appointment_preparation',
      async (args) => this.handleGetAppointmentPreparation(args),
      'Get appointment preparation info'
    );

    // ============================================================================
    // NEMT (Non-Emergency Medical Transportation) TOOLS
    // ============================================================================

    this.toolRegistry.register('verify_member',
      async (args) => this.handleVerifyMember(args),
      'Verify member identity'
    );

    this.toolRegistry.register('get_member_info',
      async (args) => this.handleGetMemberInfo(args),
      'Get member information'
    );

    this.toolRegistry.register('check_ride_eligibility',
      async (args) => this.handleCheckRideEligibility(args),
      'Check ride eligibility'
    );

    this.toolRegistry.register('search_address',
      async (args) => this.handleSearchAddress(args),
      'Search and validate address'
    );

    this.toolRegistry.register('book_ride',
      async (args) => this.handleBookRide(args),
      'Book a ride'
    );

    this.toolRegistry.register('get_ride_status',
      async (args) => this.handleGetRideStatus(args),
      'Get ride status'
    );

    this.toolRegistry.register('cancel_ride',
      async (args) => this.handleCancelRide(args),
      'Cancel a ride'
    );

    this.toolRegistry.register('update_ride',
      async (args) => this.handleUpdateRide(args),
      'Update ride details'
    );

    this.toolRegistry.register('add_companion',
      async (args) => this.handleAddCompanion(args),
      'Add companion to ride'
    );

    this.toolRegistry.register('check_nemt_availability',
      async (args) => this.handleCheckNEMTAvailability(args),
      'Check NEMT vehicle availability'
    );

    this.toolRegistry.printStatus();
  }

  async connect(config: ProviderConfig, callbacks: VoiceProviderCallbacks): Promise<void> {
    this.callbacks = callbacks;

    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.model)}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        this.ws.on('open', () => {
          console.log('✅ OpenAI Realtime WebSocket opened');
          this.connected = true;

          // Send session configuration
          this.sendSessionUpdate(config);

          this.callbacks?.onOpen();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          console.log('🔌 OpenAI Realtime WebSocket closed');
          this.connected = false;
          this.callbacks?.onClose();
        });

        this.ws.on('error', (error) => {
          console.error('❌ OpenAI Realtime WebSocket error:', error);
          this.callbacks?.onError(new Error('WebSocket connection failed'));
          reject(new Error('WebSocket connection failed'));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build tools array based on demo config
   * Dynamically selects dental or NEMT tools based on toolConfigs
   */
  private buildToolsArray(config: ProviderConfig): any[] {
    // Check if this is an NEMT demo by looking at toolConfigs
    const hasNEMTTools = config.toolConfigs?.some(tc =>
      tc.toolName.includes('verify_member') ||
      tc.toolName.includes('book_ride') ||
      tc.toolName.includes('nemt')
    );

    // Always include the conversation start logger
    const baseTools = [
      {
        type: 'function',
        name: 'log_conversation_start',
        description: 'MANDATORY: Call this function immediately when the conversation begins to log the call start.',
        parameters: {
          type: 'object',
          properties: {
            greeting_confirmed: { type: 'boolean', description: 'Confirm you are ready to begin the conversation' },
            test_message: { type: 'string', description: 'Optional test message for verification' }
          },
          required: ['greeting_confirmed']
        }
      }
    ];

    if (hasNEMTTools) {
      console.log('🚗 NEMT demo detected - loading NEMT tools');
      return [...baseTools, ...this.getNEMTToolDefinitions()];
    } else {
      console.log('🦷 Dental demo detected - loading dental tools');
      return [...baseTools, ...this.getDentalToolDefinitions()];
    }
  }

  /**
   * Get NEMT (Non-Emergency Medical Transportation) tool definitions
   */
  private getNEMTToolDefinitions(): any[] {
    return [
      {
        type: 'function',
        name: 'verify_member',
        description: 'Verify member identity using Member ID, name, and date of birth. MANDATORY before accessing any account information.',
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member ID number (from Medicaid/Medicare card)' },
            first_name: { type: 'string', description: 'Member first name' },
            last_name: { type: 'string', description: 'Member last name' },
            date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD format)' }
          },
          required: ['member_id', 'first_name', 'last_name', 'date_of_birth']
        }
      },
      {
        type: 'function',
        name: 'get_member_info',
        description: 'Get full member information including address, plan type, and ride history',
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member ID number' }
          },
          required: ['member_id']
        }
      },
      {
        type: 'function',
        name: 'check_ride_eligibility',
        description: 'Check if member is eligible for rides and how many rides remain',
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member ID number' }
          },
          required: ['member_id']
        }
      },
      {
        type: 'function',
        name: 'search_address',
        description: 'Search and validate an address for pickup or dropoff',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Address search query' },
            city: { type: 'string', description: 'City name' },
            state: { type: 'string', description: 'State abbreviation' }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'book_ride',
        description: 'Book a ride for the member. Collect all required info first.',
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member ID' },
            trip_type: { type: 'string', enum: ['one_way', 'round_trip'], description: 'Type of trip' },
            pickup_address: { type: 'string', description: 'Pickup street address' },
            pickup_city: { type: 'string', description: 'Pickup city' },
            pickup_state: { type: 'string', description: 'Pickup state' },
            pickup_zip: { type: 'string', description: 'Pickup ZIP code' },
            dropoff_address: { type: 'string', description: 'Dropoff street address' },
            dropoff_city: { type: 'string', description: 'Dropoff city' },
            dropoff_state: { type: 'string', description: 'Dropoff state' },
            dropoff_zip: { type: 'string', description: 'Dropoff ZIP code' },
            pickup_date: { type: 'string', description: 'Pickup date (YYYY-MM-DD)' },
            pickup_time: { type: 'string', description: 'Pickup time (HH:MM)' },
            appointment_time: { type: 'string', description: 'Appointment time (HH:MM)' },
            assistance_type: { type: 'string', enum: ['ambulatory', 'wheelchair', 'wheelchair_xl', 'stretcher'], description: 'Mobility assistance type' },
            facility_name: { type: 'string', description: 'Medical facility name' },
            return_trip_type: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
            return_pickup_time: { type: 'string', description: 'Scheduled return pickup time (HH:MM)' },
            notes: { type: 'string', description: 'Special notes or instructions' }
          },
          required: ['member_id', 'trip_type', 'pickup_address', 'pickup_city', 'pickup_state', 'pickup_zip',
                     'dropoff_address', 'dropoff_city', 'dropoff_state', 'dropoff_zip',
                     'pickup_date', 'pickup_time', 'appointment_time', 'assistance_type']
        }
      },
      {
        type: 'function',
        name: 'get_ride_status',
        description: 'Get status of a scheduled ride using confirmation number',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Ride confirmation number' }
          },
          required: ['confirmation_number']
        }
      },
      {
        type: 'function',
        name: 'cancel_ride',
        description: 'Cancel a scheduled ride',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Ride confirmation number' },
            reason: { type: 'string', description: 'Reason for cancellation' }
          },
          required: ['confirmation_number']
        }
      },
      {
        type: 'function',
        name: 'update_ride',
        description: 'Update ride details like pickup time or return trip',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Ride confirmation number' },
            pickup_time: { type: 'string', description: 'New pickup time (HH:MM)' },
            pickup_date: { type: 'string', description: 'New pickup date (YYYY-MM-DD)' },
            appointment_time: { type: 'string', description: 'New appointment time' },
            return_trip_type: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
            return_pickup_time: { type: 'string', description: 'Scheduled return time' },
            notes: { type: 'string', description: 'Updated notes' }
          },
          required: ['confirmation_number']
        }
      },
      {
        type: 'function',
        name: 'add_companion',
        description: 'Add a companion to an existing ride reservation',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Ride confirmation number' },
            companion_name: { type: 'string', description: 'Companion full name' },
            companion_phone: { type: 'string', description: 'Companion phone number' },
            relationship: { type: 'string', description: 'Relationship to member' }
          },
          required: ['confirmation_number', 'companion_name', 'companion_phone']
        }
      },
      {
        type: 'function',
        name: 'check_nemt_availability',
        description: 'Check vehicle availability for a specific date/time and assistance type',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
            time: { type: 'string', description: 'Time to check (HH:MM)' },
            pickup_zip: { type: 'string', description: 'Pickup ZIP code' },
            assistance_type: { type: 'string', enum: ['ambulatory', 'wheelchair', 'wheelchair_xl', 'stretcher'], description: 'Mobility assistance type' }
          },
          required: ['date', 'time', 'pickup_zip', 'assistance_type']
        }
      }
    ];
  }

  /**
   * Get Dental tool definitions (original hardcoded tools)
   */
  private getDentalToolDefinitions(): any[] {
    return [
      {
        type: 'function',
        name: 'check_availability',
        description: 'Check available appointment slots for a specific date and time range.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'The date to check availability (YYYY-MM-DD format)' },
            time_range: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Preferred time of day' },
            num_children: { type: 'integer', description: 'Number of children to schedule', minimum: 1 }
          },
          required: ['date', 'time_range', 'num_children']
        }
      },
      {
        type: 'function',
        name: 'book_appointment',
        description: 'Book a dental appointment for specified children. Only call after user confirms.',
        parameters: {
          type: 'object',
          properties: {
            child_names: { type: 'array', items: { type: 'string' }, description: 'Names of children to schedule' },
            appointment_time: { type: 'string', description: 'ISO 8601 datetime for appointment' },
            appointment_type: { type: 'string', enum: ['exam', 'cleaning', 'exam_and_cleaning', 'emergency'] }
          },
          required: ['child_names', 'appointment_time', 'appointment_type']
        }
      },
      {
        type: 'function',
        name: 'get_patient_info',
        description: 'Retrieve patient information from CRM by phone number',
        parameters: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', description: 'Patient phone number' }
          },
          required: ['phone_number']
        }
      },
      {
        type: 'function',
        name: 'send_confirmation_sms',
        description: 'Send SMS confirmation ONLY after obtaining explicit verbal consent.',
        parameters: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', description: 'Recipient phone number' },
            appointment_details: { type: 'string', description: 'Appointment details for SMS' }
          },
          required: ['phone_number', 'appointment_details']
        }
      },
      {
        type: 'function',
        name: 'reschedule_appointment',
        description: 'Reschedule an existing appointment to a new time',
        parameters: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'The booking ID of the appointment to reschedule' },
            new_appointment_time: { type: 'string', description: 'New ISO 8601 datetime for the appointment' },
            reason: { type: 'string', description: 'Optional reason for rescheduling' }
          },
          required: ['booking_id', 'new_appointment_time']
        }
      },
      {
        type: 'function',
        name: 'cancel_appointment',
        description: 'Cancel an existing appointment',
        parameters: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'The booking ID of the appointment to cancel' },
            reason: { type: 'string', description: 'Reason for cancellation' }
          },
          required: ['booking_id', 'reason']
        }
      },
      {
        type: 'function',
        name: 'get_appointment_history',
        description: 'Get appointment history for the current patient',
        parameters: { type: 'object', properties: {}, required: [] }
      },
      {
        type: 'function',
        name: 'add_appointment_notes',
        description: 'Add notes to an existing appointment',
        parameters: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'The booking ID' },
            notes: { type: 'string', description: 'Notes to add' }
          },
          required: ['booking_id', 'notes']
        }
      },
      {
        type: 'function',
        name: 'send_appointment_reminder',
        description: 'Send an SMS reminder for an upcoming appointment',
        parameters: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', description: 'Recipient phone number' },
            patient_name: { type: 'string', description: 'Parent/guardian name' },
            child_name: { type: 'string', description: 'Child name' },
            appointment_time: { type: 'string', description: 'ISO 8601 datetime' },
            location: { type: 'string', description: 'Clinic location' }
          },
          required: ['phone_number', 'patient_name', 'child_name', 'appointment_time', 'location']
        }
      },
      {
        type: 'function',
        name: 'check_insurance_eligibility',
        description: 'Verify Medicaid insurance eligibility for a child',
        parameters: {
          type: 'object',
          properties: {
            medicaid_id: { type: 'string', description: 'Child Medicaid ID number' },
            child_name: { type: 'string', description: 'Child name' },
            date_of_birth: { type: 'string', description: 'Child date of birth (YYYY-MM-DD)' }
          },
          required: ['medicaid_id', 'child_name']
        }
      },
      {
        type: 'function',
        name: 'get_clinic_hours',
        description: 'Get clinic operating hours',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Optional specific date to check (YYYY-MM-DD)' }
          },
          required: []
        }
      },
      {
        type: 'function',
        name: 'get_directions',
        description: 'Get directions and address information for the clinic',
        parameters: {
          type: 'object',
          properties: {
            from_address: { type: 'string', description: 'Optional starting address' }
          },
          required: []
        }
      },
      {
        type: 'function',
        name: 'get_available_services',
        description: 'Get list of available dental services',
        parameters: { type: 'object', properties: {}, required: [] }
      },
      {
        type: 'function',
        name: 'get_appointment_preparation',
        description: 'Get information about what to bring and how to prepare',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    ];
  }

  private sendSessionUpdate(config: ProviderConfig): void {
    if (!this.ws) return;

    console.log('🔍 DEBUG - sendSessionUpdate called');
    console.log('🔍 DEBUG - appointmentService exists:', !!this.appointmentService);
    console.log('🔍 DEBUG - crmService exists:', !!this.crmService);
    console.log('🔍 DEBUG - toolConfigs provided:', config.toolConfigs?.length || 0);
    console.log('🔍 DEBUG - demoSlug:', config.demoSlug || 'none');

    // Build tools dynamically based on demo config
    const tools = this.appointmentService && this.crmService
      ? this.buildToolsArray(config)
      : [];

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: config.systemInstruction,
        voice: config.voiceName,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad'
        },
        temperature: 0.8,
        max_response_output_tokens: 4096,

        // Dynamic tool definitions based on demo config
        ...(tools.length > 0 ? {
          tools: tools,
          tool_choice: 'auto'
        } : {})
      }
    };

    // DEBUG: Log what we're sending
    console.log('🔍 DEBUG - Session config has tools:', !!sessionConfig.session.tools);
    if (sessionConfig.session.tools) {
      console.log('🔍 DEBUG - Number of tools:', sessionConfig.session.tools.length);
      console.log('🔍 DEBUG - Tool names:', sessionConfig.session.tools.map((t: any) => t.name).join(', '));
    } else {
      console.error('❌ ERROR: NO TOOLS BEING SENT TO OPENAI!');
      console.error('❌ appointmentService:', this.appointmentService);
      console.error('❌ crmService:', this.crmService);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 SENDING TO OPENAI - System Instructions (length: ${config.systemInstruction.length} chars)`);
    console.log(`${'='.repeat(60)}`);
    console.log(config.systemInstruction);
    console.log(`${'='.repeat(60)}\n`);

    this.ws.send(JSON.stringify(sessionConfig));

    // Log tool configuration after sending session update
    if (this.appointmentService && this.crmService) {
      const toolNames = sessionConfig.session.tools?.map((t: any) => t.name) || [];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔧 TOOLS CONFIGURED FOR OPENAI`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📊 Total tools sent: ${toolNames.length}`);
      console.log(`📋 Tool names: ${toolNames.join(', ')}`);
      console.log(`🎯 Tool choice: ${sessionConfig.session.tool_choice || 'auto'}`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      console.log('\n⚠️  NO TOOLS CONFIGURED - Database adapter not available\n');
    }
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'session.created':
        case 'session.updated':
          console.log('✅ OpenAI session ready:', message.type);
          break;

        case 'response.audio.delta':
          // Audio data comes in base64-encoded PCM16
          if (message.delta) {
            const audioData = this.base64ToUint8Array(message.delta);
            const audioMessage: ProviderMessage = {
              type: 'audio',
              audio: audioData
            };
            this.callbacks?.onMessage(audioMessage);
            this.emit('audio', audioData); // For audio bridge

            // Track cumulative audio bytes for this response (for transcript pacing)
            // This helps us know how much audio has been sent, which correlates to playback time
            if (message.response_id) {
              const currentBytes = this.audioBytesSent.get(message.response_id) || 0;
              this.audioBytesSent.set(message.response_id, currentBytes + audioData.length);
            }
          }
          break;

        case 'response.audio.done':
          console.log('✅ Audio response complete');
          break;

        case 'input_audio_buffer.speech_started':
          console.log('🎤 User started speaking - interrupting');
          const interruptMessage: ProviderMessage = {
            type: 'interrupt'
          };
          this.callbacks?.onMessage(interruptMessage);
          this.emit('interrupt'); // For audio bridge
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('🔇 User stopped speaking');
          break;

        case 'response.audio_transcript.done':
          // Assistant transcript completed - log to database
          console.log('🔍 DEBUG - response.audio_transcript.done received:', JSON.stringify(message, null, 2));
          if (message.transcript && this.conversationLogger && this.conversationId) {
            console.log('📝 Assistant transcript:', message.transcript);

            // Get the speech start time (when response was created)
            const assistantSpeechStartTime = this.speechStartTimes.get(message.response_id);
            console.log(`🕐 [BACKEND] Using speech start time for assistant: ${assistantSpeechStartTime?.toISOString() || 'FALLBACK TO NOW'}`);

            // Clear buffer for this response
            this.transcriptBuffers.delete(message.response_id);

            // Log with actual speech start time (not current time)
            await this.conversationLogger.logTurn(this.conversationId, {
              role: 'assistant',
              contentType: 'text',
              contentText: message.transcript
            }, assistantSpeechStartTime); // Pass speech start time

            // Also call onTranscript if available
            if (this.callbacks?.onTranscript) {
              this.callbacks.onTranscript('assistant', message.transcript, assistantSpeechStartTime, message.response_id);
            }
          } else {
            console.log('⚠️  Not logging - transcript:', !!message.transcript, 'logger:', !!this.conversationLogger, 'convId:', !!this.conversationId);
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User transcript completed - log to database
          console.log('🔍 DEBUG - input_audio_transcription.completed received:', JSON.stringify(message, null, 2));
          if (message.transcript && this.conversationLogger && this.conversationId) {
            console.log('📝 User transcript:', message.transcript);

            // Get the speech start time (when conversation item was created)
            const userSpeechStartTime = this.speechStartTimes.get(message.item_id);
            console.log(`🕐 [BACKEND] Using speech start time for user: ${userSpeechStartTime?.toISOString() || 'FALLBACK TO NOW'}`);

            // Clear buffer for this item
            this.transcriptBuffers.delete(message.item_id);

            // Log with actual speech start time (not current time)
            await this.conversationLogger.logTurn(this.conversationId, {
              role: 'user',
              contentType: 'text',
              contentText: message.transcript
            }, userSpeechStartTime); // Pass speech start time

            // Also call onTranscript if available
            if (this.callbacks?.onTranscript) {
              this.callbacks.onTranscript('user', message.transcript, userSpeechStartTime, message.item_id);
            }
          } else {
            console.log('⚠️  Not logging - transcript:', !!message.transcript, 'logger:', !!this.conversationLogger, 'convId:', !!this.conversationId);
          }
          break;

        case 'conversation.item.created':
          // Capture timestamp when conversation item (user speech) is created
          if (message.item?.id) {
            const itemCreatedTime = new Date();
            this.speechStartTimes.set(message.item.id, itemCreatedTime);
            console.log(`🕐 [BACKEND] Conversation item created: ${message.item.id} at ${itemCreatedTime.toISOString()}`);
          }
          break;

        case 'response.created':
          // Capture timestamp when AI response is created (before transcripts start)
          if (message.response?.id) {
            const responseCreatedTime = new Date();
            this.speechStartTimes.set(message.response.id, responseCreatedTime);
            console.log(`🕐 [BACKEND] AI response created: ${message.response.id} at ${responseCreatedTime.toISOString()}`);
          }
          break;

        case 'response.done':
          // Log when OpenAI completes a response - show if tools were used or not
          if (message.response) {
            const response = message.response;
            const responseId = response.id;
            const hasToolCalls = response.output?.some((item: any) =>
              item.type === 'function_call' ||
              (item.content && item.content.some((c: any) => c.type === 'function_call'))
            );

            if (hasToolCalls) {
              console.log('✅ Response complete WITH tool calls');
            } else {
              console.log('💬 Response complete WITHOUT tool calls (text/audio only)');
              console.log('   ℹ️  OpenAI chose to respond conversationally instead of calling tools');
            }

            // Clean up tracking maps for this response
            if (responseId) {
              this.audioBytesSent.delete(responseId);
              this.wordCountPerResponse.delete(responseId);
            }
          }
          break;

        case 'response.output_item.added':
          // Log when OpenAI adds an output item - indicate if it's text or a function call
          if (message.item) {
            if (message.item.type === 'function_call') {
              console.log(`🔧 OpenAI is calling tool: ${message.item.name || 'unknown'}`);
            } else if (message.item.type === 'message') {
              console.log('💬 OpenAI is responding with text/audio (not calling a tool)');
            }
          }
          break;

        case 'response.output_item.done':
        case 'response.content_part.added':
        case 'response.content_part.done':
        case 'input_audio_buffer.committed':
          // These are informational, no action needed
          break;

        case 'response.audio_transcript.delta':
          // Stream AI transcript word-by-word
          if (message.delta && message.response_id) {
            const responseId = message.response_id;
            const currentBuffer = this.transcriptBuffers.get(responseId) || {
              role: 'assistant' as const,
              text: '',
              itemId: message.item_id
            };

            currentBuffer.text += message.delta;
            this.transcriptBuffers.set(responseId, currentBuffer);

            // Get the speech start time (when response was created)
            const speechStartTime = this.speechStartTimes.get(responseId);

            // Track delta count for this response
            const deltaCount = (this.wordCountPerResponse.get(responseId) || 0) + 1;
            this.wordCountPerResponse.set(responseId, deltaCount);

            // Simple approach: fixed delay per delta position
            // This spreads out the deltas evenly regardless of audio timing
            // 300ms per delta + 800ms initial buffer
            let delayMs = 0;

            if (speechStartTime) {
              const elapsedMs = Date.now() - speechStartTime.getTime();
              const msPerDelta = 300;
              const initialBufferMs = 800;

              // Target display time based on delta position
              const targetTimeMs = (deltaCount * msPerDelta) + initialBufferMs;
              delayMs = Math.max(0, targetTimeMs - elapsedMs);
            }

            // Emit the CUMULATIVE text (not just the delta) to avoid race conditions
            // The frontend will replace the partial text entirely, avoiding append issues
            if (this.callbacks?.onTranscriptDelta) {
              this.callbacks.onTranscriptDelta(
                'assistant',
                currentBuffer.text, // Send cumulative text, not just delta
                responseId,
                message.item_id,
                speechStartTime,
                delayMs
              );
            }
          }
          break;

        case 'conversation.item.input_audio_transcription.delta':
          // Stream user transcript word-by-word
          if (message.delta && message.item_id) {
            const itemId = message.item_id;
            const currentBuffer = this.transcriptBuffers.get(itemId) || {
              role: 'user' as const,
              text: ''
            };

            currentBuffer.text += message.delta;
            this.transcriptBuffers.set(itemId, currentBuffer);

            // Get the speech start time (when conversation item was created)
            const speechStartTime = this.speechStartTimes.get(itemId);

            // Emit delta to UI with accurate speech start timestamp
            // User speech is already real-time on the phone, so no delay needed
            if (this.callbacks?.onTranscriptDelta) {
              this.callbacks.onTranscriptDelta(
                'user',
                message.delta,
                itemId,
                undefined,
                speechStartTime,
                0 // No delay for user transcripts
              );
            }
          }
          break;

        case 'response.function_call_arguments.delta':
          // Buffer function call arguments as they stream in
          if (message.call_id && message.delta) {
            const current = this.functionCallBuffer.get(message.call_id) || '';
            this.functionCallBuffer.set(message.call_id, current + message.delta);
          }
          break;

        case 'response.function_call_arguments.done':
          // Function call arguments complete - execute the function
          if (message.call_id && message.name) {
            const argsString = this.functionCallBuffer.get(message.call_id) || '{}';
            this.functionCallBuffer.delete(message.call_id);

            // Execute function asynchronously
            this.executeFunctionCall({
              call_id: message.call_id,
              name: message.name,
              arguments: argsString
            }).catch(err => {
              console.error(`❌ Error executing function ${message.name}:`, err);
            });
          }
          break;

        case 'error':
          console.error('❌ OpenAI error:', message.error);
          this.callbacks?.onError(new Error(message.error.message));
          break;

        default:
          console.log('ℹ️  Unhandled OpenAI message type:', message.type);
          // Debug: Log transcript-related messages
          if (message.type && message.type.includes('transcript')) {
            console.log('🔍 DEBUG - Full transcript message:', JSON.stringify(message, null, 2));
          }
      }
    } catch (error) {
      console.error('❌ Error parsing OpenAI message:', error);
    }
  }

  sendAudio(audioData: Uint8Array): void {
    if (!this.ws || !this.connected) return;

    const base64Audio = this.uint8ArrayToBase64(audioData);

    const message = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    };

    this.ws.send(JSON.stringify(message));
  }

  sendText(text: string): void {
    if (!this.ws || !this.connected) return;

    // Create a conversation item with user message
    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(message));

    // Trigger a response
    const responseMessage = {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    };

    this.ws.send(JSON.stringify(responseMessage));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.callbacks = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a function call and send results back to OpenAI
   */
  private async executeFunctionCall(callData: { call_id: string; name: string; arguments: string }): Promise<void> {
    const { call_id, name, arguments: argsString } = callData;
    const startTime = Date.now();
    let functionCallId: number | null = null;
    let skillExecutionId: string | null = null;

    try {
      const args = JSON.parse(argsString);
      console.log(`🔧 Executing function: ${name}`, args);

      // Emit function call event to frontend
      if (this.callbacks?.onFunctionCall) {
        this.callbacks.onFunctionCall(call_id, name, args);
      }

      // Log function call to database
      if (this.conversationLogger && this.conversationId) {
        try {
          functionCallId = await this.conversationLogger.logFunctionCall(this.conversationId, {
            callId: call_id,
            functionName: name,
            arguments: args
          });
        } catch (error) {
          console.error('Failed to log function call:', error);
        }
      }

      // Route to appropriate handler
      let result: any;
      switch (name) {
        case 'log_conversation_start':
          result = await this.handleLogConversationStart(args);
          break;
        case 'schedule_appointment':
          result = await this.handleScheduleAppointment(args);
          break;
        case 'check_availability':
          result = await this.handleCheckAvailability(args);
          break;
        case 'book_appointment':
          result = await this.handleBookAppointment(args);
          break;
        case 'get_patient_info':
          result = await this.handleGetPatientInfo(args);
          break;
        case 'send_confirmation_sms':
          result = await this.handleSendConfirmationSMS(args);
          break;
        case 'reschedule_appointment':
          result = await this.handleRescheduleAppointment(args);
          break;
        case 'cancel_appointment':
          result = await this.handleCancelAppointment(args);
          break;
        case 'get_appointment_history':
          result = await this.handleGetAppointmentHistory(args);
          break;
        case 'add_appointment_notes':
          result = await this.handleAddAppointmentNotes(args);
          break;
        case 'send_appointment_reminder':
          result = await this.handleSendAppointmentReminder(args);
          break;
        case 'check_insurance_eligibility':
          result = await this.handleCheckInsuranceEligibility(args);
          break;
        case 'get_clinic_hours':
          result = await this.handleGetClinicHours(args);
          break;
        case 'get_directions':
          result = await this.handleGetDirections(args);
          break;
        case 'get_available_services':
          result = await this.handleGetAvailableServices(args);
          break;
        case 'get_appointment_preparation':
          result = await this.handleGetAppointmentPreparation(args);
          break;
        // NEMT (Non-Emergency Medical Transportation) tools
        case 'verify_member':
          result = await this.handleVerifyMember(args);
          break;
        case 'get_member_info':
          result = await this.handleGetMemberInfo(args);
          break;
        case 'check_ride_eligibility':
          result = await this.handleCheckRideEligibility(args);
          break;
        case 'search_address':
          result = await this.handleSearchAddress(args);
          break;
        case 'book_ride':
          result = await this.handleBookRide(args);
          break;
        case 'get_ride_status':
          result = await this.handleGetRideStatus(args);
          break;
        case 'cancel_ride':
          result = await this.handleCancelRide(args);
          break;
        case 'update_ride':
          result = await this.handleUpdateRide(args);
          break;
        case 'add_companion':
          result = await this.handleAddCompanion(args);
          break;
        case 'check_nemt_availability':
          result = await this.handleCheckNEMTAvailability(args);
          break;
        default:
          throw new Error(`Unknown function: ${name}`);
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ Function ${name} completed in ${executionTime}ms`);

      // Update function call result in database
      if (this.conversationLogger && functionCallId !== null) {
        try {
          await this.conversationLogger.updateFunctionResult(functionCallId, {
            result: result,
            status: 'success',
            executionTimeMs: executionTime
          });
        } catch (error) {
          console.error('Failed to update function result:', error);
        }
      }

      // Log as skill execution
      if (this.dbAdapter && this.conversationId) {
        try {
          skillExecutionId = await this.dbAdapter.createSkillExecutionLog({
            conversationId: this.conversationId,
            skillName: name,
            stepNumber: 1,
            stepName: `Execute ${name}`,
            toolUsed: name,
            inputArgs: argsString,
            outputResult: JSON.stringify(result),
            executionStatus: 'success',
            executionTimeMs: executionTime
          });
          console.log(`📊 Skill execution logged: ${skillExecutionId}`);
        } catch (error) {
          console.error('Failed to log skill execution:', error);
        }
      }

      // Emit function result success event to frontend
      if (this.callbacks?.onFunctionResult) {
        this.callbacks.onFunctionResult(call_id, name, result, executionTime, 'success');
      }

      // Send function result back to OpenAI
      const functionOutput = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call_id,
          output: JSON.stringify(result)
        }
      };
      this.ws!.send(JSON.stringify(functionOutput));

      // Trigger new response
      const responseCreate = {
        type: 'response.create',
        response: { modalities: ['audio', 'text'] }
      };
      this.ws!.send(JSON.stringify(responseCreate));

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Error executing function ${name}:`, error);

      // Update function call error in database
      if (this.conversationLogger && functionCallId !== null) {
        try {
          await this.conversationLogger.updateFunctionResult(functionCallId, {
            result: null,
            status: 'error',
            executionTimeMs: executionTime,
            errorMessage: error.message
          });
        } catch (logError) {
          console.error('Failed to log function error:', logError);
        }
      }

      // Log failed skill execution
      if (this.dbAdapter && this.conversationId) {
        try {
          skillExecutionId = await this.dbAdapter.createSkillExecutionLog({
            conversationId: this.conversationId,
            skillName: name,
            stepNumber: 1,
            stepName: `Execute ${name}`,
            toolUsed: name,
            inputArgs: argsString,
            outputResult: undefined,
            executionStatus: 'failure',
            executionTimeMs: executionTime,
            errorMessage: error.message
          });
          console.log(`📊 Failed skill execution logged: ${skillExecutionId}`);
        } catch (logError) {
          console.error('Failed to log skill execution error:', logError);
        }
      }

      // Emit function result error event to frontend
      if (this.callbacks?.onFunctionResult) {
        this.callbacks.onFunctionResult(call_id, name, null, executionTime, 'error', error.message);
      }

      // Send error response with fallback message
      const errorOutput = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call_id,
          output: JSON.stringify({
            error: true,
            message: `Unable to execute ${name}: ${error.message}`,
            fallback: true
          })
        }
      };
      this.ws!.send(JSON.stringify(errorOutput));

      // Still trigger response so AI can handle the error gracefully
      const responseCreate = {
        type: 'response.create',
        response: { modalities: ['audio', 'text'] }
      };
      this.ws!.send(JSON.stringify(responseCreate));
    }
  }

  /**
   * Handle log_conversation_start function call (mandatory test skill)
   */
  private async handleLogConversationStart(args: any): Promise<any> {
    console.log('🧪 TEST SKILL CALLED: log_conversation_start', args);
    return {
      success: true,
      message: 'Conversation start logged successfully',
      timestamp: new Date().toISOString(),
      test_confirmed: args.greeting_confirmed
    };
  }

  /**
   * Handle schedule_appointment skill call
   * This is a multi-step skill that orchestrates the complete scheduling workflow
   */
  private async handleScheduleAppointment(args: {
    date: string;
    time_range: 'morning' | 'afternoon' | 'evening';
    num_children: number;
    child_names: string[];
    appointment_type: 'exam' | 'cleaning' | 'exam_and_cleaning' | 'emergency';
    phone_number: string;
    appointment_time?: string;
  }): Promise<any> {
    console.log('🎯 SKILL CALLED: schedule_appointment', args);

    if (!this.dbAdapter || !this.conversationId) {
      throw new Error('Database adapter or conversation ID not set');
    }

    // Create skill context
    const skillContext: SkillContext = {
      conversationId: this.conversationId,
      patientId: this.currentPatientId || undefined,
      phoneNumber: this.phoneNumber || args.phone_number
    };

    // Instantiate the skill
    console.log('🎨 Instantiating ScheduleAppointmentSkill...');
    const skill = new ScheduleAppointmentSkill(
      this.dbAdapter,
      this.toolRegistry,
      skillContext
    );
    console.log('✅ ScheduleAppointmentSkill instantiated successfully');
    console.log('🔧 Executing skill with args:', args);

    // Execute the skill (backend version accepts snake_case args directly)
    const result = await skill.execute(args);

    console.log('✅ SKILL COMPLETED: schedule_appointment', result);

    return result;
  }

  /**
   * Handle check_availability function call
   */
  private async handleCheckAvailability(args: {
    date?: string;
    time_range?: string;
    num_children?: number;
  }): Promise<any> {
    console.log('📅 Checking availability:', args);
    if (!args.date || !args.time_range || !args.num_children) {
      return {
        available: false,
        error: 'Date, time range, and number of children are required to check availability.'
      };
    }
    return await this.appointmentService!.checkAvailability({
      date: args.date,
      time_range: args.time_range,
      num_children: args.num_children
    });
  }

  /**
   * Format confirmation details for SMS
   */
  private formatConfirmationDetails(booking: any): string {
    const childNames = booking.child_names.join(' and ');
    const date = new Date(booking.appointment_time);
    const formattedTime = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${childNames} - ${formattedTime}`;
  }

  /**
   * Handle book_appointment function call
   */
  private async handleBookAppointment(args: {
    child_names?: string[];
    appointment_time?: string;
    appointment_type?: string;
  }): Promise<any> {
    console.log('📝 Booking appointment:', args);
    if (!args.child_names || !Array.isArray(args.child_names) || args.child_names.length === 0) {
      return { status: 'error', error: 'Child names are required. Please provide the names of the children to schedule.' };
    }
    if (!args.appointment_time) {
      return { status: 'error', error: 'Appointment time is required.' };
    }
    if (!args.appointment_type) {
      return { status: 'error', error: 'Appointment type is required (exam, cleaning, exam_and_cleaning, or emergency).' };
    }
    const result = await this.appointmentService!.bookAppointment({
      child_names: args.child_names,
      appointment_time: args.appointment_time,
      appointment_type: args.appointment_type
    });

    // Update conversation outcome if booking succeeded
    if (this.conversationLogger && this.conversationId && result.status === 'confirmed') {
      try {
        await this.conversationLogger.endConversation(this.conversationId, {
          outcome: 'appointment_scheduled',
          outcomeDetails: JSON.stringify(result)
        });
      } catch (error) {
        console.error('Failed to update conversation outcome:', error);
      }
    }

    // Auto-send SMS confirmation if configured for auto or hybrid mode
    if (result.status === 'confirmed' &&
        (config.sms.mode === 'auto' || config.sms.mode === 'hybrid')) {
      try {
        console.log(`📱 Auto-sending SMS confirmation (mode: ${config.sms.mode})`);

        const smsResult = await this.notificationService!.sendConfirmationSMS({
          phone_number: this.phoneNumber!,
          appointment_details: this.formatConfirmationDetails(result),
          booking_id: result.booking_id
        });

        if (smsResult.sent && smsResult.message_sid) {
          // Mark confirmation as sent in database
          await this.appointmentService!.markConfirmationSent(
            result.booking_id,
            smsResult.message_sid
          );
          result.sms_sent = true;
          result.sms_sid = smsResult.message_sid;
          console.log(`✅ Auto-sent SMS confirmation: ${smsResult.message_sid}`);
        } else {
          console.log(`⚠️  SMS auto-send ${smsResult.test_mode ? '(test mode)' : 'failed'}: ${smsResult.error || 'unknown error'}`);
          result.sms_sent = false;
        }
      } catch (error: any) {
        console.error('❌ Failed to auto-send SMS:', error.message);
        // Don't fail the booking if SMS fails
        result.sms_sent = false;
        result.sms_error = error.message;
      }
    }

    return result;
  }

  /**
   * Handle get_patient_info function call
   */
  private async handleGetPatientInfo(args: {
    phone_number?: string;
  }): Promise<any> {
    console.log('👤 Getting patient info:', args);
    if (!args.phone_number) {
      return { found: false, error: 'Phone number is required to look up patient information.' };
    }
    return await this.crmService!.getPatientInfo(args.phone_number);
  }

  /**
   * Handle send_confirmation_sms function call
   */
  private async handleSendConfirmationSMS(args: {
    phone_number?: string;
    appointment_details?: string;
  }): Promise<any> {
    console.log('📱 Sending SMS confirmation:', args);

    // Determine the phone number to use
    // If AI passed a placeholder like "on file", use the call's phone number
    let phoneToUse = args.phone_number;
    const placeholderPhrases = ['on file', 'current', 'same', 'this number', 'their number', 'member'];
    const isPlaceholder = !phoneToUse || placeholderPhrases.some(phrase =>
      phoneToUse?.toLowerCase().includes(phrase)
    );

    if (isPlaceholder) {
      if (this.phoneNumber) {
        console.log(`📱 Using call phone number instead of placeholder: ${this.phoneNumber}`);
        phoneToUse = this.phoneNumber;
      } else {
        return { sent: false, error: 'No phone number available. Please provide a valid phone number.' };
      }
    }

    if (!args.appointment_details) {
      return { sent: false, error: 'Appointment details are required for the SMS.' };
    }

    return await this.notificationService!.sendConfirmationSMS({
      phone_number: phoneToUse!,
      appointment_details: args.appointment_details!
    });
  }

  /**
   * Handle reschedule_appointment function call
   */
  private async handleRescheduleAppointment(args: {
    booking_id?: string;
    new_appointment_time?: string;
    reason?: string;
  }): Promise<any> {
    console.log('🔄 Rescheduling appointment:', args);
    if (!args.booking_id) {
      return { success: false, error: 'Booking ID is required to reschedule the appointment.' };
    }
    if (!args.new_appointment_time) {
      return { success: false, error: 'New appointment time is required.' };
    }
    return await this.appointmentService!.rescheduleAppointment({
      booking_id: args.booking_id,
      new_appointment_time: args.new_appointment_time,
      reason: args.reason
    });
  }

  /**
   * Handle cancel_appointment function call
   */
  private async handleCancelAppointment(args: {
    booking_id?: string;
    reason?: string;
  }): Promise<any> {
    console.log('❌ Cancelling appointment:', args);
    if (!args.booking_id) {
      return { success: false, error: 'Booking ID is required to cancel the appointment.' };
    }
    if (!args.reason) {
      return { success: false, error: 'A reason is required for cancellation.' };
    }
    await this.appointmentService!.cancelAppointment(args.booking_id, args.reason);
    return { success: true, message: 'Appointment cancelled successfully' };
  }

  /**
   * Handle get_appointment_history function call
   */
  private async handleGetAppointmentHistory(args: any): Promise<any> {
    console.log('📜 Getting appointment history');
    if (!this.currentPatientId) {
      throw new Error('No patient context set');
    }
    return await this.appointmentService!.getAppointmentHistory(this.currentPatientId);
  }

  /**
   * Handle add_appointment_notes function call
   */
  private async handleAddAppointmentNotes(args: {
    booking_id?: string;
    notes?: string;
  }): Promise<any> {
    console.log('📝 Adding appointment notes:', args);
    if (!args.booking_id) {
      return { success: false, error: 'Booking ID is required.' };
    }
    if (!args.notes) {
      return { success: false, error: 'Notes content is required.' };
    }
    return await this.appointmentService!.addAppointmentNotes({
      booking_id: args.booking_id,
      notes: args.notes
    });
  }

  /**
   * Handle send_appointment_reminder function call
   */
  private async handleSendAppointmentReminder(args: {
    phone_number?: string;
    patient_name?: string;
    child_name?: string;
    appointment_time?: string;
    location?: string;
  }): Promise<any> {
    console.log('⏰ Sending appointment reminder:', args);
    const missing = [];
    if (!args.phone_number) missing.push('phone_number');
    if (!args.patient_name) missing.push('patient_name');
    if (!args.child_name) missing.push('child_name');
    if (!args.appointment_time) missing.push('appointment_time');
    if (!args.location) missing.push('location');
    if (missing.length > 0) {
      return { sent: false, error: `Missing required fields: ${missing.join(', ')}` };
    }
    return await this.notificationService!.sendAppointmentReminder({
      phone_number: args.phone_number!,
      patient_name: args.patient_name!,
      child_name: args.child_name!,
      appointment_time: args.appointment_time!,
      location: args.location!
    });
  }

  /**
   * Handle check_insurance_eligibility function call
   */
  private async handleCheckInsuranceEligibility(args: {
    medicaid_id?: string;
    child_name?: string;
    date_of_birth?: string;
  }): Promise<any> {
    console.log('🏥 Checking insurance eligibility:', args);
    if (!args.medicaid_id) {
      return { eligible: false, error: 'Medicaid ID is required.' };
    }
    if (!args.child_name) {
      return { eligible: false, error: 'Child name is required.' };
    }
    return await this.notificationService!.checkInsuranceEligibility({
      medicaid_id: args.medicaid_id,
      child_name: args.child_name,
      date_of_birth: args.date_of_birth
    });
  }

  /**
   * Handle get_clinic_hours function call
   */
  private async handleGetClinicHours(args: { date?: string }): Promise<any> {
    console.log('🕐 Getting clinic hours');
    return await this.clinicService!.getClinicHours(args);
  }

  /**
   * Handle get_directions function call
   */
  private async handleGetDirections(args: { from_address?: string }): Promise<any> {
    console.log('🗺️  Getting directions');
    return await this.clinicService!.getDirections(args);
  }

  /**
   * Handle get_available_services function call
   */
  private async handleGetAvailableServices(args: any): Promise<any> {
    console.log('🦷 Getting available services');
    return await this.clinicService!.getAvailableServices();
  }

  /**
   * Handle get_appointment_preparation function call
   */
  private async handleGetAppointmentPreparation(args: any): Promise<any> {
    console.log('📋 Getting appointment preparation info');
    return await this.clinicService!.getAppointmentPreparation();
  }

  // ============================================================================
  // NEMT (Non-Emergency Medical Transportation) HANDLERS
  // ============================================================================

  private async handleVerifyMember(args: {
    member_id?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
  }): Promise<any> {
    console.log('🔐 Verifying member:', args.member_id);
    if (!args.member_id || !args.first_name || !args.last_name || !args.date_of_birth) {
      return {
        verified: false,
        error: 'Member ID, first name, last name, and date of birth are all required for verification.'
      };
    }
    return NEMTService.verifyMember({
      member_id: args.member_id,
      first_name: args.first_name,
      last_name: args.last_name,
      date_of_birth: args.date_of_birth
    });
  }

  private async handleGetMemberInfo(args: { member_id?: string }): Promise<any> {
    console.log('👤 Getting member info:', args.member_id);
    if (!args.member_id) {
      return { error: 'Member ID is required.' };
    }
    return NEMTService.getMemberInfo({ member_id: args.member_id });
  }

  private async handleCheckRideEligibility(args: { member_id?: string }): Promise<any> {
    console.log('✅ Checking ride eligibility:', args.member_id);
    if (!args.member_id) {
      return {
        eligible: false,
        remaining_rides: 0,
        total_rides: 0,
        rides_used: 0,
        plan_type: 'unknown',
        eligibility_status: 'unknown',
        error: 'Member ID is required.'
      };
    }
    return NEMTService.checkRideEligibility({ member_id: args.member_id });
  }

  private async handleSearchAddress(args: { query?: string; city?: string; state?: string }): Promise<any> {
    console.log('🏠 Searching address:', args.query);
    if (!args.query) {
      return { found: false, suggestions: [], error: 'Address query is required.' };
    }
    return NEMTService.searchAddress({ query: args.query, city: args.city, state: args.state });
  }

  private async handleBookRide(args: any): Promise<any> {
    console.log('🚗 Booking ride for member:', args.member_id);
    // Validate required fields
    const required = ['member_id', 'trip_type', 'pickup_address', 'pickup_city', 'pickup_state',
                      'pickup_zip', 'dropoff_address', 'dropoff_city', 'dropoff_state', 'dropoff_zip',
                      'pickup_date', 'pickup_time', 'appointment_time', 'assistance_type'];
    const missing = required.filter(field => !args[field]);
    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missing.join(', ')}. Please collect all ride information before booking.`
      };
    }
    return NEMTService.bookRide(args);
  }

  private async handleGetRideStatus(args: { confirmation_number?: string }): Promise<any> {
    console.log('📍 Getting ride status:', args.confirmation_number);
    if (!args.confirmation_number) {
      return {
        found: false,
        error: 'Confirmation number is required. Please ask the member for their ride confirmation number.'
      };
    }
    return NEMTService.getRideStatus({ confirmation_number: args.confirmation_number });
  }

  private async handleCancelRide(args: { confirmation_number?: string; reason?: string }): Promise<any> {
    console.log('❌ Cancelling ride:', args.confirmation_number);
    if (!args.confirmation_number) {
      return { success: false, error: 'Confirmation number is required.' };
    }
    return NEMTService.cancelRide({ confirmation_number: args.confirmation_number, reason: args.reason });
  }

  private async handleUpdateRide(args: any): Promise<any> {
    console.log('✏️ Updating ride:', args.confirmation_number);
    if (!args.confirmation_number) {
      return { success: false, error: 'Confirmation number is required.' };
    }
    return NEMTService.updateRide(args);
  }

  private async handleAddCompanion(args: {
    confirmation_number?: string;
    companion_name?: string;
    companion_phone?: string;
    relationship?: string;
  }): Promise<any> {
    console.log('👥 Adding companion to ride:', args.confirmation_number);
    if (!args.confirmation_number || !args.companion_name || !args.companion_phone) {
      return { success: false, error: 'Confirmation number, companion name, and phone are required.' };
    }
    return NEMTService.addCompanion({
      confirmation_number: args.confirmation_number,
      companion_name: args.companion_name,
      companion_phone: args.companion_phone,
      relationship: args.relationship
    });
  }

  private async handleCheckNEMTAvailability(args: {
    date?: string;
    time?: string;
    pickup_zip?: string;
    assistance_type?: string;
  }): Promise<any> {
    console.log('📅 Checking NEMT availability:', args.date, args.time);
    if (!args.date || !args.time || !args.pickup_zip || !args.assistance_type) {
      return {
        available: false,
        error: 'Date, time, pickup ZIP code, and assistance type are all required to check availability.'
      };
    }
    return NEMTService.checkAvailability({
      date: args.date,
      time: args.time,
      pickup_zip: args.pickup_zip,
      assistance_type: args.assistance_type
    });
  }

  // Node.js-compatible base64 conversion (using Buffer instead of atob/btoa)
  private base64ToUint8Array(base64: string): Uint8Array {
    const buffer = Buffer.from(base64, 'base64');
    return new Uint8Array(buffer);
  }

  private uint8ArrayToBase64(buffer: Uint8Array): string {
    return Buffer.from(buffer).toString('base64');
  }
}
