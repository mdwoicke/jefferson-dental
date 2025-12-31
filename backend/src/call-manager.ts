import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { TwilioClient } from './twilio/twilio-client';
import { MediaStreamHandler } from './twilio/media-stream-handler';
import { AudioBridge } from './ai/ai-bridge';
import { OpenAIClient } from './ai/openai-client';
import { GeminiClient } from './ai/gemini-client';
import { CallSession, CallState, VoiceProvider, IVoiceProvider, ProviderConfig } from './types';
import { config } from './config';
import { initBackendDatabase } from './database/db-init';
import { NodeDatabaseAdapter } from './database/node-adapter';
import type { DatabaseAdapter, PatientRecord } from './database/db-interface';
import { CRMService } from './services/crm-service';
import { AppointmentService } from './services/appointment-service';
import { ConversationLogger } from './services/conversation-logger';
import { PromptBuilder } from './utils/prompt-builder';

// Import constants from frontend (we'll need to copy these)
const OPENAI_MODEL = 'gpt-4o-realtime-preview-2024-12-17';
const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
const OPENAI_VOICE = 'alloy';
const GEMINI_VOICE = 'Zephyr';

// Dental IVA prompt (from frontend constants.ts)
const DENTAL_IVA_PROMPT = `
SYSTEM INSTRUCTION:
You are Sophia, an AI outreach agent for Jefferson Dental Clinics.
Your specific task is to conduct OUTBOUND calls to parents/guardians of children under 18 who have been assigned to Jefferson Dental Clinics for their Medicaid dental benefits.

CONTEXT:
You are calling a simulated parent (the user) because their children appeared on a monthly state-generated list designating Jefferson Dental Clinics as their preferred provider.
**Specific Assignment Details:**
- The children assigned to this household are **Tony** and **Paula**.
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

"I wanted to help you get **Tony and Paula's** initial exams and cleanings scheduled before the schedule fills up. Am I speaking with the parent or guardian of the household?"

### 2. Handling Skepticism (Critical)
Parents often fear scams or hidden costs. You must proactively address this if they hesitate or ask questions.

**If they ask "Who is this?" / "Is this a scam?":**
"I completely understand your caution. We are a state-approved Medicaid provider, and we're contacting you because Tony and Paula are eligible for these benefits starting this month. You can verify us on the official state provider directory if you'd like."

**If they ask "How much does this cost?" / "Do I have to pay?":**
"That's the best part—because this is through the state Medicaid program, there is absolutely **no copay, no deposit, and no out-of-pocket cost** to you for these exams and cleanings. It is 100% covered."

### 3. Data Gathering & Scheduling
Once they agree to proceed:

"I see I have both Tony and Paula listed here. To make sure we book the right amount of time for the appointments, could you confirm their ages for me?"

[Collect Ages]

"Great. Since we need to see both of them, we can usually schedule them together to save you a trip."

### 4. Slot Allocation (Multi-Child Logic)
You need to offer flexible slots. You are scheduling for Tony and Paula.
- **Consecutive**: Tony at 3:00, Paula at 3:30.
- **Concurrent**: "We actually have two chairs open at 3:00 PM, so we could take Tony and Paula at the same time."

**Example Offer:**
"I have availability this Thursday afternoon. I could fit Tony and Paula in at 3:15 PM and 3:30 PM, or I have a block on Saturday morning at 10:00 AM. Which works better for your schedule?"

### 5. Closing & Confirmation
"Okay, I have Tony down for a cleaning this Thursday at 3:15 PM and Paula right after at 3:30 PM at our Main Street location. You'll receive a confirmation text shortly with the address. We look forward to seeing you then!"

## Edge Cases

1.  **"I have an emergency"**:
    "Oh, I'm sorry to hear that. Since this is an urgent matter, let me check our emergency slots for today. Is it for Tony or Paula? And can you tell me what's going on?" (Transition to emergency triage).

2.  **Too many children (e.g., more than just Tony and Paula)**:
    "We can certainly see other siblings as well if they are assigned. I might need to check if we have enough simultaneous chairs available. Would you prefer to bring them all at once?"

3.  **Language/Name Difficulties**:
    If you struggle to understand a name, be polite: "I apologize, I want to make sure I have the spelling correct for the insurance. Could you spell that for me?"

4.  **Refusal/Not Interested**:
    "I understand. You are welcome to call us back whenever you are ready to use the benefits. We'll keep Tony and Paula's file open for now. Have a great day."

## Important Rules
- **Do NOT** ask for credit card information (since it's free).
- **Do NOT** ask for social security numbers.
- **Stay in character**: You are helpful and trying to ensure they don't miss out on free benefits.
`;

