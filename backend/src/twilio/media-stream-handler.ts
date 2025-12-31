import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { MediaStreamEvent } from '../types';

/**
 * Handles Twilio Media Streams WebSocket connection
 * Receives and sends μ-law PCM audio @ 8kHz (base64 encoded)
 */
export class MediaStreamHandler extends EventEmitter {
  private ws: WebSocket;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private isActive = false;

  constructor(ws: WebSocket) {
    super();
    this.ws = ws;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws.on('message', (data: string) => {
      try {
        const event: MediaStreamEvent = JSON.parse(data);
        this.handleEvent(event);
      } catch (error) {
        console.error('❌ Failed to parse media stream message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('🔌 Twilio media stream closed');
      this.isActive = false;
      this.emit('streamClosed');
    });

    this.ws.on('error', (error) => {
      console.error('❌ Media stream WebSocket error:', error);
      this.emit('error', error);
    });
  }

  private handleEvent(event: MediaStreamEvent): void {
    switch (event.event) {
      case 'start':
        this.handleStreamStart(event);
        break;

      case 'media':
        this.handleMediaPayload(event);
        break;

      case 'stop':
        this.handleStreamStop(event);
        break;

      default:
        console.warn(`⚠️  Unknown media stream event: ${event.event}`);
    }
  }

  private handleStreamStart(event: MediaStreamEvent): void {
    if (!event.start) return;

    this.streamSid = event.start.streamSid;
    this.callSid = event.start.callSid;
    this.isActive = true;

    console.log('🎙️  Media stream started:', {
      streamSid: this.streamSid,
      callSid: this.callSid,
      mediaFormat: event.start.mediaFormat
    });

    this.emit('streamStarted', {
      streamSid: this.streamSid,
      callSid: this.callSid
    });
  }

  private handleMediaPayload(event: MediaStreamEvent): void {
    if (!event.media || !this.isActive) return;

    // Extract base64 μ-law audio payload
    const audioPayload = event.media.payload;

    // Emit for audio processing
    this.emit('audio', audioPayload);
  }

  private handleStreamStop(event: MediaStreamEvent): void {
    console.log('⏹️  Media stream stopped:', event.stop);
    this.isActive = false;
    this.emit('streamStopped');
  }

  /**
   * Send audio to Twilio (caller will hear this)
   * @param audioBase64 - Base64 encoded μ-law PCM @ 8kHz
   */
  sendAudio(audioBase64: string): void {
    if (!this.isActive || !this.streamSid) {
      console.warn('⚠️  Cannot send audio: stream not active');
      return;
    }

    try {
      const message = JSON.stringify({
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: audioBase64
        }
      });

      this.ws.send(message);
    } catch (error) {
      console.error('❌ Failed to send audio to Twilio:', error);
    }
  }

  /**
   * Send a mark event (for synchronization/debugging)
   */
  sendMark(name: string): void {
    if (!this.isActive || !this.streamSid) return;

    try {
      const message = JSON.stringify({
        event: 'mark',
        streamSid: this.streamSid,
        mark: {
          name
        }
      });

      this.ws.send(message);
    } catch (error) {
      console.error('❌ Failed to send mark:', error);
    }
  }

  /**
   * Clear the audio buffer (stop playing queued audio)
   */
  clearAudioBuffer(): void {
    if (!this.isActive || !this.streamSid) return;

    try {
      const message = JSON.stringify({
        event: 'clear',
        streamSid: this.streamSid
      });

      this.ws.send(message);
      console.log('🧹 Cleared Twilio audio buffer');
    } catch (error) {
      console.error('❌ Failed to clear buffer:', error);
    }
  }

  getCallSid(): string | null {
    return this.callSid;
  }

  getStreamSid(): string | null {
    return this.streamSid;
  }

  isStreamActive(): boolean {
    return this.isActive;
  }

  close(): void {
    this.isActive = false;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}
