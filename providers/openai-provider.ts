import { IVoiceProvider, ProviderConfig, VoiceProviderCallbacks, ProviderMessage } from '../types';
import type { DatabaseAdapter } from '../database/db-interface';
import { ConversationLogger } from '../services/conversation-logger';
import { AppointmentService } from '../services/appointment-service';
import { CRMService } from '../services/crm-service';
import { NotificationService } from '../services/notification-service';
import { ClinicService } from '../services/clinic-service';
import { NEMTService, setMockDataService } from '../services/nemt-service';
import { MockDataService } from '../services/mock-data-service';

/**
 * OpenAI Realtime API provider for browser
 * Uses browser WebSocket API and includes full function calling support
 */
export class OpenAIProvider implements IVoiceProvider {
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
  private transcriptBuffers: Map<string, { role: 'user' | 'assistant'; text: string; itemId?: string }> = new Map();

  // Track when speech actually started (for accurate transcript ordering)
  private speechStartTimes: Map<string, Date> = new Map();

  // Dynamic tool system (only initialized if flag enabled)
  private toolSystemMode: 'static' | 'dynamic' | 'error-fallback' = 'static';
  private toolRegistry: any = null; // Will be ToolRegistry | null
  private skillEngine: any = null; // Will be SkillEngine | null
  private toolAdapter: any = null; // Will be ProviderToolAdapter | null
  private initializationPromise: Promise<void> | null = null;

  // Tool configs from demo configuration
  private configuredToolConfigs: import('../types/demo-config').ToolConfig[] = [];

  // Mock data service for per-demo data pools
  private mockDataService: MockDataService | null = null;

  constructor(dbAdapter?: DatabaseAdapter) {
    if (dbAdapter) {
      this.dbAdapter = dbAdapter;
      this.conversationLogger = new ConversationLogger(dbAdapter);
      this.appointmentService = new AppointmentService(dbAdapter);
      this.crmService = new CRMService(dbAdapter);
      this.notificationService = new NotificationService();
      this.clinicService = new ClinicService();

      // Initialize dynamic system if flag enabled (store promise to await later)
      this.initializationPromise = this.initializeDynamicSystem(dbAdapter);
    } else {
      console.warn('⚠️  OpenAIProvider: No database adapter provided - function calling disabled');
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
   * Initialize dynamic tool system if feature flag is enabled
   */
  private async initializeDynamicSystem(dbAdapter: DatabaseAdapter): Promise<void> {
    try {
      // Dynamic import to avoid loading if not needed
      const { initializeDynamicSystem } = await import('../lib/initialization');
      const { ProviderToolAdapter } = await import('./tool-adapter');

      const systemState = await initializeDynamicSystem(dbAdapter);

      this.toolSystemMode = systemState.mode;
      this.toolRegistry = systemState.toolRegistry;
      this.skillEngine = systemState.skillEngine;

      if (systemState.initialized && this.toolRegistry && this.skillEngine) {
        this.toolAdapter = new ProviderToolAdapter(this.toolRegistry, this.skillEngine);
        console.log('✅ OpenAI Provider using DYNAMIC tool system');
      } else if (systemState.mode === 'error-fallback') {
        console.warn(`⚠️  OpenAI Provider falling back to STATIC (${systemState.error?.message})`);
      } else {
        console.log('📦 OpenAI Provider using STATIC function handlers');
      }
    } catch (error) {
      console.error('❌ Failed to initialize dynamic system:', error);
      this.toolSystemMode = 'static';
      console.log('📦 OpenAI Provider using STATIC function handlers (initialization error)');
    }
  }

  async connect(config: ProviderConfig, callbacks: VoiceProviderCallbacks): Promise<void> {
    this.callbacks = callbacks;

    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.model)}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url, [
          'realtime',
          `openai-insecure-api-key.${config.apiKey}`,
          'openai-beta.realtime-v1'
        ]);

