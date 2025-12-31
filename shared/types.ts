// Shared types between frontend and backend

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
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  twilioCallSid?: string;
  error?: string;
  conversationId?: string; // For fetching transcripts
}

export interface InitiateCallRequest {
  phoneNumber: string;
  provider: VoiceProvider;
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
}

export interface ProviderConfig {
  provider: VoiceProvider;
  apiKey: string;
  model: string;
  systemInstruction: string;
  voiceName: string;
}

export interface VoiceProviderCallbacks {
  onOpen: () => void;
  onMessage: (message: ProviderMessage) => void;
  onClose: () => void;
  onError: (error: Error) => void;
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
