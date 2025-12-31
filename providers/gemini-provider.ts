import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { IVoiceProvider, ProviderConfig, VoiceProviderCallbacks, ProviderMessage } from '../types';
import { createPcmBlob, base64ToUint8Array } from '../utils/audio-utils';

export class GeminiProvider implements IVoiceProvider {
  private session: any = null;
  private connected: boolean = false;
  private callbacks: VoiceProviderCallbacks | null = null;
  private currentPatientId: string | null = null;
  private phoneNumber: string | null = null;

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
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Session Opened");
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
            const audioBytes = base64ToUint8Array(base64Audio);
            console.log(`📡 Gemini audio received: ${audioBytes.length} bytes`);
            if (audioBytes.length > 0) {
              const audioMessage: ProviderMessage = {
                type: 'audio',
                data: audioBytes
              };
              this.callbacks?.onMessage(audioMessage);
            }
          }

          // Handle Interruption
          if (message.serverContent?.interrupted) {
            console.log("Interrupted by user");
            const interruptMessage: ProviderMessage = {
              type: 'interrupt'
            };
            this.callbacks?.onMessage(interruptMessage);
          }
        },
        onclose: () => {
          console.log("Gemini Session Closed");
          this.connected = false;
          this.callbacks?.onClose();
        },
        onerror: (err) => {
          console.error("Gemini Session Error:", err);
          this.callbacks?.onError(new Error(String(err)));
        }
      }
    });

    this.session = await sessionPromise;
  }

  sendAudio(audioData: Uint8Array): void {
    if (!this.session || !this.connected) return;

    // Convert Uint8Array to Float32Array for Gemini
    const float32Data = new Float32Array(audioData.length / 2);
    const dataView = new DataView(audioData.buffer);

    for (let i = 0; i < float32Data.length; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32Data[i] = int16 / 32768.0;
    }

    const pcmBlob = createPcmBlob(float32Data);
    this.session.sendRealtimeInput({ media: pcmBlob });
  }

  sendText(text: string): void {
    if (!this.session || !this.connected) return;

    const textMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    };

    if (typeof this.session.send === 'function') {
      this.session.send(textMessage);
    } else if (typeof this.session.sendRealtimeInput === 'function') {
      this.session.sendRealtimeInput(textMessage);
    }
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      // Gemini sessions auto-close when connection is dropped
      this.session = null;
    }
    this.connected = false;
    this.callbacks = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  setPatientContext(patientId: string, phoneNumber: string): void {
    this.currentPatientId = patientId;
    this.phoneNumber = phoneNumber;
  }
}