        this.ws.addEventListener('open', async () => {
          console.log('✅ OpenAI Realtime WebSocket opened');
          this.connected = true;

          // CRITICAL: Wait for dynamic system initialization to complete before sending session config
          if (this.initializationPromise) {
            console.log('⏳ Waiting for dynamic tool system initialization...');
            await this.initializationPromise;
            console.log(`✅ Initialization complete. Mode: ${this.toolSystemMode}`);
          }

          // Create conversation in database
          if (this.conversationLogger) {
            try {
              console.log('🔍 Starting conversation with logger:', {
                hasLogger: !!this.conversationLogger,
                patientId: this.currentPatientId,
                phoneNumber: this.phoneNumber
              });
              this.conversationId = await this.conversationLogger.startConversation({
                patientId: this.currentPatientId || undefined,
                phoneNumber: this.phoneNumber || '+1-555-TEST',
                direction: 'outbound',
                provider: 'openai'
              });
              console.log(`✅ Conversation created: ${this.conversationId}`);
            } catch (error) {
              console.error('❌ Failed to create conversation:', error);
              console.error('Error details:', error);
            }
          } else {
            console.error('❌ No conversation logger available - conversation will not be tracked');
          }

          // Send session configuration
          this.sendSessionUpdate(config);

          // Emit tool system mode to UI
          if (this.callbacks?.onToolSystemMode) {
            this.callbacks.onToolSystemMode(this.toolSystemMode);
          }

          this.callbacks?.onOpen();
          resolve();
        });

        this.ws.addEventListener('message', (event) => {
          this.handleMessage(event.data);
        });

        this.ws.addEventListener('close', () => {
          console.log('🔌 OpenAI Realtime WebSocket closed');
          this.connected = false;
          this.callbacks?.onClose();
        });