/**
 * Manages call lifecycle and orchestrates Twilio + AI providers
 */
export class CallManager extends EventEmitter {
  private activeCalls: Map<string, CallSession> = new Map();
  private bridges: Map<string, AudioBridge> = new Map();
  private twilioClient: TwilioClient;
  private dbAdapter: DatabaseAdapter;
  private crmService: CRMService;

  constructor() {
    super();
    this.twilioClient = new TwilioClient();

    // Initialize database
    console.log('📦 Initializing backend database...');
    const db = initBackendDatabase();
    this.dbAdapter = new NodeDatabaseAdapter(db);
    this.crmService = new CRMService(this.dbAdapter);
    console.log('✅ Backend database initialized');
  }

  /**
   * Initiate an outbound call
   */
  async initiateCall(phoneNumber: string, aiProvider: VoiceProvider): Promise<string> {
    const callId = this.generateCallId();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📞 INITIATING CALL`);
    console.log(`   Call ID: ${callId}`);
    console.log(`   To: ${phoneNumber}`);
    console.log(`   AI Provider: ${aiProvider}`);
    console.log(`${'='.repeat(60)}\n`);

    // Fetch patient data from database
    let patientData: PatientRecord | null = null;
    try {
      console.log(`🔍 Loading patient data for: ${phoneNumber}`);
      patientData = await this.crmService.getPatientInfo(phoneNumber);

      if (patientData) {
        console.log(`✅ Patient loaded: ${patientData.parentName}`);
      } else {
        console.log(`⚠️  No patient found for: ${phoneNumber}, using fallback prompt`);
      }
    } catch (error: any) {
      console.error(`❌ Error loading patient data:`, error);
    }

    // Build dynamic prompt
    const systemInstruction = patientData
      ? PromptBuilder.buildOutboundCallPrompt(patientData)
      : DENTAL_IVA_PROMPT; // Fallback to static prompt

    console.log(`📝 Using ${patientData ? 'dynamic' : 'fallback'} prompt for call`);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SYSTEM INSTRUCTION BEING USED:`);
    console.log(`${'='.repeat(60)}`);
    console.log(systemInstruction);
    console.log(`${'='.repeat(60)}\n`);

    const session: CallSession = {
      id: callId,
      phoneNumber,
      aiProvider,
      state: CallState.DIALING,
      direction: 'outbound', // Mark as outbound call
      patientData, // Store patient data in session
      systemInstruction // Store dynamic prompt in session
    };

    this.activeCalls.set(callId, session);
    this.emitStateChange(session);

