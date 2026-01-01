import * as fs from 'fs';
import * as path from 'path';
import Ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path from ffmpeg-static
if (ffmpegStatic) {
  Ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface AmbientAudioConfig {
  enabled: boolean;
  volume: number; // 0-1 scale
  audioFile: string; // Path to audio file (relative to public/)
}

/**
 * Handles ambient background audio mixing for telephony calls
 * Loads audio file, converts to μ-law 8kHz, and sends to Twilio
 */
export class AmbientAudioMixer {
  private config: AmbientAudioConfig;
  private ambientBuffer: Buffer | null = null; // μ-law encoded audio
  private bufferPosition = 0;
  private isLoaded = false;
  private silenceInterval: NodeJS.Timeout | null = null;
  private sendAudioCallback: ((audio: string) => void) | null = null;

  // Audio chunk size for Twilio (20ms of 8kHz audio = 160 samples)
  private readonly CHUNK_SIZE = 160;
  private readonly CHUNK_INTERVAL_MS = 20;

  constructor(config: AmbientAudioConfig) {
    this.config = config;
  }

  /**
   * Load ambient audio file and convert to μ-law 8kHz format
   */
  async load(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('⏭️ Ambient audio disabled in config');
      return false;
    }

    try {
      // Resolve audio file path
      const audioPath = this.resolveAudioPath();
      if (!audioPath) {
        return false;
      }

      console.log(`🔊 Loading ambient audio from: ${audioPath}`);

      // Check if we have a pre-converted μ-law file
      const ulawCachePath = this.getUlawCachePath(audioPath);
      if (fs.existsSync(ulawCachePath)) {
        console.log(`📂 Loading cached μ-law audio: ${ulawCachePath}`);
        this.ambientBuffer = fs.readFileSync(ulawCachePath);
        this.isLoaded = true;
        console.log(`✅ Ambient audio loaded from cache: ${this.ambientBuffer.length} bytes (${(this.ambientBuffer.length / 8000).toFixed(1)}s)`);
        return true;
      }

      // Convert using ffmpeg
      console.log(`🔄 Converting audio to μ-law 8kHz format...`);
      const ulawData = await this.convertToUlaw(audioPath);

      if (!ulawData) {
        console.error('❌ Failed to convert audio file');
        return false;
      }

      this.ambientBuffer = ulawData;
      this.isLoaded = true;

      // Cache the converted file for next time
      try {
        const cacheDir = path.dirname(ulawCachePath);
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(ulawCachePath, ulawData);
        console.log(`💾 Cached converted audio: ${ulawCachePath}`);
      } catch (e) {
        console.warn(`⚠️ Could not cache converted audio: ${e}`);
      }

      console.log(`✅ Ambient audio loaded: ${this.ambientBuffer.length} bytes (${(this.ambientBuffer.length / 8000).toFixed(1)}s)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load ambient audio:', error);
      return false;
    }
  }

  /**
   * Resolve the audio file path from config
   */
  private resolveAudioPath(): string | null {
    // audioFile is like "/audio/office-ambience.mp3"
    // Try various locations
    const possiblePaths = [
      path.join(process.cwd(), '..', 'public', this.config.audioFile),
      path.join(process.cwd(), 'public', this.config.audioFile),
      path.join(process.cwd(), this.config.audioFile),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    console.warn(`⚠️ Ambient audio file not found: ${this.config.audioFile}`);
    console.log(`   Tried paths:`);
    possiblePaths.forEach(p => console.log(`     - ${p}`));
    return null;
  }

  /**
   * Get cache path for converted μ-law file
   */
  private getUlawCachePath(originalPath: string): string {
    const cacheDir = path.join(process.cwd(), 'audio-cache');
    const basename = path.basename(originalPath, path.extname(originalPath));
    return path.join(cacheDir, `${basename}-8khz.ulaw`);
  }

  /**
   * Convert audio file to μ-law 8kHz using ffmpeg
   */
  private convertToUlaw(inputPath: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];

      // Apply volume reduction in ffmpeg (cleaner than JS-based scaling)
      // Convert 0-1 volume to dB: 0.3 → -10.5dB, 0.5 → -6dB, 1.0 → 0dB
      const volumeDb = this.config.volume > 0
        ? (Math.log10(this.config.volume) * 20).toFixed(1)
        : '-60'; // Effectively silent if volume is 0

      Ffmpeg(inputPath)
        .audioFilters(`volume=${volumeDb}dB`)
        .audioFrequency(8000)
        .audioChannels(1)
        .audioCodec('pcm_mulaw')
        .format('mulaw')
        .on('error', (err: Error) => {
          console.error('❌ FFmpeg conversion error:', err.message);
          resolve(null);
        })
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`✅ FFmpeg conversion complete: ${buffer.length} bytes`);
          resolve(buffer);
        })
        .pipe()
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on('error', (err: Error) => {
          console.error('❌ Pipe error:', err);
          resolve(null);
        });
    });
  }

  /**
   * Get the next chunk of ambient audio (loops automatically)
   * Returns base64-encoded μ-law audio ready for Twilio
   */
  getNextChunk(): string | null {
    if (!this.isLoaded || !this.ambientBuffer) {
      return null;
    }

    // Extract chunk from circular buffer
    const chunk = Buffer.alloc(this.CHUNK_SIZE);
    for (let i = 0; i < this.CHUNK_SIZE; i++) {
      chunk[i] = this.ambientBuffer[(this.bufferPosition + i) % this.ambientBuffer.length];
    }

    // Advance position (loop)
    this.bufferPosition = (this.bufferPosition + this.CHUNK_SIZE) % this.ambientBuffer.length;

    // Note: Volume is pre-applied during FFmpeg conversion for better quality
    return chunk.toString('base64');
  }

  /**
   * Start sending continuous ambient audio
   * Call this when the call connects
   */
  startContinuousAmbient(sendAudio: (audio: string) => void): void {
    if (!this.isLoaded) {
      console.log('⏭️ Cannot start continuous ambient: not loaded');
      return;
    }

    this.sendAudioCallback = sendAudio;

    // Send ambient chunks every 20ms
    this.silenceInterval = setInterval(() => {
      const chunk = this.getNextChunk();
      if (chunk && this.sendAudioCallback) {
        this.sendAudioCallback(chunk);
      }
    }, this.CHUNK_INTERVAL_MS);

    console.log(`🔊 Continuous ambient audio started (${Math.round(this.config.volume * 100)}% volume, looping)`);
  }

  /**
   * Stop sending continuous ambient audio
   */
  stopContinuousAmbient(): void {
    if (this.silenceInterval) {
      clearInterval(this.silenceInterval);
      this.silenceInterval = null;
    }
    this.sendAudioCallback = null;
    console.log('🔇 Continuous ambient audio stopped');
  }

  /**
   * Apply volume scaling to μ-law buffer (in-place)
   */
  private applyVolume(buffer: Buffer, volume: number): void {
    for (let i = 0; i < buffer.length; i++) {
      const sample = this.ulawDecode(buffer[i]);
      const scaled = Math.round(sample * volume);
      buffer[i] = this.ulawEncode(scaled);
    }
  }

  /**
   * Decode μ-law sample to linear PCM16
   */
  private ulawDecode(ulaw: number): number {
    ulaw = ~ulaw;
    const sign = ulaw & 0x80;
    const exponent = (ulaw >> 4) & 0x07;
    const mantissa = ulaw & 0x0F;

    let magnitude = ((mantissa << 3) + 0x84) << exponent;
    magnitude -= 0x84;

    return sign ? -magnitude : magnitude;
  }

  /**
   * Encode linear PCM16 sample to μ-law
   */
  private ulawEncode(sample: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;

    const sign = (sample >> 8) & 0x80;
    if (sign) {
      sample = -sample;
    }

    if (sample > CLIP) {
      sample = CLIP;
    }

    sample += BIAS;

    let exponent = 7;
    let expMask = 0x4000;
    for (let i = 0; i < 8; i++) {
      if ((sample & expMask) !== 0) {
        break;
      }
      exponent--;
      expMask >>= 1;
    }

    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    const ulawByte = ~(sign | (exponent << 4) | mantissa);

    return ulawByte & 0xFF;
  }

  /**
   * Check if ambient audio is enabled and loaded
   */
  isActive(): boolean {
    return this.config.enabled && this.isLoaded;
  }

  /**
   * Get current config
   */
  getConfig(): AmbientAudioConfig {
    return this.config;
  }
}