        this.ws.addEventListener('error', (event) => {
          console.error('❌ OpenAI Realtime WebSocket error:', event);
          this.callbacks?.onError(new Error('WebSocket connection failed'));
          reject(new Error('WebSocket connection failed'));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get static tool definitions (hardcoded)
   * Used when dynamic tool system is disabled or unavailable
   */
  private getStaticToolDefinitions(): any[] {
    return [
      {
        type: 'function',
        name: 'check_availability',
        description: 'Check available appointment slots for a specific date and time range. Use when the user asks about available times.',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'The date to check availability (YYYY-MM-DD format)',
            },
            time_range: {
              type: 'string',
              enum: ['morning', 'afternoon', 'evening'],
              description: 'Preferred time of day'
            },
            num_children: {
              type: 'integer',
              description: 'Number of children to schedule',
              minimum: 1
            }
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
            child_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of children to schedule'
            },
            appointment_time: {
              type: 'string',
              description: 'ISO 8601 datetime for appointment'
            },
            appointment_type: {
              type: 'string',
              enum: ['exam', 'cleaning', 'exam_and_cleaning', 'emergency']
            }
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
            phone_number: {
              type: 'string',
              description: 'Patient phone number'
            }
          },
          required: ['phone_number']
        }
      },
      {
        type: 'function',
        name: 'send_confirmation_sms',
        description: 'Send SMS confirmation after booking appointment',
        parameters: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'Recipient phone number'
            },
            appointment_details: {
              type: 'string',
              description: 'Appointment details for SMS'
            }
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
            booking_id: {
              type: 'string',
              description: 'The booking ID of the appointment to reschedule'
            },
            new_appointment_time: {
              type: 'string',
              description: 'New ISO 8601 datetime for the appointment'
            },
            reason: {
              type: 'string',
              description: 'Optional reason for rescheduling'
            }
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
            booking_id: {
              type: 'string',
              description: 'The booking ID of the appointment to cancel'
            },
            reason: {
              type: 'string',
              description: 'Reason for cancellation'
            }
          },
          required: ['booking_id', 'reason']
        }
      },
      {
        type: 'function',
        name: 'get_appointment_history',
        description: 'Get appointment history for the current patient',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        type: 'function',
        name: 'add_appointment_notes',
        description: 'Add notes to an existing appointment (e.g., special needs, preferences)',
        parameters: {
          type: 'object',
          properties: {
            booking_id: {
              type: 'string',
              description: 'The booking ID of the appointment'
            },
            notes: {
              type: 'string',
              description: 'Notes to add to the appointment'
            }
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
            phone_number: {
              type: 'string',
              description: 'Recipient phone number'
            },
            patient_name: {
              type: 'string',
              description: 'Parent/guardian name'
            },
            child_name: {
              type: 'string',
              description: 'Child name'
            },
            appointment_time: {
              type: 'string',
              description: 'ISO 8601 datetime of appointment'
            },
            location: {
              type: 'string',
              description: 'Clinic location'
            }
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
            medicaid_id: {
              type: 'string',
              description: 'Child Medicaid ID number'
            },
            child_name: {
              type: 'string',
              description: 'Child name'
            },
            date_of_birth: {
              type: 'string',
              description: 'Child date of birth (YYYY-MM-DD)'
            }
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
            date: {
              type: 'string',
              description: 'Optional specific date to check (YYYY-MM-DD)'
            }
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
            from_address: {
              type: 'string',
              description: 'Optional starting address for directions'
            }
          },
          required: []
        }
      },
      {
        type: 'function',
        name: 'get_available_services',
        description: 'Get list of available dental services and their coverage status',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        type: 'function',
        name: 'get_appointment_preparation',
        description: 'Get information about what to bring and how to prepare for an appointment',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },

      // ============================================================================
      // NEMT (Non-Emergency Medical Transportation) TOOLS
      // ============================================================================

      {
        type: 'function',
        name: 'verify_member',
        description: 'Verify member identity using Member ID, name, and date of birth. MUST be called before any account access.',
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member ID number' },
            first_name: { type: 'string', description: 'Member first name' },
            last_name: { type: 'string', description: 'Member last name' },
            date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' }
          },
          required: ['member_id', 'first_name', 'last_name', 'date_of_birth']
        }
      },
      {
        type: 'function',
        name: 'get_member_info',
        description: 'Retrieve full member profile including address, assistance type, and ride history',
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
        description: 'Check remaining rides and eligibility status for the current benefit period',
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
        description: 'Validate and autocomplete an address for pickup or dropoff',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Address search query' },
            city: { type: 'string', description: 'City to filter results' },
            state: { type: 'string', description: 'State to filter results' }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'book_ride',
        description: 'Book a one-way or round-trip medical transportation ride',
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Member ID number' },
            trip_type: { type: 'string', enum: ['one_way', 'round_trip'], description: 'Type of trip' },
            pickup_address: { type: 'string', description: 'Full pickup address' },
            pickup_city: { type: 'string', description: 'Pickup city' },
            pickup_state: { type: 'string', description: 'Pickup state' },
            pickup_zip: { type: 'string', description: 'Pickup ZIP code' },
            dropoff_address: { type: 'string', description: 'Full dropoff address' },
            dropoff_city: { type: 'string', description: 'Dropoff city' },
            dropoff_state: { type: 'string', description: 'Dropoff state' },
            dropoff_zip: { type: 'string', description: 'Dropoff ZIP code' },
            pickup_date: { type: 'string', description: 'Pickup date (YYYY-MM-DD)' },
            pickup_time: { type: 'string', description: 'Pickup time (HH:MM)' },
            appointment_time: { type: 'string', description: 'Appointment time (HH:MM)' },
            assistance_type: { type: 'string', enum: ['ambulatory', 'wheelchair', 'stretcher', 'wheelchair_xl'], description: 'Type of mobility assistance needed' },
            facility_name: { type: 'string', description: 'Name of medical facility' },
            return_trip_type: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
            return_pickup_time: { type: 'string', description: 'Return pickup time if scheduled (HH:MM)' },
            notes: { type: 'string', description: 'Additional notes or special instructions' }
          },
          required: ['member_id', 'trip_type', 'pickup_address', 'pickup_city', 'pickup_state', 'pickup_zip', 'dropoff_address', 'dropoff_city', 'dropoff_state', 'dropoff_zip', 'pickup_date', 'pickup_time', 'appointment_time', 'assistance_type']
        }
      },
      {
        type: 'function',
        name: 'get_ride_status',
        description: 'Check the status of an existing ride using confirmation number',
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
        description: 'Modify details of an existing ride',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Ride confirmation number' },
            pickup_time: { type: 'string', description: 'New pickup time (HH:MM)' },
            pickup_date: { type: 'string', description: 'New pickup date (YYYY-MM-DD)' },
            appointment_time: { type: 'string', description: 'New appointment time (HH:MM)' },
            return_trip_type: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
            return_pickup_time: { type: 'string', description: 'Return pickup time if scheduled (HH:MM)' },
            notes: { type: 'string', description: 'Additional notes' }
          },
          required: ['confirmation_number']
        }
      },
      {
        type: 'function',
        name: 'add_companion',
        description: 'Add a companion to travel with the member on their ride',
        parameters: {
          type: 'object',
          properties: {
            confirmation_number: { type: 'string', description: 'Ride confirmation number' },
            companion_name: { type: 'string', description: 'Companion full name' },
            companion_phone: { type: 'string', description: 'Companion phone number' },
            relationship: { type: 'string', description: 'Relationship to member (optional)' }
          },
          required: ['confirmation_number', 'companion_name', 'companion_phone']
        }
      },
      {
        type: 'function',
        name: 'check_nemt_availability',
        description: 'Check vehicle availability for a specific date, time, and location',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
            time: { type: 'string', description: 'Time to check (HH:MM)' },
            pickup_zip: { type: 'string', description: 'Pickup ZIP code' },
            assistance_type: { type: 'string', enum: ['ambulatory', 'wheelchair', 'stretcher', 'wheelchair_xl'], description: 'Type of vehicle needed' }
          },
          required: ['date', 'time', 'pickup_zip', 'assistance_type']
        }
      }
    ];
  }

  private sendSessionUpdate(config: ProviderConfig): void {
    if (!this.ws) return;

    // Store tool configs for later reference
    this.configuredToolConfigs = config.toolConfigs || [];

    // Load mock data pools if provided in config
    if (config.mockDataPools && config.mockDataPools.length > 0) {
      console.log(`📦 Loading ${config.mockDataPools.length} mock data pools for demo`);
      this.mockDataService = new MockDataService();
      this.mockDataService.loadPools(config.mockDataPools);
      if (config.demoConfigId) {
        this.mockDataService.setDemoConfigId(config.demoConfigId);
      }
      // Inject into NEMT service
      setMockDataService(this.mockDataService);
    } else {
      // Clear any previous mock data
      setMockDataService(null);
      this.mockDataService = null;
    }

    // Choose tool source based on system mode
    let tools: any[] = [];

    if (this.toolSystemMode === 'dynamic' && this.toolAdapter) {
      // DYNAMIC: Get from registry
      tools = this.toolAdapter.getToolsForProvider('openai');
      console.log(`🔧 Using DYNAMIC tools (${tools.length} tools from registry)`);
    } else if (this.appointmentService && this.crmService) {
      // STATIC: Use hardcoded definitions
      tools = this.getStaticToolDefinitions();
      console.log(`📦 Using STATIC tools (${tools.length} hardcoded tools)`);
    }

    // Filter tools based on demo configuration if toolConfigs are provided
    if (this.configuredToolConfigs.length > 0) {
      const enabledToolNames = new Set(
        this.configuredToolConfigs
          .filter(tc => tc.isEnabled)
          .map(tc => tc.toolName)
      );

      // Filter static/dynamic tools to only those enabled in config
      const filteredTools = tools.filter(tool => enabledToolNames.has(tool.name));

      // Add custom tools from config
      const customToolConfigs = this.configuredToolConfigs.filter(
        tc => tc.toolType === 'custom' && tc.isEnabled
      );

      const customTools = customToolConfigs.map(tc => ({
        type: 'function',
        name: tc.toolName,
        description: tc.description || `Custom tool: ${tc.displayName}`,
        parameters: tc.parametersSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      }));

      tools = [...filteredTools, ...customTools];
      console.log(`🎛️  Filtered to ${tools.length} tools based on demo config (${enabledToolNames.size} enabled, ${customTools.length} custom)`);
    }

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

        // Include tools if available
        ...(tools.length > 0 ? {
          tools: tools,
          tool_choice: 'auto'
        } : {})
      }
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 SENDING TO OPENAI - System Instructions (length: ${config.systemInstruction.length} chars)`);
    console.log(`${'='.repeat(60)}`);
    console.log(config.systemInstruction);
    console.log(`${'='.repeat(60)}\n`);

    this.ws.send(JSON.stringify(sessionConfig));
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'session.created':
          console.log('✅ OpenAI session ready:', message.type);
          break;

        case 'session.updated':
          console.log('✅ OpenAI session ready:', message.type);
          // Trigger the AI to start speaking (for outbound calls)
          console.log('🚀 Triggering AI to start conversation...');
          const triggerResponse = {
            type: 'response.create',
            response: {
              modalities: ['audio', 'text']
            }
          };
          this.ws!.send(JSON.stringify(triggerResponse));
          break;

        case 'response.audio.delta':
          // Audio data comes in base64-encoded PCM16
          if (message.delta) {
            const audioData = this.base64ToUint8Array(message.delta);
            const audioMessage: ProviderMessage = {
              type: 'audio',
              data: audioData
            };
            this.callbacks?.onMessage(audioMessage);
          }
          break;

        case 'response.audio.done':
          console.log('✅ Audio response complete');
          break;

        case 'input_audio_buffer.speech_started':
          console.log('🎤 User started speaking - interrupting');
          // Send interrupt signal to stop AI audio playback
          const interruptMessage: ProviderMessage = {
            type: 'interrupt'
          };
          this.callbacks?.onMessage(interruptMessage);
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('🔇 User stopped speaking');
          break;

        case 'response.audio_transcript.done':
          // Assistant transcript completed - log to database and update UI
          console.log('🔍 DEBUG - response.audio_transcript.done received:', JSON.stringify(message, null, 2));
          if (message.transcript && message.response_id) {
            console.log('📝 Assistant transcript:', message.transcript);

            // Get the speech start time (when response was created)
            const assistantSpeechStartTime = this.speechStartTimes.get(message.response_id);

            // Clear buffer for this response
            this.transcriptBuffers.delete(message.response_id);

            // Update UI via callback (will replace partial with complete)
            if (this.callbacks?.onTranscript) {
              this.callbacks.onTranscript('assistant', message.transcript, assistantSpeechStartTime, message.response_id);
            }

            // Log to database
            if (this.conversationLogger && this.conversationId) {
              await this.conversationLogger.logTurn(this.conversationId, {
                role: 'assistant',
                contentType: 'text',
                contentText: message.transcript
              });
            }
          } else {
            console.log('⚠️  Not logging - transcript:', !!message.transcript, 'logger:', !!this.conversationLogger, 'convId:', !!this.conversationId);
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User transcript completed - log to database and update UI
          console.log('🔍 DEBUG - input_audio_transcription.completed received:', JSON.stringify(message, null, 2));
          if (message.transcript && message.item_id) {
            console.log('📝 User transcript:', message.transcript);

            // Get the speech start time (when conversation item was created)
            const userSpeechStartTime = this.speechStartTimes.get(message.item_id);

            // Clear buffer for this item
            this.transcriptBuffers.delete(message.item_id);

            // Update UI via callback (will replace partial with complete)
            if (this.callbacks?.onTranscript) {
              this.callbacks.onTranscript('user', message.transcript, userSpeechStartTime, message.item_id);
            }

            // Log to database
            if (this.conversationLogger && this.conversationId) {
              await this.conversationLogger.logTurn(this.conversationId, {
                role: 'user',
                contentType: 'text',
                contentText: message.transcript
              });
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
            console.log(`🕐 Conversation item created: ${message.item.id} at ${itemCreatedTime.toISOString()}`);
          }
          break;

        case 'response.created':
          // Capture timestamp when AI response is created (before transcripts start)
          if (message.response?.id) {
            const responseCreatedTime = new Date();
            this.speechStartTimes.set(message.response.id, responseCreatedTime);
            console.log(`🕐 AI response created: ${message.response.id} at ${responseCreatedTime.toISOString()}`);
          }
          break;

        case 'response.done':
        case 'response.output_item.added':
        case 'response.output_item.done':
        case 'response.content_part.added':
        case 'response.content_part.done':
          // These are informational, no action needed
          break;

        case 'response.audio_transcript.delta':
          // Stream AI transcript word-by-word
          console.log('🔤 ASSISTANT DELTA RECEIVED:', message.delta);
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

            // Emit delta to UI with accurate speech start timestamp
            if (this.callbacks?.onTranscriptDelta) {
              this.callbacks.onTranscriptDelta(
                'assistant',
                message.delta,
                responseId,
                message.item_id,
                speechStartTime // Pass the time when AI started speaking
              );
            }
          }
          break;

        case 'input_audio_buffer.committed':
          // This is informational, no action needed
          break;

        case 'conversation.item.input_audio_transcription.delta':
          // Stream user transcript word-by-word
          console.log('🎤 USER DELTA RECEIVED:', message.delta);
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
            if (this.callbacks?.onTranscriptDelta) {
              this.callbacks.onTranscriptDelta(
                'user',
                message.delta,
                itemId,
                undefined, // itemId is the responseId parameter for user
                speechStartTime // Pass the time when user started speaking
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

  async disconnect(): Promise<void> {
    // End conversation before closing
    if (this.conversationLogger && this.conversationId) {
      try {
        await this.conversationLogger.endConversation(this.conversationId, {
          outcome: 'completed',
          outcomeDetails: 'User ended call'
        });
        console.log(`✅ Ended conversation: ${this.conversationId}`);
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.callbacks = null;
    this.conversationId = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a function call and send results back to OpenAI
   */
  /**
   * Execute a function using static handlers (switch statement)
   */
  private async executeStaticFunction(name: string, args: any): Promise<any> {
    switch (name) {
      case 'check_availability':
        return await this.handleCheckAvailability(args);
      case 'book_appointment':
        return await this.handleBookAppointment(args);
      case 'get_patient_info':
        return await this.handleGetPatientInfo(args);
      case 'send_confirmation_sms':
        return await this.handleSendConfirmationSMS(args);
      case 'reschedule_appointment':
        return await this.handleRescheduleAppointment(args);
      case 'cancel_appointment':
        return await this.handleCancelAppointment(args);
      case 'get_appointment_history':
        return await this.handleGetAppointmentHistory(args);
      case 'add_appointment_notes':
        return await this.handleAddAppointmentNotes(args);
      case 'send_appointment_reminder':
        return await this.handleSendAppointmentReminder(args);
      case 'check_insurance_eligibility':
        return await this.handleCheckInsuranceEligibility(args);
      case 'get_clinic_hours':
        return await this.handleGetClinicHours(args);
      case 'get_directions':
        return await this.handleGetDirections(args);
      case 'get_available_services':
        return await this.handleGetAvailableServices(args);
      case 'get_appointment_preparation':
        return await this.handleGetAppointmentPreparation(args);

      // NEMT (Non-Emergency Medical Transportation) tools
      case 'verify_member':
        return this.handleVerifyMember(args);
      case 'get_member_info':
        return this.handleGetMemberInfo(args);
      case 'check_ride_eligibility':
        return this.handleCheckRideEligibility(args);
      case 'search_address':
        return this.handleSearchAddress(args);
      case 'book_ride':
        return this.handleBookRide(args);
      case 'get_ride_status':
        return this.handleGetRideStatus(args);
      case 'cancel_ride':
        return this.handleCancelRide(args);
      case 'update_ride':
        return this.handleUpdateRide(args);
      case 'add_companion':
        return this.handleAddCompanion(args);
      case 'check_nemt_availability':
        return this.handleCheckNEMTAvailability(args);

      default:
        // Check if this is a custom tool from demo config
        const customTool = this.configuredToolConfigs.find(
          tc => tc.toolName === name && tc.toolType === 'custom' && tc.isEnabled
        );

        if (customTool) {
          console.log(`🎛️  Executing custom tool: ${name} (mock response)`);

          // Simulate delay if configured
          if (customTool.mockResponseDelayMs && customTool.mockResponseDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, customTool.mockResponseDelayMs));
          }

          // Return mock response
          if (customTool.mockResponseTemplate) {
            try {
              return JSON.parse(customTool.mockResponseTemplate);
            } catch {
              // If not valid JSON, return as string
              return { success: true, message: customTool.mockResponseTemplate };
            }
          }

          return { success: true, message: `Custom tool ${name} executed successfully` };
        }

        throw new Error(`Unknown function: ${name}`);
    }
  }

  /**
   * Execute a function call and send results back to OpenAI
   */
  private async executeFunctionCall(callData: { call_id: string; name: string; arguments: string }): Promise<void> {
    const { call_id, name, arguments: argsString } = callData;
    const startTime = Date.now();
    let functionCallId: number | null = null;

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

      // Route to appropriate handler based on system mode
      let result: any;

      if (this.toolSystemMode === 'dynamic' && this.toolAdapter) {
        // DYNAMIC PATH: Use ToolRegistry + SkillEngine
        try {
          const context = {
            conversationId: this.conversationId,
            patientId: this.currentPatientId,
            phoneNumber: this.phoneNumber
          };

          console.log(`🔧 DYNAMIC: Executing ${name} via ToolAdapter`);
          result = await this.toolAdapter.execute(name, args, context);
        } catch (dynamicError: any) {
          console.error(`❌ Dynamic execution failed for ${name}:`, dynamicError);

          // Fallback to static if enabled
          const { featureFlags } = await import('../config/feature-flags');
          if (featureFlags.fallbackToStatic) {
            console.warn(`⚠️  Falling back to static handler for ${name}`);
            result = await this.executeStaticFunction(name, args);
          } else {
            throw dynamicError;
          }
        }
      } else {
        // STATIC PATH: Use existing handlers
        console.log(`📦 STATIC: Executing ${name} via switch statement`);
        result = await this.executeStaticFunction(name, args);
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
   * Handle check_availability function call
   */
  private async handleCheckAvailability(args: {
    date: string;
    time_range: string;
    num_children: number;
  }): Promise<any> {
    console.log('📅 Checking availability:', args);
    return await this.appointmentService!.checkAvailability(args);
  }

  /**
   * Handle book_appointment function call
   */
  private async handleBookAppointment(args: {
    child_names: string[];
    appointment_time: string;
    appointment_type: string;
  }): Promise<any> {
    console.log('📝 Booking appointment:', args);
    const result = await this.appointmentService!.bookAppointment(args);

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

    return result;
  }

  /**
   * Handle get_patient_info function call
   */
  private async handleGetPatientInfo(args: {
    phone_number: string;
  }): Promise<any> {
    console.log('👤 Getting patient info:', args);
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
    // If AI passed a placeholder like "on file", use the session's phone number
    let phoneToUse = args.phone_number;
    const placeholderPhrases = ['on file', 'current', 'same', 'this number', 'their number', 'member'];
    const isPlaceholder = !phoneToUse || placeholderPhrases.some(phrase =>
      phoneToUse?.toLowerCase().includes(phrase)
    );

    if (isPlaceholder) {
      if (this.phoneNumber) {
        console.log(`📱 Using session phone number instead of placeholder: ${this.phoneNumber}`);
        phoneToUse = this.phoneNumber;
      } else {
        return { sent: false, error: 'No phone number available. Please provide a valid phone number.' };
      }
    }

    if (!args.appointment_details) {
      return { sent: false, error: 'Appointment details are required for the SMS.' };
    }

    return await this.notificationService!.sendConfirmationSMS({
      phone_number: phoneToUse,
      appointment_details: args.appointment_details
    });
  }

  /**
   * Handle reschedule_appointment function call
   */
  private async handleRescheduleAppointment(args: {
    booking_id: string;
    new_appointment_time: string;
    reason?: string;
  }): Promise<any> {
    console.log('🔄 Rescheduling appointment:', args);
    return await this.appointmentService!.rescheduleAppointment(args);
  }

  /**
   * Handle cancel_appointment function call
   */
  private async handleCancelAppointment(args: {
    booking_id: string;
    reason: string;
  }): Promise<any> {
    console.log('❌ Cancelling appointment:', args);
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
    booking_id: string;
    notes: string;
  }): Promise<any> {
    console.log('📝 Adding appointment notes:', args);
    return await this.appointmentService!.addAppointmentNotes(args);
  }

  /**
   * Handle send_appointment_reminder function call
   */
  private async handleSendAppointmentReminder(args: {
    phone_number: string;
    patient_name: string;
    child_name: string;
    appointment_time: string;
    location: string;
  }): Promise<any> {
    console.log('⏰ Sending appointment reminder:', args);
    return await this.notificationService!.sendAppointmentReminder(args);
  }

  /**
   * Handle check_insurance_eligibility function call
   */
  private async handleCheckInsuranceEligibility(args: {
    medicaid_id: string;
    child_name: string;
    date_of_birth?: string;
  }): Promise<any> {
    console.log('🏥 Checking insurance eligibility:', args);
    return await this.notificationService!.checkInsuranceEligibility(args);
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

  /**
   * Handle verify_member function call
   */
  private handleVerifyMember(args: {
    member_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
  }): any {
    console.log('🔐 Verifying member:', args);
    return NEMTService.verifyMember(args);
  }

  /**
   * Handle get_member_info function call
   */
  private handleGetMemberInfo(args: { member_id: string }): any {
    console.log('👤 Getting member info:', args);
    return NEMTService.getMemberInfo(args);
  }

  /**
   * Handle check_ride_eligibility function call
   */
  private handleCheckRideEligibility(args: { member_id: string }): any {
    console.log('✅ Checking ride eligibility:', args);
    return NEMTService.checkRideEligibility(args);
  }

  /**
   * Handle search_address function call
   */
  private handleSearchAddress(args: { query: string; city?: string; state?: string }): any {
    console.log('📍 Searching address:', args);
    return NEMTService.searchAddress(args);
  }

  /**
   * Handle book_ride function call
   */
  private handleBookRide(args: {
    member_id: string;
    trip_type: 'one_way' | 'round_trip';
    pickup_address: string;
    pickup_city: string;
    pickup_state: string;
    pickup_zip: string;
    dropoff_address: string;
    dropoff_city: string;
    dropoff_state: string;
    dropoff_zip: string;
    pickup_date: string;
    pickup_time: string;
    appointment_time: string;
    assistance_type: string;
    facility_name?: string;
    return_trip_type?: 'scheduled' | 'will_call';
    return_pickup_time?: string;
    notes?: string;
  }): any {
    console.log('🚗 Booking ride:', args);
    return NEMTService.bookRide(args);
  }

  /**
   * Handle get_ride_status function call
   */
  private handleGetRideStatus(args: { confirmation_number: string }): any {
    console.log('📊 Getting ride status:', args);
    return NEMTService.getRideStatus(args);
  }

  /**
   * Handle cancel_ride function call
   */
  private handleCancelRide(args: { confirmation_number: string; reason?: string }): any {
    console.log('❌ Cancelling ride:', args);
    return NEMTService.cancelRide(args);
  }

  /**
   * Handle update_ride function call
   */
  private handleUpdateRide(args: {
    confirmation_number: string;
    pickup_time?: string;
    pickup_date?: string;
    appointment_time?: string;
    return_trip_type?: 'scheduled' | 'will_call';
    return_pickup_time?: string;
    notes?: string;
  }): any {
    console.log('✏️  Updating ride:', args);
    return NEMTService.updateRide(args);
  }

  /**
   * Handle add_companion function call
   */
  private handleAddCompanion(args: {
    confirmation_number: string;
    companion_name: string;
    companion_phone: string;
    relationship?: string;
  }): any {
    console.log('👥 Adding companion:', args);
    return NEMTService.addCompanion(args);
  }

  /**
   * Handle check_nemt_availability function call
   */
  private handleCheckNEMTAvailability(args: {
    date: string;
    time: string;
    pickup_zip: string;
    assistance_type: string;
  }): any {
    console.log('🚐 Checking NEMT availability:', args);
    return NEMTService.checkAvailability(args);
  }

  // Browser-compatible base64 conversion
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private uint8ArrayToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }
}
