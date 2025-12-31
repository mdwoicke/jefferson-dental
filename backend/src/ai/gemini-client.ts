import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { EventEmitter } from 'events';
import { IVoiceProvider, ProviderConfig, VoiceProviderCallbacks, ProviderMessage } from '../types';

/**
 * Google Gemini Live API provider for backend (Node.js)
 * Adapted from frontend Gemini provider
 */
export class GeminiClient extends EventEmitter implements IVoiceProvider {
  private session: any = null;
  private connected: boolean = false;
  private callbacks: VoiceProviderCallbacks | null = null;

  async connect(config: ProviderConfig, callbacks: VoiceProviderCallbacks): Promise<void> {
    this.callbacks = callbacks;

    const ai = new GoogleGenAI({ apiKey: config.apiKey });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 SENDING TO GEMINI - System Instructions (length: ${config.systemInstruction.length} chars)`);
    console.log(`${'='.repeat(60)}`);
    console.log(config.systemInstruction);
    console.log(`${'='.repeat(60)}\n`);

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

          // Handle Interruption
          if (message.serverContent?.interrupted) {
            console.log("⚠️ Interrupted by user");
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

  sendAudio(audioData: Uint8Array): void {
    if (!this.session || !this.connected) return;

    // Convert Uint8Array (PCM16) to Float32Array for Gemini
    const float32Data = new Float32Array(audioData.length / 2);
    const dataView = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);

    for (let i = 0; i < float32Data.length; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32Data[i] = int16 / 32768.0;
    }

    // Create PCM blob
    const pcmBlob = this.createPcmBlob(float32Data);

    // Send to Gemini
    try {
      this.session.sendRealtimeInput({ media: pcmBlob });
    } catch (error) {
      console.error('❌ Failed to send audio to Gemini:', error);
    }
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

    try {
      this.session.send(textMessage);
      console.log('📝 Sent text to Gemini:', text);
    } catch (error) {
      console.error('❌ Error sending text to Gemini:', error);
      this.callbacks?.onError(error as Error);
    }
  }

  disconnect(): void {
    if (this.session) {
      try {
        this.session.close?.();
      } catch (error) {
        console.error('❌ Error closing Gemini session:', error);
      }
      this.session = null;
    }
    this.connected = false;
    this.callbacks = null;
    console.log('🔌 Gemini session disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Helper to create PCM blob for Gemini
  private createPcmBlob(float32Array: Float32Array): any {
    // Convert Float32Array to ArrayBuffer
    const buffer = float32Array.buffer;

    return {
      mimeType: 'audio/pcm',
      data: Buffer.from(buffer).toString('base64')
    };
  }

  // Helper to convert base64 to Uint8Array (for receiving audio from Gemini)
  private base64ToUint8Array(base64: string): Uint8Array {
    const buffer = Buffer.from(base64, 'base64');
    return new Uint8Array(buffer);
  }
}
