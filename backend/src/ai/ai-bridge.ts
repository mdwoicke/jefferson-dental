import { EventEmitter } from 'events';
import { MediaStreamHandler } from '../twilio/media-stream-handler';
import { IVoiceProvider, VoiceProvider } from '../types';
import { AudioConverter } from './audio-converter';
import { AmbientAudioMixer } from './ambient-audio-mixer';

interface AmbientAudioConfig {
  enabled: boolean;
  volume: number;
  audioFile: string;
}

/**
 * Bidirectional audio bridge between Twilio and AI providers
 * Routes audio: Twilio (μ-law 8kHz) ↔ AI (PCM16 24kHz/16kHz)
 * Optionally mixes ambient background audio with AI output
 */
export class AudioBridge extends EventEmitter {
  private twilioStream: MediaStreamHandler;
  private aiProvider: IVoiceProvider;
  private providerType: VoiceProvider;
  private isActive = false;
  private ambientMixer: AmbientAudioMixer | null = null;
  private ambientConfig: AmbientAudioConfig | undefined;

  constructor(
    twilioStream: MediaStreamHandler,
    aiProvider: IVoiceProvider,
    providerType: VoiceProvider,
    ambientConfig?: AmbientAudioConfig
  ) {
    super();
    this.twilioStream = twilioStream;
    this.aiProvider = aiProvider;
    this.providerType = providerType;
    this.ambientConfig = ambientConfig;
  }

  /**
   * Start the bidirectional audio bridge
   */
  async start(): Promise<void> {
    console.log(`🌉 Starting audio bridge (Twilio ↔ ${this.providerType})`);
    this.isActive = true;

    // Initialize ambient audio mixer if configured
    if (this.ambientConfig?.enabled) {
      console.log(`🔊 Initializing ambient audio mixer (volume: ${Math.round(this.ambientConfig.volume * 100)}%)`);
      this.ambientMixer = new AmbientAudioMixer(this.ambientConfig);
      const loaded = await this.ambientMixer.load();
      if (loaded) {
        // Start continuous ambient audio in background
        this.ambientMixer.startContinuousAmbient((audio) => {
          if (this.isActive) {
            this.twilioStream.sendAudio(audio);
          }
        });
      }
    }

    // Route 1: Twilio → AI (caller speaks)
    this.twilioStream.on('audio', (ulawBase64: string) => {
      if (!this.isActive) return;

      try {
        // Convert μ-law 8kHz → PCM16 (24kHz for OpenAI, 16kHz for Gemini)
        const aiAudio = this.providerType === 'openai'
          ? AudioConverter.twilioToAi(ulawBase64)
          : AudioConverter.twilioToGemini(ulawBase64);

        // Send to AI provider
        this.aiProvider.sendAudio(aiAudio);
      } catch (error) {
        console.error('❌ Error processing Twilio → AI audio:', error);
      }
    });

    // Route 2: AI → Twilio (AI responds)
    if ('on' in this.aiProvider) {
      (this.aiProvider as any).on('audio', (pcm16: Uint8Array) => {
        if (!this.isActive) return;

        try {
          // Convert PCM16 (24kHz/16kHz) → μ-law 8kHz
          const twilioAudio = this.providerType === 'openai'
            ? AudioConverter.aiToTwilio(pcm16)
            : AudioConverter.geminiToTwilio(pcm16);

          // Send to Twilio stream (caller hears this)
          this.twilioStream.sendAudio(twilioAudio);
        } catch (error) {
          console.error('❌ Error processing AI → Twilio audio:', error);
        }
      });

      // Handle interruptions (user speaks during AI response)
      (this.aiProvider as any).on('interrupt', () => {
        console.log('⚠️  User interrupted - clearing Twilio buffer');
        this.twilioStream.clearAudioBuffer();
      });
    }

    // Stream lifecycle events
    this.twilioStream.on('streamStarted', (data) => {
      console.log('📞 Call connected:', data);
      this.emit('callConnected', data);
    });

    this.twilioStream.on('streamStopped', () => {
      console.log('📞 Call ended');
      this.stop();
    });

    this.twilioStream.on('streamClosed', () => {
      console.log('🔌 Media stream closed');
      this.stop();
    });

    this.emit('bridgeStarted');
  }

  /**
   * Stop the audio bridge
   */
  stop(): void {
    if (!this.isActive) return;

    console.log('🛑 Stopping audio bridge');
    this.isActive = false;

    // Stop ambient audio mixer
    if (this.ambientMixer) {
      this.ambientMixer.stopContinuousAmbient();
      this.ambientMixer = null;
    }

    // Disconnect AI provider
    try {
      this.aiProvider.disconnect();
    } catch (error) {
      console.error('❌ Error disconnecting AI provider:', error);
    }

    // Close Twilio stream
    try {
      this.twilioStream.close();
    } catch (error) {
      console.error('❌ Error closing Twilio stream:', error);
    }

    this.emit('bridgeStopped');
  }

  /**
   * Check if bridge is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get the Twilio call SID
   */
  getCallSid(): string | null {
    return this.twilioStream.getCallSid();
  }
}
