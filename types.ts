export interface LiveConfig {
  model: string;
  systemInstruction?: string;
  voiceName?: string;
}

export interface VolumeLevel {
  input: number;
  output: number;
}

export type VoiceProvider = 'openai' | 'gemini';

export type ToolSystemMode = 'static' | 'dynamic' | 'error-fallback';

export interface ProviderConfig {
  provider: VoiceProvider;
  apiKey: string;
  model: string;
  systemInstruction: string;
  voiceName: string;
}

export interface AudioMessage {
  type: 'audio';
  data: Uint8Array;
}

export interface InterruptMessage {
  type: 'interrupt';
}

export type ProviderMessage = AudioMessage | InterruptMessage;

export interface VoiceProviderCallbacks {
  onOpen: () => void;
  onMessage: (message: ProviderMessage) => void;
  onClose: () => void;
  onError: (error: Error) => void;
  onTranscript?: (role: 'user' | 'assistant', text: string, speechStartTime?: Date, responseId?: string) => void;
  onTranscriptDelta?: (role: 'user' | 'assistant', delta: string, responseId: string, itemId?: string, speechStartTime?: Date) => void;
  onFunctionCall?: (callId: string, functionName: string, args: any) => void;
  onFunctionResult?: (callId: string, functionName: string, result: any, executionTimeMs: number, status: 'success' | 'error', errorMessage?: string) => void;
  onToolSystemMode?: (mode: ToolSystemMode) => void;
}

export interface IVoiceProvider {
  connect(config: ProviderConfig, callbacks: VoiceProviderCallbacks): Promise<void>;
  sendAudio(audioData: Uint8Array): void;
  sendText(text: string): void;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  setPatientContext(patientId: string, phoneNumber: string): void;
}

// Function calling types
export interface FunctionCall {
  call_id: string;
  name: string;
  arguments: string;
}

export interface FunctionCallMessage {
  type: 'function_call';
  functionName: string;
  arguments: any;
  callId: string;
}

export interface FunctionResultMessage {
  type: 'function_result';
  functionName: string;
  result: any;
  callId: string;
}

// Enhanced provider message types with function calling
export type EnhancedProviderMessage =
  | AudioMessage
  | InterruptMessage
  | FunctionCallMessage
  | FunctionResultMessage;