    try {
      // Step 1: Initiate Twilio call
      const twilioCallSid = await this.twilioClient.initiateCall(phoneNumber);
      session.twilioCallSid = twilioCallSid;
      session.state = CallState.RINGING;
      this.emitStateChange(session);

      // The call flow continues in handleMediaStream() when Twilio connects
      return callId;
    } catch (error: any) {
      console.error('❌ Failed to initiate call:', error);
      session.state = CallState.FAILED;
      session.error = error.message;
      this.emitStateChange(session);
      throw error;
    }
  }

  /**
   * Handle incoming media stream WebSocket from Twilio
   * Called by Express server when Twilio connects the media stream
   */
  async handleMediaStream(ws: WebSocket, callSid?: string): Promise<void> {
    console.log(`\n🎙️  MEDIA STREAM CONNECTED (Call SID: ${callSid || 'unknown'})\n`);

    let session: CallSession | undefined;

    try {
      // Create media stream handler first
      const mediaStream = new MediaStreamHandler(ws);

      // Wait for stream to start and get the actual CallSid from Twilio
      const streamData = await new Promise<{ callSid: string; streamSid: string }>((resolve) => {
        mediaStream.once('streamStarted', (data) => resolve(data));
      });

      // Use the CallSid from the stream start event
      const actualCallSid = streamData.callSid;
      console.log(`📞 Stream started with CallSid: ${actualCallSid}`);

      // Find the call session using the actual CallSid
      for (const [, sess] of this.activeCalls) {
        if (sess.twilioCallSid === actualCallSid || sess.state === CallState.RINGING) {
          session = sess;
          break;
        }
      }

      if (!session) {
        console.error(`❌ No active call found for CallSid: ${actualCallSid}`);
        ws.close();
        return;
      }

      // Update call state
      session.state = CallState.CONNECTED;
      session.startTime = new Date();
      this.emitStateChange(session);

      // Create AI provider with database adapter
      const aiProvider = this.createAIProvider(session.aiProvider);

      // Set patient context on provider if patient data exists
      if (session.patientData && aiProvider.setPatientContext) {
        aiProvider.setPatientContext(
          session.patientData.id,
          session.patientData.phoneNumber
        );
        console.log(`✅ Patient context set on provider for: ${session.patientData.parentName}`);
      }

      // Connect AI provider with dynamic prompt from session
      const providerConfig: ProviderConfig = {
        provider: session.aiProvider,
        apiKey: session.aiProvider === 'openai' ? config.ai.openaiKey : config.ai.geminiKey,
        model: session.aiProvider === 'openai' ? OPENAI_MODEL : GEMINI_MODEL,
        systemInstruction: session.systemInstruction || DENTAL_IVA_PROMPT, // Use dynamic prompt from session
        voiceName: session.aiProvider === 'openai' ? OPENAI_VOICE : GEMINI_VOICE
      };

      await aiProvider.connect(providerConfig, {
        onOpen: async () => {
          console.log('✅ AI provider connected');

          // Start conversation tracking
          const conversationLogger = new ConversationLogger(this.dbAdapter);
          const conversationId = await conversationLogger.startConversation({
            patientId: session!.patientData?.id,
            phoneNumber: session!.phoneNumber,
            direction: session!.direction || 'outbound',
            provider: session!.aiProvider,
            callSid: session!.twilioCallSid
          });

          // Store conversation ID in session
          session!.conversationId = conversationId;
          this.emitStateChange(session!); // Notify frontend
          console.log(`💬 Conversation started: ${conversationId}`);

          // Pass conversation ID to AI provider if it supports logging
          if ('setConversationId' in aiProvider && typeof aiProvider.setConversationId === 'function') {
            aiProvider.setConversationId(conversationId);
          }

          // Only send "Hello" trigger for OUTBOUND calls (AI speaks first)
          // For INBOUND calls, AI waits for caller to speak
          if (session!.direction === 'outbound') {
            console.log('📤 Sending "Hello" trigger for outbound call');
            setTimeout(() => {
              aiProvider.sendText("Hello");
            }, 500);
          } else {
            console.log('📥 Inbound call - waiting for caller to speak');
          }
        },
        onMessage: () => {}, // Handled by bridge
        onClose: () => console.log('🔌 AI provider disconnected'),
        onError: (err) => console.error('❌ AI provider error:', err),
        onFunctionCall: (callId: string, functionName: string, args: any) => {
          console.log(`🔧 Function call started: ${functionName}`, args);
          // Emit to server for WebSocket broadcast to frontend
          this.emit('functionCall', {
            sessionId: session!.id,
            callId,
            functionName,
            arguments: args
          });
        },
        onFunctionResult: (callId: string, functionName: string, result: any, executionTimeMs: number, status: 'success' | 'error', errorMessage?: string) => {
          console.log(`✅ Function call completed: ${functionName} (${status}) - ${executionTimeMs}ms`);
          // Emit to server for WebSocket broadcast to frontend
          this.emit('functionResult', {
            sessionId: session!.id,
            callId,
            functionName,
            result,
            executionTimeMs,
            status,
            errorMessage
          });
        },
        onTranscriptDelta: (role: 'user' | 'assistant', delta: string, responseId: string, itemId?: string, speechStartTime?: Date, delayMs?: number) => {
          // Emit delta for real-time transcript streaming to frontend
          // delayMs is calculated by the backend to sync transcript with audio playback on the phone
          this.emit('transcriptDelta', {
            sessionId: session!.id,
            conversationId: session!.conversationId,
            role,
            delta,
            responseId,
            itemId,
            speechStartTime: speechStartTime?.toISOString(),
            delayMs: delayMs || 0
          });
        },
        onTranscript: (role: 'user' | 'assistant', text: string, speechStartTime?: Date, responseId?: string) => {
          // Emit complete transcript to frontend (marks message as complete)
          this.emit('transcriptComplete', {
            sessionId: session!.id,
            conversationId: session!.conversationId,
            role,
            text,
            responseId,
            speechStartTime: speechStartTime?.toISOString()
          });
        }
      });

      // Create and start audio bridge
      const bridge = new AudioBridge(mediaStream, aiProvider, session.aiProvider);
      this.bridges.set(session.id, bridge);

      bridge.on('bridgeStopped', () => {
        this.handleCallEnd(session!.id);
      });

      await bridge.start();

      console.log(`✅ Call ${session.id} fully connected with audio bridge\n`);
    } catch (error: any) {
      console.error('❌ Error setting up media stream:', error);
      if (session) {
        session.state = CallState.FAILED;
        session.error = error.message;
        this.emitStateChange(session);
      }
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: string): Promise<void> {
    const session = this.activeCalls.get(callId);
    if (!session) {
      throw new Error(`Call ${callId} not found`);
    }

    console.log(`\n🔚 ENDING CALL ${callId}\n`);

    // End Twilio call
    if (session.twilioCallSid) {
      try {
        await this.twilioClient.endCall(session.twilioCallSid);
      } catch (error) {
        console.error('❌ Error ending Twilio call:', error);
      }
    }

    // Stop audio bridge
    const bridge = this.bridges.get(callId);
    if (bridge) {
      bridge.stop();
      this.bridges.delete(callId);
    }

    this.handleCallEnd(callId);
  }

  /**
   * Handle call end (cleanup and state update)
   */
  private handleCallEnd(callId: string): void {
    const session = this.activeCalls.get(callId);
    if (!session) return;

    session.state = CallState.ENDED;
    session.endTime = new Date();

    if (session.startTime) {
      session.duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      console.log(`⏱️  Call duration: ${session.duration.toFixed(1)}s`);
    }

    this.emitStateChange(session);
    this.emit('callEnded', session);

    // Cleanup after 60 seconds
    setTimeout(() => {
      this.activeCalls.delete(callId);
      console.log(`🧹 Cleaned up call ${callId}`);
    }, 60000);
  }

  /**
   * Get call session by ID
   */
  getCallSession(callId: string): CallSession | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): CallSession[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Create AI provider instance
   */
  private createAIProvider(provider: VoiceProvider): IVoiceProvider {
    switch (provider) {
      case 'openai':
        // OpenAI provider requires database adapter for conversation logging
        return new OpenAIClient(this.dbAdapter);
      case 'gemini':
        // Gemini provider doesn't require database adapter (legacy support)
        return new GeminiClient();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Generate unique call ID
   */
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit call state change event
   */
  private emitStateChange(session: CallSession): void {
    console.log(`📊 Call ${session.id} state: ${session.state}`);
    this.emit('callStateChanged', session);
  }

  /**
   * Find call session by Twilio Call SID
   */
  findSessionByTwilioSid(twilioCallSid: string): CallSession | undefined {
    for (const session of this.activeCalls.values()) {
      if (session.twilioCallSid === twilioCallSid) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Get CRM service instance for API access
   */
  getCRMService(): CRMService {
    return this.crmService;
  }

  /**
   * Get ConversationLogger instance for transcript access
   */
  getConversationLogger(): ConversationLogger {
    return new ConversationLogger(this.dbAdapter);
  }

  /**
   * Get DatabaseAdapter instance for API access
   */
  getDbAdapter(): DatabaseAdapter {
    return this.dbAdapter;
  }

  /**
   * Create a session for an inbound call
   * Called when Twilio webhook receives an incoming call
   */
  async createInboundSession(
    twilioCallSid: string,
    fromNumber: string,
    toNumber: string,
    provider: VoiceProvider
  ): Promise<string> {
    console.log(`\n📞 INBOUND CALL DETECTED`);
    console.log(`   From: ${fromNumber}`);
    console.log(`   To: ${toNumber}`);
    console.log(`   Twilio Call SID: ${twilioCallSid}`);
    console.log(`   AI Provider: ${provider}\n`);

    const callId = this.generateCallId();

    // Fetch patient data from database using caller's phone number
    let patientData: PatientRecord | null = null;
    try {
      console.log(`🔍 Loading patient data for: ${fromNumber}`);
      patientData = await this.crmService.getPatientInfo(fromNumber);

      if (patientData) {
        console.log(`✅ Patient loaded: ${patientData.parentName}`);
      } else {
        console.log(`⚠️  No patient found for: ${fromNumber}, using fallback prompt`);
      }
    } catch (error: any) {
      console.error(`❌ Error loading patient data:`, error);
    }

    // Build dynamic inbound call prompt
    const systemInstruction = patientData
      ? PromptBuilder.buildInboundCallPrompt(patientData)
      : PromptBuilder.buildInboundCallPrompt(null); // Fallback for unknown callers

    console.log(`📝 Using ${patientData ? 'personalized' : 'fallback'} inbound prompt`);

    const session: CallSession = {
      id: callId,
      phoneNumber: fromNumber, // For inbound, the caller's number
      aiProvider: provider,
      state: CallState.CONNECTED, // Inbound calls start as connected
      direction: 'inbound', // Mark as inbound call
      startTime: new Date(),
      twilioCallSid,
      patientData, // Store patient data in session
      systemInstruction // Store dynamic prompt in session
    };

    this.activeCalls.set(callId, session);
    this.emitStateChange(session);

    console.log(`✅ Created inbound session: ${callId}`);

    return callId;
  }
}
