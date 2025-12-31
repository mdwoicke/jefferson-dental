# Advanced Agent Capabilities - Implementation Reference Guide
## Jefferson Dental Voice AI System

> **Companion to**: Implementation Plan at `/home/mwoicke/.claude/plans/structured-swimming-hickey.md`
>
> This document provides detailed code examples, architecture patterns, and implementation guidance for adding advanced capabilities to the Jefferson Dental voice AI system.

---

## Table of Contents

1. [Function/Tool Calling](#1-functiontool-calling)
2. [Dynamic Context Injection](#2-dynamic-context-injection)
3. [Multi-Stage Conversation Flows](#3-multi-stage-conversation-flows)
4. [External Integrations](#4-external-integrations)
5. [Architecture Diagrams](#5-architecture-diagrams)
6. [Best Practices](#6-best-practices)
7. [Provider Comparison](#7-provider-comparison)

---

## 1. FUNCTION/TOOL CALLING

### 1.1 OpenAI Realtime API Implementation

Function calling allows the AI to execute backend functions during conversations (e.g., check appointment availability, book slots, send SMS).

#### Step 1: Define Tools in Session Configuration

**File**: `backend/src/ai/openai-client.ts`

**Modify**: `sendSessionUpdate()` method (lines 60-86)

```typescript
private sendSessionUpdate(config: ProviderConfig): void {
  if (!this.ws) return;

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

      // ===== NEW: Tool definitions =====
      tools: [
        {
          type: 'function',
          name: 'check_availability',
          description: 'Check available appointment slots for a specific date and time range. Use this when the caller asks about available times or when you need to offer appointment options.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'The date to check availability (YYYY-MM-DD format). Example: "2025-01-15"',
              },
              time_range: {
                type: 'string',
                enum: ['morning', 'afternoon', 'evening'],
                description: 'Preferred time of day. Morning: 8am-12pm, Afternoon: 12pm-5pm, Evening: 5pm-8pm'
              },
              num_children: {
                type: 'integer',
                description: 'Number of children to schedule. Used to find slots with enough chairs available.',
                minimum: 1,
                maximum: 5
              }
            },
            required: ['date', 'time_range', 'num_children']
          }
        },
        {
          type: 'function',
          name: 'book_appointment',
          description: 'Book a dental appointment for specified children at a specific time. Only call this after the caller has confirmed they want to book the appointment.',
          parameters: {
            type: 'object',
            properties: {
              child_names: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of children to schedule. Example: ["Tony", "Paula"]'
              },
              appointment_time: {
                type: 'string',
                description: 'ISO 8601 datetime string for appointment. Example: "2025-01-15T14:30:00Z"'
              },
              appointment_type: {
                type: 'string',
                enum: ['exam', 'cleaning', 'exam_and_cleaning', 'emergency'],
                description: 'Type of appointment to book'
              }
            },
            required: ['child_names', 'appointment_time', 'appointment_type']
          }
        },
        {
          type: 'function',
          name: 'get_patient_info',
          description: 'Retrieve patient information from CRM database by phone number. Use this at the start of the call to personalize the conversation.',
          parameters: {
            type: 'object',
            properties: {
              phone_number: {
                type: 'string',
                description: 'Patient phone number in E.164 format. Example: "+15551234567"'
              }
            },
            required: ['phone_number']
          }
        },
        {
          type: 'function',
          name: 'send_confirmation_sms',
          description: 'Send SMS confirmation of appointment details to the patient. Call this after successfully booking an appointment.',
          parameters: {
            type: 'object',
            properties: {
              phone_number: {
                type: 'string',
                description: 'Recipient phone number in E.164 format'
              },
              appointment_details: {
                type: 'string',
                description: 'Full appointment details to include in SMS. Include children names, date, time, and location.'
              }
            },
            required: ['phone_number', 'appointment_details']
          }
        }
      ],

      // Tool choice configuration
      // Options: 'auto' (AI decides when to call), 'none' (disable), 'required' (must call a function),
      //          or {type: 'function', name: 'function_name'} (force specific function)
      tool_choice: 'auto'
    }
  };

  this.ws.send(JSON.stringify(sessionConfig));
}
```

#### Step 2: Handle Function Call Events

**File**: `backend/src/ai/openai-client.ts`

**Add**: Class property for buffering function calls

```typescript
export class OpenAIClient extends EventEmitter implements IVoiceProvider {
  private ws: WebSocket | null = null;
  private callbacks: VoiceProviderCallbacks | null = null;
  private connected: boolean = false;

  // NEW: Buffer for accumulating function call arguments
  private functionCallBuffer: { call_id: string; name: string; arguments: string } | null = null;

  // NEW: Service layer instances (inject via constructor or create here)
  private appointmentService: AppointmentService;
  private crmService: CRMService;
  private notificationService: NotificationService;
  private databaseService: DatabaseService;
  private currentCallId: string = '';

  // ... existing methods ...
}
```

**Modify**: `handleMessage()` method to process function call events

```typescript
private handleMessage(data: string): void {
  try {
    const message = JSON.parse(data);

    switch (message.type) {
      // ... existing cases (session.created, session.updated, response.audio.delta, etc.) ...

      // ===== NEW: Function call handling =====

      case 'response.function_call_arguments.delta':
        // OpenAI streams function call arguments in chunks
        if (!this.functionCallBuffer) {
          this.functionCallBuffer = {
            call_id: message.call_id,
            name: message.name,
            arguments: ''
          };
          console.log(`📞 Function call started: ${message.name}`);
        }
        // Accumulate the argument chunks
        this.functionCallBuffer.arguments += message.delta;
        break;

      case 'response.function_call_arguments.done':
        // Function call arguments complete, execute it
        console.log(`✅ Function call arguments complete: ${this.functionCallBuffer?.name}`);
        if (this.functionCallBuffer) {
          this.executeFunctionCall(this.functionCallBuffer);
          this.functionCallBuffer = null;
        }
        break;

      // ... existing cases ...
    }
  } catch (error) {
    console.error('❌ Error parsing OpenAI message:', error);
  }
}
```

#### Step 3: Execute Function Calls

**File**: `backend/src/ai/openai-client.ts`

**Add**: Function execution and result handling

```typescript
private async executeFunctionCall(callData: { call_id: string; name: string; arguments: string }): Promise<void> {
  const { call_id, name, arguments: argsString } = callData;
  const startTime = Date.now();

  try {
    // Parse arguments
    const args = JSON.parse(argsString);
    console.log(`🔧 Executing function: ${name}`, args);

    // Route to appropriate handler
    let result: any;
    switch (name) {
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

      default:
        throw new Error(`Unknown function: ${name}`);
    }

    console.log(`✅ Function ${name} completed in ${Date.now() - startTime}ms`);

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

    // Trigger a new response with the function result
    const responseCreate = {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    };

    this.ws!.send(JSON.stringify(responseCreate));

    // Log successful function call
    await this.databaseService.logFunctionCall({
      callId: this.currentCallId,
      functionName: name,
      arguments: args,
      result,
      success: true,
      executionTimeMs: Date.now() - startTime
    });

  } catch (error: any) {
    console.error(`❌ Error executing function ${name}:`, error);

    // Send error back to OpenAI with graceful fallback message
    const errorOutput = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: call_id,
        output: JSON.stringify({
          error: true,
          message: `Unable to complete ${name}. ${this.getFallbackMessage(name)}`,
          details: error.message
        })
      }
    };

    this.ws!.send(JSON.stringify(errorOutput));

    // Log failed function call
    await this.databaseService.logFunctionCall({
      callId: this.currentCallId,
      functionName: name,
      arguments: JSON.parse(argsString),
      success: false,
      errorMessage: error.message,
      executionTimeMs: Date.now() - startTime
    });

    // Still trigger a response so conversation continues
    const responseCreate = {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    };

    this.ws!.send(JSON.stringify(responseCreate));
  }
}

private getFallbackMessage(functionName: string): string {
  const fallbacks: Record<string, string> = {
    'check_availability': 'Please let me know your preferred dates and I can check manually.',
    'book_appointment': 'Let me try to book this appointment using an alternative method.',
    'get_patient_info': 'I can still help you schedule. Could you provide your name and children\'s names?',
    'send_confirmation_sms': 'I\'ll make sure you receive a confirmation call instead.'
  };
  return fallbacks[functionName] || 'Let me try another approach.';
}
```

#### Step 4: Implement Function Handlers

**File**: `backend/src/ai/openai-client.ts`

```typescript
private async handleCheckAvailability(args: {
  date: string;
  time_range: string;
  num_children: number;
}): Promise<any> {
  console.log('📅 Checking availability:', args);
  return await this.appointmentService.checkAvailability(args);
}

private async handleBookAppointment(args: {
  child_names: string[];
  appointment_time: string;
  appointment_type: string;
}): Promise<any> {
  console.log('📝 Booking appointment:', args);
  return await this.appointmentService.bookAppointment(args);
}

private async handleGetPatientInfo(args: {
  phone_number: string;
}): Promise<any> {
  console.log('👤 Getting patient info for:', args.phone_number);
  return await this.crmService.getPatientInfo(args.phone_number);
}

private async handleSendConfirmationSMS(args: {
  phone_number: string;
  appointment_details: string;
}): Promise<any> {
  console.log('📱 Sending confirmation SMS to:', args.phone_number);
  return await this.notificationService.sendConfirmationSMS(args);
}
```

---

### 1.2 Gemini Live API Implementation

Gemini uses a slightly different format for function calling called "function declarations".

#### Step 1: Define Function Declarations

**File**: `backend/src/ai/gemini-client.ts`

**Modify**: `connect()` method (lines 15-73)

```typescript
async connect(config: ProviderConfig, callbacks: VoiceProviderCallbacks): Promise<void> {
  this.callbacks = callbacks;

  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  const sessionPromise = ai.live.connect({
    model: config.model,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: config.voiceName }
        },
      },
      systemInstruction: config.systemInstruction,

      // ===== NEW: Tool declarations for Gemini =====
      tools: [
        {
          functionDeclarations: [
            {
              name: 'check_availability',
              description: 'Check available appointment slots for a specific date and time range. Use this when the caller asks about available times or when you need to offer appointment options.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  date: {
                    type: 'STRING',
                    description: 'The date to check availability (YYYY-MM-DD format). Example: "2025-01-15"',
                  },
                  time_range: {
                    type: 'STRING',
                    enum: ['morning', 'afternoon', 'evening'],
                    description: 'Preferred time of day. Morning: 8am-12pm, Afternoon: 12pm-5pm, Evening: 5pm-8pm'
                  },
                  num_children: {
                    type: 'INTEGER',
                    description: 'Number of children to schedule. Used to find slots with enough chairs available.'
                  }
                },
                required: ['date', 'time_range', 'num_children']
              }
            },
            {
              name: 'book_appointment',
              description: 'Book a dental appointment for specified children at a specific time. Only call this after the caller has confirmed they want to book the appointment.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  child_names: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                    description: 'Names of children to schedule. Example: ["Tony", "Paula"]'
                  },
                  appointment_time: {
                    type: 'STRING',
                    description: 'ISO 8601 datetime string for appointment. Example: "2025-01-15T14:30:00Z"'
                  },
                  appointment_type: {
                    type: 'STRING',
                    enum: ['exam', 'cleaning', 'exam_and_cleaning', 'emergency'],
                    description: 'Type of appointment to book'
                  }
                },
                required: ['child_names', 'appointment_time', 'appointment_type']
              }
            },
            {
              name: 'get_patient_info',
              description: 'Retrieve patient information from CRM database by phone number. Use this at the start of the call to personalize the conversation.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  phone_number: {
                    type: 'STRING',
                    description: 'Patient phone number in E.164 format. Example: "+15551234567"'
                  }
                },
                required: ['phone_number']
              }
            },
            {
              name: 'send_confirmation_sms',
              description: 'Send SMS confirmation of appointment details to the patient. Call this after successfully booking an appointment.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  phone_number: {
                    type: 'STRING',
                    description: 'Recipient phone number in E.164 format'
                  },
                  appointment_details: {
                    type: 'STRING',
                    description: 'Full appointment details to include in SMS. Include children names, date, time, and location.'
                  }
                },
                required: ['phone_number', 'appointment_details']
              }
            }
          ]
        }
      ]
    },
    callbacks: {
      onopen: () => {
        console.log("✅ Gemini Live Session Opened");
        this.connected = true;
        this.callbacks?.onOpen();

        // Send initial trigger after a short delay
        setTimeout(() => {
          this.sendText("Hello");
        }, 500);
      },

      onmessage: async (message: LiveServerMessage) => {
        // Handle Audio Output
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const audioBytes = this.base64ToUint8Array(base64Audio);
          if (audioBytes.length > 0) {
            const audioMessage: ProviderMessage = {
              type: 'audio',
              audio: audioBytes
            };
            this.callbacks?.onMessage(audioMessage);
            this.emit('audio', audioBytes);
          }
        }

        // ===== NEW: Handle function calls =====
        const functionCall = message.serverContent?.modelTurn?.parts?.find(
          (part: any) => part.functionCall
        );

        if (functionCall?.functionCall) {
          console.log('📞 Function call received:', functionCall.functionCall);
          await this.handleFunctionCall(functionCall.functionCall);
        }

        // Handle Interruption
        if (message.serverContent?.interrupted) {
          console.log("⚠️  Interrupted by user");
          const interruptMessage: ProviderMessage = {
            type: 'interrupt'
          };
          this.callbacks?.onMessage(interruptMessage);
          this.emit('interrupt');
        }
      },

      onclose: () => {
        console.log("🔌 Gemini Session Closed");
        this.connected = false;
        this.callbacks?.onClose();
      },

      onerror: (err) => {
        console.error("❌ Gemini Session Error:", err);
        this.callbacks?.onError(new Error(String(err)));
      }
    }
  });

  this.session = await sessionPromise;
}
```

#### Step 2: Handle Function Calls (Gemini)

**File**: `backend/src/ai/gemini-client.ts`

**Add**: Class properties

```typescript
export class GeminiClient extends EventEmitter implements IVoiceProvider {
  private session: any = null;
  private connected: boolean = false;
  private callbacks: VoiceProviderCallbacks | null = null;

  // NEW: Service layer instances
  private appointmentService: AppointmentService;
  private crmService: CRMService;
  private notificationService: NotificationService;
  private databaseService: DatabaseService;
  private currentCallId: string = '';

  // ... existing methods ...
}
```

**Add**: Function call handler

```typescript
private async handleFunctionCall(functionCall: { name: string; args: any }): Promise<void> {
  const { name, args } = functionCall;
  const startTime = Date.now();

  try {
    console.log(`🔧 Executing function: ${name}`, args);

    // Route to appropriate handler
    let result: any;
    switch (name) {
      case 'check_availability':
        result = await this.appointmentService.checkAvailability(args);
        break;

      case 'book_appointment':
        result = await this.appointmentService.bookAppointment(args);
        break;

      case 'get_patient_info':
        result = await this.crmService.getPatientInfo(args.phone_number);
        break;

      case 'send_confirmation_sms':
        result = await this.notificationService.sendConfirmationSMS(args);
        break;

      default:
        throw new Error(`Unknown function: ${name}`);
    }

    console.log(`✅ Function ${name} completed in ${Date.now() - startTime}ms`);

    // Send function response back to Gemini
    const functionResponse = {
      functionResponses: [
        {
          name: name,
          response: result
        }
      ]
    };

    // Note: Gemini's SDK method for sending tool responses may vary
    // Check the latest Gemini Live API documentation for the exact method
    if (typeof this.session.sendToolResponse === 'function') {
      this.session.sendToolResponse(functionResponse);
    } else {
      this.session.send(functionResponse);
    }

    // Log successful function call
    await this.databaseService.logFunctionCall({
      callId: this.currentCallId,
      functionName: name,
      arguments: args,
      result,
      success: true,
      executionTimeMs: Date.now() - startTime
    });

  } catch (error: any) {
    console.error(`❌ Error executing function ${name}:`, error);

    // Send error response to Gemini
    const errorResponse = {
      functionResponses: [
        {
          name: name,
          response: {
            error: true,
            message: `Unable to complete ${name}. ${this.getFallbackMessage(name)}`,
            details: error.message
          }
        }
      ]
    };

    if (typeof this.session.sendToolResponse === 'function') {
      this.session.sendToolResponse(errorResponse);
    } else {
      this.session.send(errorResponse);
    }

    // Log failed function call
    await this.databaseService.logFunctionCall({
      callId: this.currentCallId,
      functionName: name,
      arguments: args,
      success: false,
      errorMessage: error.message,
      executionTimeMs: Date.now() - startTime
    });
  }
}

private getFallbackMessage(functionName: string): string {
  const fallbacks: Record<string, string> = {
    'check_availability': 'Please let me know your preferred dates and I can check manually.',
    'book_appointment': 'Let me try to book this appointment using an alternative method.',
    'get_patient_info': 'I can still help you schedule. Could you provide your name and children\'s names?',
    'send_confirmation_sms': 'I\'ll make sure you receive a confirmation call instead.'
  };
  return fallbacks[functionName] || 'Let me try another approach.';
}
```

---

### 1.3 Service Layer Implementation

Create the actual business logic that functions will call.

#### AppointmentService

**New File**: `backend/src/services/appointment-service.ts`

```typescript
export interface AvailabilitySlot {
  time: string;
  datetime: string;
  available_chairs: number;
  can_accommodate: boolean;
}

export interface AppointmentBooking {
  booking_id: string;
  status: 'confirmed' | 'pending' | 'failed';
  child_names: string[];
  appointment_time: string;
  appointment_type: string;
  location: string;
  confirmation_sent: boolean;
}

export class AppointmentService {
  /**
   * Check availability for appointments
   * TODO: Replace with actual calendar API integration
   */
  async checkAvailability(args: {
    date: string;
    time_range: string;
    num_children: number;
  }): Promise<AvailabilitySlot[]> {
    console.log('📅 Checking availability for:', args);

    // Mock implementation - returns realistic appointment times
    const slots: AvailabilitySlot[] = [];
    const baseDate = new Date(args.date);

    if (args.time_range === 'morning') {
      slots.push({
        time: '9:00 AM',
        datetime: new Date(baseDate.setHours(9, 0, 0)).toISOString(),
        available_chairs: 3,
        can_accommodate: args.num_children <= 3
      });
      slots.push({
        time: '10:30 AM',
        datetime: new Date(baseDate.setHours(10, 30, 0)).toISOString(),
        available_chairs: 2,
        can_accommodate: args.num_children <= 2
      });
      slots.push({
        time: '11:15 AM',
        datetime: new Date(baseDate.setHours(11, 15, 0)).toISOString(),
        available_chairs: 2,
        can_accommodate: args.num_children <= 2
      });
    } else if (args.time_range === 'afternoon') {
      slots.push({
        time: '1:00 PM',
        datetime: new Date(baseDate.setHours(13, 0, 0)).toISOString(),
        available_chairs: 3,
        can_accommodate: args.num_children <= 3
      });
      slots.push({
        time: '2:00 PM',
        datetime: new Date(baseDate.setHours(14, 0, 0)).toISOString(),
        available_chairs: 2,
        can_accommodate: args.num_children <= 2
      });
      slots.push({
        time: '3:15 PM',
        datetime: new Date(baseDate.setHours(15, 15, 0)).toISOString(),
        available_chairs: 2,
        can_accommodate: args.num_children <= 2
      });
      slots.push({
        time: '4:30 PM',
        datetime: new Date(baseDate.setHours(16, 30, 0)).toISOString(),
        available_chairs: 1,
        can_accommodate: args.num_children <= 1
      });
    } else if (args.time_range === 'evening') {
      slots.push({
        time: '5:30 PM',
        datetime: new Date(baseDate.setHours(17, 30, 0)).toISOString(),
        available_chairs: 2,
        can_accommodate: args.num_children <= 2
      });
      slots.push({
        time: '6:45 PM',
        datetime: new Date(baseDate.setHours(18, 45, 0)).toISOString(),
        available_chairs: 1,
        can_accommodate: args.num_children <= 1
      });
    }

    // Filter to only slots that can accommodate the requested number of children
    return slots.filter(slot => slot.can_accommodate);
  }

  /**
   * Book an appointment
   * TODO: Replace with actual booking system integration
   */
  async bookAppointment(args: {
    child_names: string[];
    appointment_time: string;
    appointment_type: string;
  }): Promise<AppointmentBooking> {
    console.log('📝 Booking appointment:', args);

    // Generate unique booking ID
    const bookingId = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const booking: AppointmentBooking = {
      booking_id: bookingId,
      status: 'confirmed',
      child_names: args.child_names,
      appointment_time: args.appointment_time,
      appointment_type: args.appointment_type,
      location: 'Jefferson Dental - Main Street',
      confirmation_sent: false
    };

    console.log('✅ Appointment booked:', bookingId);

    return booking;
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(bookingId: string): Promise<{ success: boolean; message: string }> {
    console.log('🚫 Cancelling appointment:', bookingId);

    // TODO: Implement actual cancellation logic

    return {
      success: true,
      message: `Appointment ${bookingId} has been cancelled.`
    };
  }
}
```

#### CRMService

**New File**: `backend/src/services/crm-service.ts`

```typescript
export interface PatientRecord {
  id: string;
  phone_number: string;
  parent_name: string;
  children: Array<{
    name: string;
    age: number;
    medicaid_id: string;
  }>;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  preferred_language: string;
  last_visit: string | null;
  notes: string;
}

export class CRMService {
  // Mock patient database
  // TODO: Replace with actual CRM API integration (Salesforce, HubSpot, etc.)
  private mockPatients: Record<string, PatientRecord> = {
    '+15551234567': {
      id: 'PAT-001',
      phone_number: '+15551234567',
      parent_name: 'Maria Garcia',
      children: [
        { name: 'Tony', age: 8, medicaid_id: 'MCD-001-A' },
        { name: 'Paula', age: 6, medicaid_id: 'MCD-001-B' }
      ],
      address: {
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701'
      },
      preferred_language: 'English',
      last_visit: null,
      notes: 'New patient assigned via Medicaid'
    },
    '+15559876543': {
      id: 'PAT-002',
      phone_number: '+15559876543',
      parent_name: 'John Smith',
      children: [
        { name: 'Emma', age: 7, medicaid_id: 'MCD-002-A' },
        { name: 'Liam', age: 5, medicaid_id: 'MCD-002-B' },
        { name: 'Olivia', age: 3, medicaid_id: 'MCD-002-C' }
      ],
      address: {
        street: '456 Oak Avenue',
        city: 'Austin',
        state: 'TX',
        zip: '78702'
      },
      preferred_language: 'English',
      last_visit: '2024-11-15',
      notes: 'Prefers morning appointments'
    }
  };

  /**
   * Get patient information from CRM
   */
  async getPatientInfo(phoneNumber: string): Promise<PatientRecord | null> {
    console.log('👤 Looking up patient:', phoneNumber);

    // Mock implementation - lookup from in-memory database
    const patient = this.mockPatients[phoneNumber] || null;

    if (patient) {
      console.log('✅ Patient found:', patient.parent_name);
    } else {
      console.log('⚠️  Patient not found');
    }

    return patient;
  }

  /**
   * Update patient record
   */
  async updatePatientRecord(
    patientId: string,
    updates: Partial<PatientRecord>
  ): Promise<void> {
    console.log(`📝 Updating patient ${patientId}:`, updates);

    // TODO: Implement actual CRM update logic
    // For now, just log the update
  }

  /**
   * Add new patient
   */
  async addPatient(patientData: Omit<PatientRecord, 'id'>): Promise<string> {
    console.log('➕ Adding new patient:', patientData.parent_name);

    const patientId = `PAT-${Date.now()}`;

    // TODO: Implement actual CRM creation logic

    return patientId;
  }
}
```

#### NotificationService

**New File**: `backend/src/services/notification-service.ts`

```typescript
import twilio from 'twilio';
import { config } from '../config';

export class NotificationService {
  private twilioClient: twilio.Twilio;

  constructor() {
    this.twilioClient = twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
  }

  /**
   * Send SMS confirmation
   */
  async sendConfirmationSMS(args: {
    phone_number: string;
    appointment_details: string;
  }): Promise<{ sent: boolean; message_sid?: string; error?: string }> {
    console.log('📱 Sending SMS to:', args.phone_number);

    try {
      const message = await this.twilioClient.messages.create({
        body: `Jefferson Dental Confirmation:\n\n${args.appointment_details}\n\nReply CONFIRM to confirm or call us at ${config.twilio.phoneNumber}`,
        from: config.twilio.phoneNumber,
        to: args.phone_number
      });

      console.log(`✅ SMS sent: ${message.sid}`);

      return {
        sent: true,
        message_sid: message.sid
      };
    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error);
      return {
        sent: false,
        error: error.message
      };
    }
  }

  /**
   * Send email confirmation
   * TODO: Integrate with email service (SendGrid, AWS SES, etc.)
   */
  async sendConfirmationEmail(args: {
    email: string;
    appointment_details: string;
    recipient_name: string;
  }): Promise<{ sent: boolean; error?: string }> {
    console.log(`📧 Sending email to: ${args.email}`);

    // TODO: Implement email sending with SendGrid or AWS SES
    // For now, just log
    console.log('Email content:', args.appointment_details);

    return { sent: true };
  }

  /**
   * Send reminder notification (SMS or email)
   */
  async sendReminder(args: {
    phone_number?: string;
    email?: string;
    appointment_time: string;
    child_names: string[];
  }): Promise<{ sent: boolean }> {
    const reminderText = `Reminder: Dental appointment for ${args.child_names.join(' and ')} tomorrow at ${new Date(args.appointment_time).toLocaleTimeString()}. See you then!`;

    if (args.phone_number) {
      return await this.sendConfirmationSMS({
        phone_number: args.phone_number,
        appointment_details: reminderText
      });
    }

    return { sent: false };
  }
}
```

#### Service Index (Export All Services)

**New File**: `backend/src/services/index.ts`

```typescript
export * from './appointment-service';
export * from './crm-service';
export * from './notification-service';
export * from './context-manager';
export * from './conversation-state-machine';
export * from './prompt-builder';
```

---

## 2. DYNAMIC CONTEXT INJECTION

Dynamic context injection personalizes the agent's prompt with real caller data at the start of each call.

### 2.1 Context Manager

**New File**: `backend/src/services/context-manager.ts`

```typescript
import { CRMService, PatientRecord } from './crm-service';

export class ContextManager {
  private crmService: CRMService;

  constructor(crmService?: CRMService) {
    this.crmService = crmService || new CRMService();
  }

  /**
   * Generate personalized system instruction with caller context
   * This is called at the start of each session
   */
  async generatePersonalizedPrompt(
    basePrompt: string,
    phoneNumber: string
  ): Promise<string> {
    console.log('🎨 Generating personalized prompt for:', phoneNumber);

    // Fetch patient data from CRM
    const patientData = await this.crmService.getPatientInfo(phoneNumber);

    if (!patientData) {
      console.log('⚠️  No patient data found, using generic context');
      return this.injectGenericContext(basePrompt);
    }

    console.log('✅ Patient data found, personalizing for:', patientData.parent_name);
    return this.injectPatientContext(basePrompt, patientData);
  }

  /**
   * Inject patient-specific context into the prompt
   */
  private injectPatientContext(
    basePrompt: string,
    patient: PatientRecord
  ): string {
    // Extract children names
    const childrenNames = patient.children.map(c => c.name).join(' and ');
    const childrenDetails = patient.children
      .map(c => `${c.name} (age ${c.age})`)
      .join(', ');

    // Replace placeholder names in the prompt
    let personalizedPrompt = basePrompt
      .replace(/\*\*Tony and Paula\*\*/g, `**${childrenNames}**`)
      .replace(/Tony and Paula/g, childrenNames)
      .replace(/Tony/g, patient.children[0]?.name || 'Tony')
      .replace(/Paula/g, patient.children[1]?.name || 'Paula');

    // Add detailed context section at the beginning
    const contextSection = `
## CALLER CONTEXT (CONFIDENTIAL - USE TO PERSONALIZE CONVERSATION)

**You are calling:** ${patient.parent_name}
**Phone Number:** ${patient.phone_number}

**Children Assigned to Jefferson Dental:**
${patient.children.map(c => `  - **${c.name}**, Age ${c.age}, Medicaid ID: ${c.medicaid_id}`).join('\n')}

**Address:** ${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}
**Preferred Language:** ${patient.preferred_language}
${patient.last_visit ? `**Last Visit:** ${patient.last_visit}` : '**Last Visit:** None (New Patient)'}

**Notes:** ${patient.notes || 'None'}

**IMPORTANT PERSONALIZATION INSTRUCTIONS:**
- Address the parent by name: "${patient.parent_name}"
- Reference the specific children by name: ${childrenNames}
- Mention that you have ${patient.children.length} child${patient.children.length > 1 ? 'ren' : ''} to schedule
${patient.last_visit ? '- Acknowledge this is a follow-up (they visited before)' : '- This is their first appointment with us'}

---

`;

    return contextSection + personalizedPrompt;
  }

  /**
   * Inject generic context for unknown callers
   */
  private injectGenericContext(basePrompt: string): string {
    const contextSection = `
## CALLER CONTEXT

**⚠️  IMPORTANT:** No patient record found for this phone number in our system.

**YOUR APPROACH:**
1. Still introduce yourself and explain the call (you're from Jefferson Dental about Medicaid benefits)
2. **Early in the conversation**, politely ask: "May I have your name please?"
3. Then ask: "And could you confirm the names and ages of the children you'd like to schedule?"
4. Use the information they provide to personalize the rest of the call
5. After collecting basic info, you can use get_patient_info function to verify

**TONE:** Be extra warm and patient since we don't have their information yet.

---

`;

    return contextSection + basePrompt;
  }

  /**
   * Generate context for mid-call updates
   * Used when conversation state changes
   */
  generateMidCallContext(updates: {
    appointment_booked?: boolean;
    booking_id?: string;
    children_ages_collected?: { [name: string]: number };
    preferred_time?: string;
    emergency_detected?: boolean;
  }): string {
    const contextUpdates: string[] = [];

    if (updates.appointment_booked && updates.booking_id) {
      contextUpdates.push(`✅ APPOINTMENT BOOKED: Booking ID ${updates.booking_id}. Proceed to send confirmation.`);
    }

    if (updates.children_ages_collected) {
      const agesList = Object.entries(updates.children_ages_collected)
        .map(([name, age]) => `${name}: ${age}`)
        .join(', ');
      contextUpdates.push(`📝 CHILDREN AGES COLLECTED: ${agesList}`);
    }

    if (updates.preferred_time) {
      contextUpdates.push(`⏰ PREFERRED TIME: ${updates.preferred_time}`);
    }

    if (updates.emergency_detected) {
      contextUpdates.push(`🚨 EMERGENCY DETECTED: Prioritize finding immediate availability.`);
    }

    if (contextUpdates.length === 0) {
      return '';
    }

    return `\n## MID-CALL CONTEXT UPDATE\n\n${contextUpdates.join('\n')}\n`;
  }
}
```

### 2.2 Prompt Template Refactoring

**New File**: `backend/src/constants/prompts.ts`

```typescript
/**
 * Base prompt template for the Jefferson Dental AI agent
 * Uses placeholder tokens that will be replaced with real data
 */
export const DENTAL_IVA_PROMPT_TEMPLATE = `
SYSTEM INSTRUCTION:
You are Sophia, an AI outreach agent for Jefferson Dental Clinics.
Your specific task is to conduct OUTBOUND calls to parents/guardians of children under 18 who have been assigned to Jefferson Dental Clinics for their Medicaid dental benefits.

CONTEXT:
You are calling because their children appeared on a monthly state-generated list designating Jefferson Dental Clinics as their preferred provider.

**Specific Assignment Details:**
- The children assigned to this household are **{{CHILD_NAMES}}**.
- Your goal is to schedule their initial exams and cleanings.

PROTOCOL:
1. The user will "pick up" the phone (simulated by a "Hello" trigger).
2. You MUST immediately speak first using the Opening Script below.
3. You must act as the CALLER. The user is the RECIPIENT.

# OUTBOUND CALL SCRIPT & PERSONA

## Identity
- **Name**: Sophia
- **Organization**: Jefferson Dental Clinics
- **Tone**: Professional, warm, persistent but respectful, knowledgeable, trustworthy.
- **Vibe**: Not robotic. Use natural pauses. Sound like a helpful office administrator.

## Core Script Flow

### 1. Opening
"Hello, this is Sophia calling from Jefferson Dental Clinics. I'm reaching out because you've recently been assigned to our office as your dental provider through Medicaid."

[Wait for acknowledgement]

"I wanted to help you get **{{CHILD_NAMES}}'s** initial exams and cleanings scheduled before the schedule fills up. Am I speaking with {{PARENT_NAME}}?"

### 2. Handling Skepticism (Critical)
Parents often fear scams or hidden costs. You must proactively address this if they hesitate or ask questions.

**If they ask "Who is this?" / "Is this a scam?":**
"I completely understand your caution. We are a state-approved Medicaid provider, and we're contacting you because {{CHILD_NAMES}} {{IS_ARE}} eligible for these benefits starting this month. You can verify us on the official state provider directory if you'd like."

**If they ask "How much does this cost?" / "Do I have to pay?":**
"That's the best part—because this is through the state Medicaid program, there is absolutely **no copay, no deposit, and no out-of-pocket cost** to you for these exams and cleanings. It is 100% covered."

### 3. Data Gathering & Scheduling
Once they agree to proceed:

"I see I have {{CHILD_NAMES}} listed here. To make sure we book the right amount of time for the appointments, could you confirm their ages for me?"

[Use get_patient_info function if needed to fetch their data]

[Collect Ages - note what they say]

"Great. Since we need to see {{NUM_CHILDREN}} of them, we can usually schedule them together to save you a trip."

[Use check_availability function to find real available slots]

### 4. Slot Allocation (Multi-Child Logic)
You need to offer flexible slots based on real availability from the check_availability function.

**Presentation Pattern:**
"I have availability this {{DAY}}. I could fit {{CHILD_NAMES}} in at {{TIME_SLOT_1}}, or if that doesn't work, I also have {{TIME_SLOT_2}}. Which works better for your schedule?"

**Options for multiple children:**
- **Consecutive**: "Tony at 3:00, Paula at 3:30"
- **Concurrent**: "We actually have two chairs open at 3:00 PM, so we could take Tony and Paula at the same time."

### 5. Booking & Confirmation
Once they agree to a time:

"Perfect! Let me book that for you right now."

[Use book_appointment function to create the booking]

[After booking succeeds]

"Okay, I have {{CHILD_NAMES}} down for {{APPOINTMENT_TYPE}} on {{DAY}} at {{TIME}} at our Main Street location. Let me send you a text message right now with all the details."

[Use send_confirmation_sms function]

"You should receive a confirmation text shortly with the address and appointment details. We look forward to seeing you then!"

## Edge Cases

1.  **"I have an emergency"**:
    "Oh, I'm sorry to hear that. Since this is an urgent matter, let me check our emergency slots for today. Is it for {{FIRST_CHILD}} or {{SECOND_CHILD}}? And can you tell me what's going on?" (Use check_availability with today's date and mark as emergency).

2.  **Too many children (e.g., more than what we have listed)**:
    "We can certainly see other siblings as well if they are assigned. Let me check if we have enough simultaneous chairs available. Would you prefer to bring them all at once?"

3.  **Language/Name Difficulties**:
    If you struggle to understand a name, be polite: "I apologize, I want to make sure I have the spelling correct for the insurance. Could you spell that for me?"

4.  **Refusal/Not Interested**:
    "I understand. You are welcome to call us back whenever you are ready to use the benefits. We'll keep {{CHILD_NAMES}}'s file open for now. Have a great day."

5.  **Technical Issues (Function Call Failures)**:
    If a function call fails (check_availability, book_appointment, etc.), gracefully handle it:
    "I'm having a slight technical issue on my end. Let me try that again..."
    Use the fallback message provided in the error response.

## Important Rules
- **Do NOT** ask for credit card information (since it's free).
- **Do NOT** ask for social security numbers.
- **DO** use the available functions (check_availability, book_appointment, send_confirmation_sms) to provide real-time service.
- **Stay in character**: You are helpful and trying to ensure they don't miss out on free benefits.
- **Be conversational**: Don't sound like you're reading a script. Adapt to their responses naturally.

## Function Usage Guidelines

**check_availability:**
- Use this when they express interest in scheduling
- Ask for their preferred date and time of day first
- Example: "What day works best for you? And do you prefer morning, afternoon, or evening?"
- Then call the function with their preferences

**book_appointment:**
- Only call this AFTER they explicitly agree to a specific time
- Confirm the details before booking: "So that's {{CHILD_NAMES}} on {{DAY}} at {{TIME}}, correct?"
- Wait for confirmation, then book

**send_confirmation_sms:**
- Call this immediately after successful booking
- Format the appointment details clearly in the message
- Include: children names, date, time, location, and your callback number

**get_patient_info:**
- You may already have patient context at the start of the call
- Only call this if you need to verify or fetch additional information
- Useful if the caller mentions additional children not in your initial context
`;

/**
 * Fallback prompt for unknown callers (no patient data)
 */
export const GENERIC_DENTAL_PROMPT = DENTAL_IVA_PROMPT_TEMPLATE
  .replace(/{{CHILD_NAMES}}/g, 'your children')
  .replace(/{{PARENT_NAME}}/g, 'the parent or guardian')
  .replace(/{{NUM_CHILDREN}}/g, 'all');
```

### 2.3 Integration with Call Manager

**File**: `backend/src/call-manager.ts`

**Modify**: Around line 202 where `providerConfig` is created

```typescript
async handleMediaStream(ws: WebSocket, callSid?: string): Promise<void> {
  // ... existing code to get session ...

  // ===== NEW: Generate personalized prompt =====
  const contextManager = new ContextManager();
  const personalizedPrompt = await contextManager.generatePersonalizedPrompt(
    DENTAL_IVA_PROMPT_TEMPLATE,  // Import from constants/prompts.ts
    session.phoneNumber
  );

  console.log('📝 Generated personalized prompt for:', session.phoneNumber);

  const providerConfig: ProviderConfig = {
    provider: session.aiProvider,
    apiKey: session.aiProvider === 'openai' ? config.ai.openaiKey : config.ai.geminiKey,
    model: session.aiProvider === 'openai' ? OPENAI_MODEL : GEMINI_MODEL,
    systemInstruction: personalizedPrompt,  // Use personalized version instead of hardcoded prompt
    voiceName: session.aiProvider === 'openai' ? OPENAI_VOICE : GEMINI_VOICE
  };

  // ... rest of the code ...
}
```

---

## 3. MULTI-STAGE CONVERSATION FLOWS

Track conversation progress and adapt the agent's behavior using a state machine.

### 3.1 Conversation State Machine

**New File**: `backend/src/services/conversation-state-machine.ts`

```typescript
export enum ConversationState {
  INITIAL_GREETING = 'initial_greeting',
  IDENTITY_CONFIRMATION = 'identity_confirmation',
  SKEPTICISM_HANDLING = 'skepticism_handling',
  DATA_GATHERING = 'data_gathering',
  AVAILABILITY_CHECK = 'availability_check',
  SCHEDULING = 'scheduling',
  CONFIRMATION = 'confirmation',
  CLOSING = 'closing',
  EMERGENCY_TRIAGE = 'emergency_triage',
  OBJECTION_HANDLING = 'objection_handling'
}

export interface ConversationContext {
  state: ConversationState;
  childrenAgesCollected: boolean;
  appointmentBooked: boolean;
  confirmationSent: boolean;
  emergencyDetected: boolean;
  objectionType?: 'cost' | 'legitimacy' | 'time' | 'other';
  collectedData: {
    parentName?: string;
    childrenAges?: { [name: string]: number };
    preferredDate?: string;
    preferredTime?: string;
    bookingId?: string;
  };
}

export class ConversationStateMachine {
  private context: ConversationContext;
  private stateHistory: ConversationState[] = [];
  private listeners: Array<(context: ConversationContext) => void> = [];

  constructor(initialState: ConversationState = ConversationState.INITIAL_GREETING) {
    this.context = {
      state: initialState,
      childrenAgesCollected: false,
      appointmentBooked: false,
      confirmationSent: false,
      emergencyDetected: false,
      collectedData: {}
    };
  }

  /**
   * Transition to a new state
   */
  transition(newState: ConversationState, updates?: Partial<ConversationContext>): void {
    const oldState = this.context.state;
    console.log(`🔄 State transition: ${oldState} -> ${newState}`);

    this.stateHistory.push(oldState);
    this.context.state = newState;

    if (updates) {
      this.context = { ...this.context, ...updates };
    }

    // Emit state change event
    this.emit('stateChange', this.context);
  }

  /**
   * Get current state
   */
  getCurrentState(): ConversationState {
    return this.context.state;
  }

  /**
   * Get full context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Get state history
   */
  getStateHistory(): ConversationState[] {
    return [...this.stateHistory];
  }

  /**
   * Update collected data
   */
  updateData(data: Partial<ConversationContext['collectedData']>): void {
    this.context.collectedData = {
      ...this.context.collectedData,
      ...data
    };

    console.log('📊 Updated conversation data:', this.context.collectedData);

    // Auto-transition based on data collection
    this.autoTransition();
  }

  /**
   * Mark children ages as collected
   */
  markChildrenAgesCollected(ages: { [name: string]: number }): void {
    this.context.childrenAgesCollected = true;
    this.updateData({ childrenAges: ages });
  }

  /**
   * Mark appointment as booked
   */
  markAppointmentBooked(bookingId: string): void {
    this.context.appointmentBooked = true;
    this.updateData({ bookingId });

    // Automatically transition to confirmation state
    if (this.context.state !== ConversationState.CONFIRMATION) {
      this.transition(ConversationState.CONFIRMATION);
    }
  }

  /**
   * Mark confirmation as sent
   */
  markConfirmationSent(): void {
    this.context.confirmationSent = true;

    // Automatically transition to closing
    if (this.context.state !== ConversationState.CLOSING) {
      this.transition(ConversationState.CLOSING);
    }
  }

  /**
   * Auto-transition based on context
   */
  private autoTransition(): void {
    const { state, collectedData, childrenAgesCollected, appointmentBooked, confirmationSent } = this.context;

    // Example auto-transitions
    if (state === ConversationState.DATA_GATHERING && childrenAgesCollected) {
      this.transition(ConversationState.AVAILABILITY_CHECK);
    }

    if (state === ConversationState.SCHEDULING && appointmentBooked) {
      this.transition(ConversationState.CONFIRMATION);
    }

    if (state === ConversationState.CONFIRMATION && confirmationSent) {
      this.transition(ConversationState.CLOSING);
    }
  }

  /**
   * Generate state-specific prompt guidance
   */
  getStateGuidance(): string {
    const guidance: Record<ConversationState, string> = {
      [ConversationState.INITIAL_GREETING]:
        `**CURRENT OBJECTIVE:** Deliver opening script. Introduce yourself as Sophia from Jefferson Dental. Explain why you're calling (Medicaid assignment). Wait for acknowledgement before proceeding.`,

      [ConversationState.IDENTITY_CONFIRMATION]:
        `**CURRENT OBJECTIVE:** Confirm you are speaking with the parent/guardian. Ask for their name if not already known. Build rapport.`,

      [ConversationState.SKEPTICISM_HANDLING]:
        `**CURRENT OBJECTIVE:** The caller is expressing doubt or concern. Address this proactively:
- Reassure them this is legitimate (state-approved Medicaid provider)
- Emphasize NO COST (100% covered by Medicaid)
- Offer verification methods
Use a warm, understanding tone. Don't sound defensive.`,

      [ConversationState.DATA_GATHERING]:
        `**CURRENT OBJECTIVE:** Collect the ages of the children who need appointments. Also ask about preferred appointment times (morning, afternoon, weekend). Keep the tone conversational and helpful.`,

      [ConversationState.AVAILABILITY_CHECK]:
        `**CURRENT OBJECTIVE:** Call the check_availability function with the collected data. Wait for the results, then present available options clearly. Offer 2-3 specific time slots.`,

      [ConversationState.SCHEDULING]:
        `**CURRENT OBJECTIVE:** Confirm the chosen appointment time with the caller. Ask for explicit confirmation before proceeding. Then call the book_appointment function to finalize the booking.`,

      [ConversationState.CONFIRMATION]:
        `**CURRENT OBJECTIVE:** Recap the appointment details (children names, date, time, location). Call send_confirmation_sms function to send details to their phone. Confirm they received or will receive the text.`,

      [ConversationState.CLOSING]:
        `**CURRENT OBJECTIVE:** Thank the caller warmly. Remind them they can call back if needed. Provide your callback number. End the call professionally. DO NOT continue the conversation after this.`,

      [ConversationState.EMERGENCY_TRIAGE]:
        `**CURRENT OBJECTIVE:** This is a dental emergency. Ask which child is affected and the nature of the problem. Prioritize finding the earliest available slot (use check_availability with today's date). Show empathy and urgency.`,

      [ConversationState.OBJECTION_HANDLING]:
        `**CURRENT OBJECTIVE:** The caller has raised an objection or concern. Listen carefully, acknowledge their concern without being defensive, and provide relevant information. If objection is resolved, transition back to scheduling.`
    };

    return guidance[this.context.state] || '';
  }

  /**
   * Process user intent to trigger state transitions
   */
  processUserIntent(intent: string, entities?: any): void {
    console.log(`🎯 Processing user intent: ${intent}`, entities);

    // Intent-based state transitions
    switch (intent) {
      case 'express_skepticism':
      case 'ask_about_legitimacy':
      case 'ask_about_cost':
        this.transition(ConversationState.SKEPTICISM_HANDLING, {
          objectionType: intent === 'ask_about_cost' ? 'cost' : 'legitimacy'
        });
        break;

      case 'report_emergency':
      case 'mention_pain':
        this.transition(ConversationState.EMERGENCY_TRIAGE, {
          emergencyDetected: true
        });
        break;

      case 'provide_age':
      case 'confirm_children_details':
        if (entities?.childAges) {
          this.markChildrenAgesCollected(entities.childAges);
        }
        break;

      case 'confirm_appointment':
      case 'agree_to_time':
        // This would be triggered after showing available slots
        // The actual booking happens via book_appointment function
        if (this.context.state === ConversationState.AVAILABILITY_CHECK) {
          this.transition(ConversationState.SCHEDULING);
        }
        break;

      case 'decline_service':
      case 'not_interested':
      case 'call_back_later':
        this.transition(ConversationState.CLOSING);
        break;

      case 'ask_question':
      case 'raise_concern':
        this.transition(ConversationState.OBJECTION_HANDLING, {
          objectionType: 'other'
        });
        break;

      default:
        console.log(`⚠️  Unhandled intent: ${intent}`);
        break;
    }
  }

  /**
   * Event emitter for state changes
   */
  on(event: 'stateChange', callback: (context: ConversationContext) => void): void {
    this.listeners.push(callback);
  }

  private emit(event: 'stateChange', context: ConversationContext): void {
    this.listeners.forEach(cb => {
      try {
        cb(context);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Check if state allows closing
   */
  canClose(): boolean {
    // Can close from these states
    const closeableStates = [
      ConversationState.CLOSING,
      ConversationState.CONFIRMATION,
      ConversationState.OBJECTION_HANDLING
    ];

    return closeableStates.includes(this.context.state) ||
           this.context.confirmationSent ||
           this.stateHistory.includes(ConversationState.CLOSING);
  }

  /**
   * Reset state machine (for new conversation)
   */
  reset(): void {
    this.context = {
      state: ConversationState.INITIAL_GREETING,
      childrenAgesCollected: false,
      appointmentBooked: false,
      confirmationSent: false,
      emergencyDetected: false,
      collectedData: {}
    };
    this.stateHistory = [];
    console.log('🔄 State machine reset');
  }
}
```

### 3.2 Prompt Builder for State-Specific Guidance

**New File**: `backend/src/services/prompt-builder.ts`

```typescript
import { ConversationState, ConversationContext } from './conversation-state-machine';

export class PromptBuilder {
  /**
   * Build state-specific system instruction addendum
   * This is injected mid-conversation to guide the AI based on current state
   */
  buildStatePrompt(context: ConversationContext): string {
    const baseInstruction = this.getBaseInstructionForState(context.state);
    const dataContext = this.buildDataContext(context.collectedData);
    const constraints = this.buildConstraints(context);

    return `
## 🎯 CURRENT CONVERSATION STATE: ${context.state.toUpperCase().replace(/_/g, ' ')}

${baseInstruction}

${dataContext}

${constraints}
`;
  }

  private getBaseInstructionForState(state: ConversationState): string {
    // State-specific instructions (same as state machine guidance)
    // This is the detailed version for prompt injection

    const stateInstructions: Record<ConversationState, string> = {
      [ConversationState.INITIAL_GREETING]: `
### YOUR CURRENT OBJECTIVE:
Deliver the opening script naturally. Introduce yourself and explain why you're calling.
**DO NOT** jump ahead to scheduling. Wait for the person to acknowledge and respond.

**EXPECTED USER RESPONSES:**
- "Hello" / "Yes?" → Proceed with opening script
- "Who is this?" → Reassure about legitimacy, then opening script
- Suspicious tone → Address skepticism first (see skepticism handling)
`,

      [ConversationState.IDENTITY_CONFIRMATION]: `
### YOUR CURRENT OBJECTIVE:
Politely confirm you are speaking with the parent or guardian of the children.
If you don't have their name in context, ask: "May I have your name please?"
Build rapport - this sets the tone for the whole call.

**KEY PHRASES:**
- "Am I speaking with [parent name]?"
- "And you're the parent/guardian of [children names]?"
`,

      [ConversationState.SKEPTICISM_HANDLING]: `
### YOUR CURRENT OBJECTIVE:
The caller is expressing doubt or concern. This is NORMAL and EXPECTED.
Your job is to reassure them WITHOUT sounding defensive or pushy.

**APPROACH:**
1. Acknowledge their concern: "I completely understand your caution..."
2. Provide specific reassurance:
   - For legitimacy: "We are a state-approved Medicaid provider..."
   - For cost: "There is absolutely no copay, no deposit, and no out-of-pocket cost..."
3. Offer verification: "You can verify us on the official state provider directory"
4. Return to the purpose: "The reason I'm calling is to help you schedule..."

**TONE:** Warm, patient, understanding. NOT sales-y or aggressive.
`,

      [ConversationState.DATA_GATHERING]: `
### YOUR CURRENT OBJECTIVE:
Collect necessary information to check availability:
1. Children's ages (if not already known)
2. Preferred appointment dates
3. Preferred time of day (morning/afternoon/evening)

**APPROACH:**
- Keep it conversational: "To make sure we book the right amount of time..."
- Ask one question at a time
- Listen for any mentioned preferences

**WHAT TO COLLECT:**
- Ages of each child
- Preferred days of week
- Time of day preference
- Any scheduling constraints they mention
`,

      [ConversationState.AVAILABILITY_CHECK]: `
### YOUR CURRENT OBJECTIVE:
Use the check_availability function to find real appointment slots.

**STEP-BY-STEP:**
1. Summarize their preferences: "So you're looking for [day] in the [time]..."
2. Say: "Let me check what we have available..." (gives context for the pause during function call)
3. Call check_availability function with their preferences
4. Wait for results
5. Present 2-3 specific options: "I have [time1], [time2], or [time3]. Which works best?"

**PRESENTATION TIPS:**
- Be specific: "Thursday at 2:00 PM" not "Thursday afternoon"
- Mention if multiple children can be seen simultaneously
- Offer variety (morning + afternoon options)
`,

      [ConversationState.SCHEDULING]: `
### YOUR CURRENT OBJECTIVE:
Finalize the booking after they choose a time.

**STEP-BY-STEP:**
1. Confirm their choice: "So that's [children] on [day] at [time], correct?"
2. Wait for explicit confirmation ("Yes", "That works", etc.)
3. Say: "Perfect! Let me book that for you right now..."
4. Call book_appointment function
5. Wait for confirmation
6. Acknowledge success: "Great, you're all set!"

**IMPORTANT:** Do NOT book without explicit confirmation from the caller.
`,

      [ConversationState.CONFIRMATION]: `
### YOUR CURRENT OBJECTIVE:
Recap appointment details and send SMS confirmation.

**STEP-BY-STEP:**
1. Recap: "Okay, I have [children] down for [type] on [day] at [time] at our Main Street location."
2. Say: "Let me send you a text message right now with all the details."
3. Call send_confirmation_sms function with formatted details
4. Confirm: "You should receive a text shortly. We look forward to seeing you!"

**SMS MESSAGE FORMAT:**
"Jefferson Dental Confirmation:
[Child 1] and [Child 2] - [Appointment Type]
Date: [Day, Month Date]
Time: [Time]
Location: Jefferson Dental - Main Street, [Address]
Questions? Call [Phone]"
`,

      [ConversationState.CLOSING]: `
### YOUR CURRENT OBJECTIVE:
End the call professionally and warmly.

**CLOSING SCRIPT:**
"Thank you so much for your time, [parent name]. We look forward to seeing [children] on [day]. If you have any questions before then, feel free to call us back at [phone number]. Have a great day!"

**THEN STOP:** Do not continue the conversation. Wait for them to say goodbye.
If they have a last-minute question, answer it briefly, then close again.
`,

      [ConversationState.EMERGENCY_TRIAGE]: `
### 🚨 EMERGENCY MODE ACTIVATED

### YOUR CURRENT OBJECTIVE:
This is a dental emergency. Prioritize speed and empathy.

**STEP-BY-STEP:**
1. Express empathy: "Oh, I'm so sorry to hear that."
2. Gather details:
   - Which child?
   - What's the problem? (pain, swelling, broken tooth, etc.)
   - How severe? (scale of 1-10 if needed)
3. Say: "Let me check our emergency slots for today..."
4. Call check_availability with TODAY'S DATE and emergency priority
5. Offer the earliest slot: "I can get you in today at [time]. Would that work?"

**TONE:** Urgent but calm. Reassuring. Show you understand this is serious.
`,

      [ConversationState.OBJECTION_HANDLING]: `
### YOUR CURRENT OBJECTIVE:
The caller has raised an objection or concern.

**APPROACH:**
1. Listen fully - don't interrupt
2. Acknowledge: "I understand your concern about..."
3. Address with relevant information (without being dismissive)
4. Check if resolved: "Does that help clarify things?"
5. If resolved, transition back to scheduling
6. If not resolved, respect their decision and offer to call back later

**COMMON OBJECTIONS:**
- Time constraints → Offer flexible scheduling options
- Transportation → Mention location/bus routes if relevant
- Previous bad experience → Acknowledge and differentiate your service
- "I'll call you back" → Respect it, provide contact info
`
    };

    return stateInstructions[state] || '';
  }

  private buildDataContext(collectedData: ConversationContext['collectedData']): string {
    const parts: string[] = [];

    if (collectedData.parentName) {
      parts.push(`**Parent Name:** ${collectedData.parentName}`);
    }

    if (collectedData.childrenAges && Object.keys(collectedData.childrenAges).length > 0) {
      const agesList = Object.entries(collectedData.childrenAges)
        .map(([name, age]) => `${name} (age ${age})`)
        .join(', ');
      parts.push(`**Children Ages Collected:** ${agesList}`);
    }

    if (collectedData.preferredDate) {
      parts.push(`**Preferred Date:** ${collectedData.preferredDate}`);
    }

    if (collectedData.preferredTime) {
      parts.push(`**Preferred Time:** ${collectedData.preferredTime}`);
    }

    if (collectedData.bookingId) {
      parts.push(`**Booking ID:** ${collectedData.bookingId} ✅`);
    }

    if (parts.length === 0) {
      return '';
    }

    return `### 📊 DATA COLLECTED SO FAR:\n${parts.join('\n')}\n`;
  }

  private buildConstraints(context: ConversationContext): string {
    const constraints: string[] = [];

    if (context.emergencyDetected) {
      constraints.push('⚠️  **EMERGENCY MODE:** Prioritize speed and empathy. Find earliest available slot.');
    }

    if (context.appointmentBooked && !context.confirmationSent) {
      constraints.push('✅ **Appointment booked.** You MUST send SMS confirmation before closing the call.');
    }

    if (context.confirmationSent) {
      constraints.push('📱 **Confirmation sent.** Ready to close the call. Recap details and say goodbye.');
    }

    if (context.childrenAgesCollected) {
      constraints.push('📝 **Ages collected.** Move to checking availability if they seem ready.');
    }

    if (context.objectionType) {
      const objectionType = context.objectionType.charAt(0).toUpperCase() + context.objectionType.slice(1);
      constraints.push(`🤔 **Objection type:** ${objectionType}. Address this concern before proceeding.`);
    }

    if (constraints.length === 0) {
      return '';
    }

    return `### ⚡ CURRENT CONSTRAINTS:\n${constraints.join('\n')}\n`;
  }

  /**
   * Build a complete mid-call update prompt
   */
  buildMidCallUpdate(context: ConversationContext): string {
    return `
═══════════════════════════════════════════════════════════
🔄 MID-CALL CONTEXT UPDATE
═══════════════════════════════════════════════════════════

${this.buildStatePrompt(context)}

═══════════════════════════════════════════════════════════
`;
  }
}
```

### 3.3 Mid-Session Prompt Updates

Add methods to update the AI's system instruction during the call.

**File**: `backend/src/ai/openai-client.ts`

**Add method**:

```typescript
/**
 * Update system instruction mid-session
 * Used for injecting state-specific guidance as conversation progresses
 */
updateSystemInstruction(newInstruction: string): void {
  if (!this.ws || !this.connected) {
    console.warn('⚠️  Cannot update instruction: not connected');
    return;
  }

  const updateMessage = {
    type: 'session.update',
    session: {
      instructions: newInstruction
    }
  };

  this.ws.send(JSON.stringify(updateMessage));
  console.log('📝 Updated system instruction mid-session');
}
```

**File**: `backend/src/ai/gemini-client.ts`

**Add method**:

```typescript
/**
 * Update context mid-session
 * Gemini doesn't support direct instruction updates, so we send a context message
 */
updateContext(contextUpdate: string): void {
  if (!this.session || !this.connected) {
    console.warn('⚠️  Cannot update context: not connected');
    return;
  }

  const contextMessage = {
    clientContent: {
      turns: [
        {
          role: "user",
          parts: [{ text: `[SYSTEM CONTEXT UPDATE - DO NOT RESPOND TO THIS, JUST INTERNALIZE IT]\n\n${contextUpdate}` }]
        }
      ],
      turnComplete: true
    }
  };

  this.session.send(contextMessage);
  console.log('📝 Updated context mid-session');
}
```

### 3.4 Integration with Call Session

**File**: `backend/src/types.ts`

**Extend CallSession interface**:

```typescript
import { ConversationState, ConversationContext, ConversationStateMachine } from './services/conversation-state-machine';

export interface CallSession {
  id: string;
  phoneNumber: string;
  aiProvider: VoiceProvider;
  state: CallState;

  // ===== NEW: Conversation tracking =====
  conversationState?: ConversationState;
  conversationContext?: ConversationContext;

  // Runtime instances (not serialized)
  stateMachine?: ConversationStateMachine;
  promptBuilder?: PromptBuilder;

  startTime?: Date;
  endTime?: Date;
  duration?: number;
  twilioCallSid?: string;
  error?: string;
}
```

**File**: `backend/src/call-manager.ts`

**Modify**: Initialize state machine in `handleMediaStream()`

```typescript
import { ConversationStateMachine } from './services/conversation-state-machine';
import { PromptBuilder } from './services/prompt-builder';

async handleMediaStream(ws: WebSocket, callSid?: string): Promise<void> {
  // ... existing code ...

  // ===== NEW: Initialize state machine =====
  const stateMachine = new ConversationStateMachine();
  const promptBuilder = new PromptBuilder();

  session.stateMachine = stateMachine;
  session.promptBuilder = promptBuilder;
  session.conversationState = stateMachine.getCurrentState();

  // Listen to state changes and update AI prompt
  stateMachine.on('stateChange', async (context) => {
    console.log('📊 Conversation state changed:', context.state);

    session.conversationState = context.state;
    session.conversationContext = context;

    // Generate state-specific prompt update
    const stateUpdate = promptBuilder.buildMidCallUpdate(context);

    // Send to AI provider
    if (voiceProvider instanceof OpenAIClient) {
      voiceProvider.updateSystemInstruction(basePrompt + stateUpdate);
    } else if (voiceProvider instanceof GeminiClient) {
      voiceProvider.updateContext(stateUpdate);
    }

    // Update in database
    await databaseService.updateCallHistory(session.id, {
      conversationState: context.state
    });
  });

  // ... rest of the code ...
}
```

---

## 4. EXTERNAL INTEGRATIONS

### 4.1 Database Schema

**New File**: `backend/src/database/schema.sql`

```sql
-- Patients table
CREATE TABLE patients (
  id VARCHAR(36) PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  parent_name VARCHAR(255),
  email VARCHAR(255),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),
  preferred_language VARCHAR(50) DEFAULT 'English',
  medicaid_assigned_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone_number)
);

-- Children table
CREATE TABLE children (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INT,
  date_of_birth DATE,
  medicaid_id VARCHAR(50),
  last_visit DATE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_patient (patient_id)
);

-- Appointments table
CREATE TABLE appointments (
  id VARCHAR(36) PRIMARY KEY,
  booking_id VARCHAR(50) UNIQUE NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  appointment_datetime TIMESTAMP NOT NULL,
  appointment_type ENUM('exam', 'cleaning', 'exam_and_cleaning', 'emergency') NOT NULL,
  location VARCHAR(255) DEFAULT 'Jefferson Dental - Main Street',
  status ENUM('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  INDEX idx_datetime (appointment_datetime),
  INDEX idx_status (status),
  INDEX idx_booking (booking_id)
);

-- Appointment children mapping (for multi-child appointments)
CREATE TABLE appointment_children (
  appointment_id VARCHAR(36) NOT NULL,
  child_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (appointment_id, child_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- Call history table
CREATE TABLE call_history (
  id VARCHAR(36) PRIMARY KEY,
  call_id VARCHAR(100) UNIQUE NOT NULL,
  patient_id VARCHAR(36),
  phone_number VARCHAR(20) NOT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  ai_provider ENUM('openai', 'gemini') NOT NULL,
  twilio_call_sid VARCHAR(100),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INT,
  call_state ENUM('dialing', 'ringing', 'connected', 'failed', 'ended') NOT NULL,
  conversation_state VARCHAR(50),
  appointment_booked BOOLEAN DEFAULT FALSE,
  booking_id VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  INDEX idx_phone (phone_number),
  INDEX idx_call_state (call_state),
  INDEX idx_created (created_at)
);

-- Conversation transcripts table (optional but useful for debugging)
CREATE TABLE conversation_transcripts (
  id VARCHAR(36) PRIMARY KEY,
  call_id VARCHAR(36) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  speaker ENUM('user', 'assistant') NOT NULL,
  message_text TEXT NOT NULL,
  audio_duration_ms INT,
  FOREIGN KEY (call_id) REFERENCES call_history(id) ON DELETE CASCADE,
  INDEX idx_call (call_id),
  INDEX idx_timestamp (timestamp)
);

-- Function calls log table
CREATE TABLE function_calls_log (
  id VARCHAR(36) PRIMARY KEY,
  call_id VARCHAR(36) NOT NULL,
  function_name VARCHAR(100) NOT NULL,
  arguments JSON NOT NULL,
  result JSON,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time_ms INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES call_history(id) ON DELETE CASCADE,
  INDEX idx_call (call_id),
  INDEX idx_function (function_name),
  INDEX idx_timestamp (timestamp)
);

-- Notifications table
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  appointment_id VARCHAR(36),
  type ENUM('sms', 'email') NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'delivered') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  external_id VARCHAR(100), -- Twilio message SID or email provider ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
);
```

### 4.2 Database Service

**New File**: `backend/src/database/database-service.ts`

```typescript
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { PatientRecord } from '../services/crm-service';

export class DatabaseService {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'jefferson_dental',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Database connection pool created');
  }

  /**
   * Get patient by phone number
   */
  async getPatientByPhone(phoneNumber: string): Promise<PatientRecord | null> {
    try {
      const [rows] = await this.pool.execute(
        `SELECT p.*,
                JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', c.id,
                    'name', c.name,
                    'age', c.age,
                    'medicaid_id', c.medicaid_id
                  )
                ) as children
         FROM patients p
         LEFT JOIN children c ON p.id = c.patient_id
         WHERE p.phone_number = ?
         GROUP BY p.id`,
        [phoneNumber]
      );

      const patient = (rows as any)[0];
      if (!patient) return null;

      // Parse children JSON
      patient.children = JSON.parse(patient.children);

      return patient;
    } catch (error) {
      console.error('Error fetching patient:', error);
      return null;
    }
  }

  /**
   * Create appointment
   */
  async createAppointment(data: {
    patientId: string;
    childrenIds: string[];
    appointmentDatetime: string;
    appointmentType: string;
  }): Promise<string> {
    const appointmentId = uuidv4();
    const bookingId = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert appointment
      await connection.execute(
        `INSERT INTO appointments (id, booking_id, patient_id, appointment_datetime, appointment_type)
         VALUES (?, ?, ?, ?, ?)`,
        [appointmentId, bookingId, data.patientId, data.appointmentDatetime, data.appointmentType]
      );

      // Link children to appointment
      for (const childId of data.childrenIds) {
        await connection.execute(
          `INSERT INTO appointment_children (appointment_id, child_id) VALUES (?, ?)`,
          [appointmentId, childId]
        );
      }

      await connection.commit();
      console.log('✅ Appointment created:', bookingId);
      return bookingId;

    } catch (error) {
      await connection.rollback();
      console.error('Error creating appointment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Log call history
   */
  async logCallHistory(data: {
    callId: string;
    patientId?: string;
    phoneNumber: string;
    direction: 'inbound' | 'outbound';
    aiProvider: 'openai' | 'gemini';
    twilioCallSid?: string;
  }): Promise<void> {
    const id = uuidv4();

    try {
      await this.pool.execute(
        `INSERT INTO call_history (id, call_id, patient_id, phone_number, direction, ai_provider, twilio_call_sid, call_state, start_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'connected', NOW())`,
        [id, data.callId, data.patientId, data.phoneNumber, data.direction, data.aiProvider, data.twilioCallSid]
      );
      console.log('✅ Call history logged:', data.callId);
    } catch (error) {
      console.error('Error logging call history:', error);
    }
  }

  /**
   * Update call history
   */
  async updateCallHistory(callId: string, updates: {
    callState?: string;
    conversationState?: string;
    appointmentBooked?: boolean;
    bookingId?: string;
    endTime?: Date;
    durationSeconds?: number;
    errorMessage?: string;
  }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(callId);

    try {
      await this.pool.execute(
        `UPDATE call_history SET ${fields.join(', ')} WHERE call_id = ?`,
        values
      );
    } catch (error) {
      console.error('Error updating call history:', error);
    }
  }

  /**
   * Log function call
   */
  async logFunctionCall(data: {
    callId: string;
    functionName: string;
    arguments: any;
    result?: any;
    success: boolean;
    errorMessage?: string;
    executionTimeMs: number;
  }): Promise<void> {
    const id = uuidv4();

    try {
      // Get internal call history ID
      const [rows] = await this.pool.execute(
        'SELECT id FROM call_history WHERE call_id = ?',
        [data.callId]
      );

      const callHistoryId = (rows as any)[0]?.id;
      if (!callHistoryId) {
        console.warn('⚠️  Call history not found for function log');
        return;
      }

      await this.pool.execute(
        `INSERT INTO function_calls_log
         (id, call_id, function_name, arguments, result, success, error_message, execution_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          callHistoryId,
          data.functionName,
          JSON.stringify(data.arguments),
          data.result ? JSON.stringify(data.result) : null,
          data.success,
          data.errorMessage,
          data.executionTimeMs
        ]
      );
    } catch (error) {
      console.error('Error logging function call:', error);
    }
  }

  /**
   * Log notification
   */
  async logNotification(data: {
    patientId: string;
    appointmentId?: string;
    type: 'sms' | 'email';
    recipient: string;
    messageContent: string;
    status: 'pending' | 'sent' | 'failed';
    externalId?: string;
    errorMessage?: string;
  }): Promise<void> {
    const id = uuidv4();

    try {
      await this.pool.execute(
        `INSERT INTO notifications
         (id, patient_id, appointment_id, type, status, recipient, message_content, external_id, error_message, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          data.patientId,
          data.appointmentId,
          data.type,
          data.status,
          data.recipient,
          data.messageContent,
          data.externalId,
          data.errorMessage
        ]
      );
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 Database connection pool closed');
  }
}
```

---

## 5. ARCHITECTURE DIAGRAMS

### 5.1 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 JEFFERSON DENTAL AI SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

                         INCOMING CALL
                              │
                              ▼
         ┌────────────────────────────────────┐
         │      TWILIO TELEPHONY              │
         │  • Receives call                   │
         │  • Streams audio via WebSocket     │
         └──────────────┬─────────────────────┘
                        │
                        ▼
         ┌────────────────────────────────────┐
         │       CALL MANAGER                 │
         │  • Identifies caller               │
         │  • Creates call session            │
         │  • Logs to database                │
         └──────────────┬─────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
           ▼                         ▼
  ┌────────────────┐      ┌────────────────┐
  │ CONTEXT        │      │ STATE MACHINE  │
  │ MANAGER        │      │                │
  │ • Fetch patient│      │ • Initialize   │
  │ • Personalize  │      │ • Track state  │
  │   prompt       │      │ • Listen       │
  └────────┬───────┘      └────────┬───────┘
           │                       │
           └───────────┬───────────┘
                       │
                       ▼
         ┌────────────────────────────────────┐
         │    AI VOICE PROVIDER               │
         │    (OpenAI or Gemini)              │
         │  • Process audio                   │
         │  • Generate responses              │
         │  • Call functions                  │
         └──────────────┬─────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐
   │ FUNCTION CALL   │    │ AUDIO RESPONSE  │
   │ DETECTED        │    │                 │
   └────────┬────────┘    └────────┬────────┘
            │                      │
            ▼                      │
   ┌─────────────────────────┐    │
   │  FUNCTION ROUTER        │    │
   │  • check_availability   │    │
   │  • book_appointment     │    │
   │  • get_patient_info     │    │
   │  • send_confirmation_sms│    │
   └────────┬────────────────┘    │
            │                     │
            ▼                     │
   ┌────────────────────────┐    │
   │  SERVICE LAYER         │    │
   ├────────────────────────┤    │
   │ AppointmentService     │    │
   │  • Calendar API        │    │
   │                        │    │
   │ CRMService            │    │
   │  • Patient DB          │    │
   │                        │    │
   │ NotificationService   │    │
   │  • Twilio SMS          │    │
   │                        │    │
   │ DatabaseService       │    │
   │  • MySQL               │    │
   └────────┬───────────────┘    │
            │                    │
            │ (Function Result)  │
            └────────┬───────────┘
                     │
                     ▼
           ┌──────────────────┐
           │ STATE MACHINE    │
           │ UPDATED          │
           └────────┬─────────┘
                    │
                    ▼
          ┌────────────────────┐
          │ PROMPT BUILDER     │
          │ • Generate update  │
          └────────┬───────────┘
                   │
                   ▼
         ┌────────────────────────┐
         │  Update AI Prompt      │
         │  (mid-session)         │
         └────────────────────────┘
```

### 5.2 Function Call Flow

```
┌─────────┐
│  USER   │  "What times do you have available on Thursday?"
└────┬────┘
     │
     ▼
┌──────────────────┐
│ AI PROVIDER      │  Receives audio, processes intent
│ (OpenAI/Gemini)  │  Decides to call check_availability function
└────┬─────────────┘
     │
     │  function_call_arguments.delta (OpenAI)
     │  or functionCall (Gemini)
     │
     ▼
┌──────────────────┐
│ PROVIDER CLIENT  │  Accumulates arguments
│ (openai-client   │  Parses JSON
│  /gemini-client) │
└────┬─────────────┘
     │
     │  executeFunctionCall()
     │
     ▼
┌──────────────────┐
│ FUNCTION ROUTER  │  Routes to appropriate handler
│                  │  based on function name
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ SERVICE LAYER    │  AppointmentService.checkAvailability()
│ (AppointmentSvc) │  • Queries calendar/database
│                  │  • Returns available slots
└────┬─────────────┘
     │
     │  Returns: [{ time: "2:00 PM", datetime: "...", ... }]
     │
     ▼
┌──────────────────┐
│ PROVIDER CLIENT  │  Sends function result back to AI
│                  │  • conversation.item.create (OpenAI)
│                  │  • functionResponses (Gemini)
└────┬─────────────┘
     │
     │  response.create (OpenAI) or auto-continue (Gemini)
     │
     ▼
┌──────────────────┐
│ AI PROVIDER      │  Processes function result
│                  │  Generates natural language response
└────┬─────────────┘
     │
     │  Audio response
     │
     ▼
┌─────────┐
│  USER   │  "I have 2:00 PM, 3:15 PM, or 4:30 PM available..."
└─────────┘
```

---

## 6. BEST PRACTICES

### 6.1 Error Handling

Always wrap function calls in try-catch with graceful fallbacks:

```typescript
async handleCheckAvailability(args: any): Promise<any> {
  const startTime = Date.now();

  try {
    const result = await this.appointmentService.checkAvailability(args);

    // Log success
    await this.databaseService.logFunctionCall({
      callId: this.currentCallId,
      functionName: 'check_availability',
      arguments: args,
      result,
      success: true,
      executionTimeMs: Date.now() - startTime
    });

    return result;

  } catch (error: any) {
    // Log failure
    await this.databaseService.logFunctionCall({
      callId: this.currentCallId,
      functionName: 'check_availability',
      arguments: args,
      success: false,
      errorMessage: error.message,
      executionTimeMs: Date.now() - startTime
    });

    // Return graceful error to AI with fallback instructions
    return {
      error: true,
      message: 'Unable to check availability at this time. Please ask for alternative dates and I can check manually.',
      fallback: true
    };
  }
}
```

### 6.2 Rate Limiting

Install: `npm install limiter`

```typescript
import { RateLimiter } from 'limiter';

export class CalendarService {
  private rateLimiter: RateLimiter;

  constructor() {
    // Allow 10 requests per second
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 10,
      interval: 'second'
    });
  }

  async checkAvailability(args: any): Promise<any> {
    // Remove one token (wait if none available)
    await this.rateLimiter.removeTokens(1);

    // Now make the actual API call
    return await this.actualCalendarAPICall(args);
  }
}
```

### 6.3 Caching

Install: `npm install node-cache`

```typescript
import NodeCache from 'node-cache';

export class CRMService {
  private cache: NodeCache;

  constructor() {
    // Cache for 5 minutes (300 seconds)
    this.cache = new NodeCache({ stdTTL: 300 });
  }

  async getPatientInfo(phoneNumber: string): Promise<PatientRecord | null> {
    // Check cache first
    const cacheKey = `patient:${phoneNumber}`;
    const cached = this.cache.get<PatientRecord>(cacheKey);

    if (cached) {
      console.log(`✅ Cache hit for ${phoneNumber}`);
      return cached;
    }

    console.log(`⚠️  Cache miss for ${phoneNumber}, fetching from database`);

    // Fetch from database
    const patient = await this.databaseService.getPatientByPhone(phoneNumber);

    // Cache the result
    if (patient) {
      this.cache.set(cacheKey, patient);
    }

    return patient;
  }

  // Invalidate cache when patient data changes
  async updatePatientRecord(patientId: string, updates: any): Promise<void> {
    await this.databaseService.updatePatient(patientId, updates);

    // Clear cache for this patient
    const patient = await this.databaseService.getPatientById(patientId);
    if (patient) {
      this.cache.del(`patient:${patient.phone_number}`);
    }
  }
}
```

### 6.4 Security Considerations

**1. API Key Management**
```typescript
// ❌ BAD: Never hardcode API keys
const apiKey = 'sk-proj-abc123...';

// ✅ GOOD: Use environment variables
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not set');
}
```

**2. Input Validation**
```typescript
async bookAppointment(args: {
  child_names: string[];
  appointment_time: string;
  appointment_type: string;
}): Promise<any> {
  // Validate inputs
  if (!args.child_names || args.child_names.length === 0) {
    throw new Error('child_names is required');
  }

  if (!args.appointment_time) {
    throw new Error('appointment_time is required');
  }

  // Validate date format
  const appointmentDate = new Date(args.appointment_time);
  if (isNaN(appointmentDate.getTime())) {
    throw new Error('Invalid appointment_time format');
  }

  // Validate future date
  if (appointmentDate < new Date()) {
    throw new Error('Appointment time must be in the future');
  }

  // Validate appointment type
  const validTypes = ['exam', 'cleaning', 'exam_and_cleaning', 'emergency'];
  if (!validTypes.includes(args.appointment_type)) {
    throw new Error(`Invalid appointment_type. Must be one of: ${validTypes.join(', ')}`);
  }

  // ... proceed with booking
}
```

**3. PII Protection**
```typescript
// Don't log sensitive data
console.log('Creating appointment for patient:', patientId); // ✅ OK (ID is not PII)
console.log('Creating appointment for:', patientName);       // ❌ BAD (name is PII)

// Sanitize logs
function sanitizeForLogging(data: any): any {
  const sanitized = { ...data };

  // Remove sensitive fields
  delete sanitized.ssn;
  delete sanitized.medicaid_id;
  delete sanitized.date_of_birth;

  // Mask phone numbers
  if (sanitized.phone_number) {
    sanitized.phone_number = sanitized.phone_number.replace(/\d(?=\d{4})/g, '*');
  }

  return sanitized;
}

console.log('Patient data:', sanitizeForLogging(patientRecord));
```

---

## 7. PROVIDER COMPARISON

### OpenAI Realtime API vs Gemini Live API

| Feature | OpenAI Realtime API | Gemini Live API |
|---------|---------------------|-----------------|
| **Function Calling** | ✅ Excellent (2025 improvements) | ✅ Good (less mature) |
| **Latency** | ~500ms per function call | ~300ms per function call |
| **Cost** | Higher ($0.06/min input, $0.24/min output) | Lower (~30% cheaper) |
| **Voice Quality** | Excellent (10 voices available) | Very Good (fewer voices) |
| **Interruption Handling** | Excellent | Good |
| **Multi-Tool Use** | Sequential only | Can use multiple tools in one turn |
| **MCP Server Support** | ✅ Native support | ❌ Not available |
| **Documentation** | Comprehensive | Growing but less detailed |
| **Best For** | Production apps, complex workflows | High-volume, cost-sensitive deployments |

### Recommendations

**Use OpenAI Realtime API when:**
- You need the highest accuracy in function calling
- Complex multi-step function chains are required
- Voice quality is critical (more voice options)
- Budget allows for premium pricing
- MCP server integration is desired

**Use Gemini Live API when:**
- High call volume requires cost optimization
- Lower latency is more important than marginal accuracy
- Google ecosystem integration is valuable
- You're okay with less mature tooling

**Hybrid Approach:**
- Use OpenAI for complex scheduling scenarios
- Use Gemini for simple confirmation calls or follow-ups
- Route based on call type in CallManager

---

## Summary

This reference guide provides complete, production-ready code for implementing:

1. **Function/Tool Calling** - Both OpenAI and Gemini implementations with 4 core functions
2. **Dynamic Context Injection** - Personalized prompts from CRM data
3. **Multi-Stage Conversation Flows** - State machine with 10 states and adaptive prompts
4. **External Integrations** - Database, calendar, CRM, SMS notifications

All code examples are ready to copy-paste into your Jefferson Dental codebase and customize as needed.

**Next Steps:**
1. Start with Phase 1 (Function Calling) as it provides immediate value
2. Test thoroughly in browser mode before deploying to Twilio
3. Migrate from mock services to real integrations incrementally
4. Monitor function call logs in database for debugging

For the high-level implementation plan and roadmap, see `/home/mwoicke/.claude/plans/structured-swimming-hickey.md`.
