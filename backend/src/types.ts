// Shared types between frontend and backend

import type { PatientRecord } from './database/db-interface';

export type VoiceProvider = 'openai' | 'gemini';

export enum CallState {
  IDLE = 'idle',
  DIALING = 'dialing',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  FAILED = 'failed',
  ENDED = 'ended'
}

export interface CallSession {
  id: string;
  phoneNumber: string;
  aiProvider: VoiceProvider;
  state: CallState;
  direction?: 'inbound' | 'outbound'; // Call direction
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  twilioCallSid?: string;
  error?: string;
  patientData?: PatientRecord | null;
  systemInstruction?: string;
  conversationId?: string; // For fetching transcripts
  demoConfig?: DemoConfigLite; // Demo config for tool configuration
}

// Tool configuration from demo config
export interface ToolConfigLite {
  toolName: string;
  toolType: 'predefined' | 'custom';
  isEnabled: boolean;
  displayName?: string;
  description?: string;
  parametersSchema?: any;
}

// Mock data pool for per-demo data
export interface MockDataPoolLite {
  poolType: string;
  poolName: string;
  records: Array<{ id: string; [key: string]: unknown }>;
}

// Simplified demo config for telephony - matches relevant fields from frontend DemoConfig
export interface DemoConfigLite {
  id?: string;
  name?: string;
  slug?: string;
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
  toolConfigs?: ToolConfigLite[];
  mockDataPools?: MockDataPoolLite[];
  ambientAudio?: {
    enabled: boolean;
    volume: number;
    audioFile: string;
  };
}

export interface InitiateCallRequest {
  phoneNumber: string;
  provider: VoiceProvider;
  demoConfig?: DemoConfigLite;
}

export interface CallResponse {
  callId: string;
  status: string;
  error?: string;
}

// WebSocket message types
export type WebSocketMessage =
  | CallStateChangedMessage
  | ErrorMessage;

export interface CallStateChangedMessage {
  type: 'callStateChanged';
  data: CallSession;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  callId?: string;
}

// Voice Provider interfaces (from existing frontend code)
export interface IVoiceProvider {
  connect(config: ProviderConfig, callbacks: VoiceProviderCallbacks): Promise<void>;
  sendAudio(audioData: Uint8Array): void;
  sendText(text: string): void;
  disconnect(): void;
  isConnected(): boolean;
  setPatientContext?(patientId: string, phoneNumber: string): void;
}

export interface ProviderConfig {
  provider: VoiceProvider;
  apiKey: string;
  model: string;
  systemInstruction: string;
  voiceName: string;
  toolConfigs?: ToolConfigLite[];
  mockDataPools?: MockDataPoolLite[];
  demoConfigId?: string;
  demoSlug?: string; // To identify which demo type (dental, nemt, etc.)
}

export interface VoiceProviderCallbacks {
  onOpen: () => void;
  onMessage: (message: ProviderMessage) => void;
  onClose: () => void;
  onError: (error: Error) => void;
  onTranscript?: (role: 'user' | 'assistant', text: string, speechStartTime?: Date, responseId?: string) => void;
  onTranscriptDelta?: (role: 'user' | 'assistant', delta: string, responseId: string, itemId?: string, speechStartTime?: Date, delayMs?: number) => void;
  onFunctionCall?: (callId: string, functionName: string, args: any) => void;
  onFunctionResult?: (callId: string, functionName: string, result: any, executionTimeMs: number, status: 'success' | 'error', errorMessage?: string) => void;
}

export type ProviderMessage = AudioMessage | InterruptMessage;

export interface AudioMessage {
  type: 'audio';
  audio: Uint8Array;
}

export interface InterruptMessage {
  type: 'interrupt';
}

// Twilio-specific types
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface MediaStreamEvent {
  event: 'start' | 'media' | 'stop';
  streamSid?: string;
  start?: {
    streamSid: string;
    callSid: string;
    accountSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64 μ-law PCM
  };
  stop?: {
    accountSid: string;
    callSid: string;
  };
}
