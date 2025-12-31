/**
 * Audio format conversion utilities
 * Handles μ-law ↔ PCM16 conversion and sample rate resampling
 */

// G.711 μ-law decode table
const ULAW_DECODE_TABLE = new Int16Array([
  -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
  -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
  -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
  -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
  -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
  -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
  -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
  -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
  -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
  -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
  -876, -844, -812, -780, -748, -716, -684, -652,
  -620, -588, -556, -524, -492, -460, -428, -396,
  -372, -356, -340, -324, -308, -292, -276, -260,
  -244, -228, -212, -196, -180, -164, -148, -132,
  -120, -112, -104, -96, -88, -80, -72, -64,
  -56, -48, -40, -32, -24, -16, -8, 0,
  32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
  23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
  15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
  11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
  7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
  5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
  3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
  2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
  1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
  1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
  876, 844, 812, 780, 748, 716, 684, 652,
  620, 588, 556, 524, 492, 460, 428, 396,
  372, 356, 340, 324, 308, 292, 276, 260,
  244, 228, 212, 196, 180, 164, 148, 132,
  120, 112, 104, 96, 88, 80, 72, 64,
  56, 48, 40, 32, 24, 16, 8, 0
]);

export class AudioConverter {
  /**
   * Convert Twilio μ-law 8kHz audio to AI-compatible PCM16 24kHz
   * @param ulawBase64 - Base64 encoded μ-law PCM @ 8kHz
   * @returns Uint8Array containing PCM16 @ 24kHz
   */
  static twilioToAi(ulawBase64: string): Uint8Array {
    // 1. Decode base64 to Buffer
    const ulawBuffer = Buffer.from(ulawBase64, 'base64');

    // 2. μ-law decode → PCM16 @ 8kHz
    const pcm16At8k = this.ulawToPcm16(ulawBuffer);

    // 3. Resample 8kHz → 24kHz (triple the sample count)
    const pcm16At24k = this.resample(pcm16At8k, 8000, 24000);

    // 4. Convert Int16Array to Uint8Array (raw bytes)
    return new Uint8Array(pcm16At24k.buffer);
  }

  /**
   * Convert AI PCM16 24kHz audio to Twilio μ-law 8kHz
   * @param pcm16At24k - Uint8Array containing PCM16 @ 24kHz
   * @returns Base64 encoded μ-law PCM @ 8kHz
   */
  static aiToTwilio(pcm16At24k: Uint8Array): string {
    // 1. Convert Uint8Array to Int16Array
    const int16Array = new Int16Array(pcm16At24k.buffer, pcm16At24k.byteOffset, pcm16At24k.byteLength / 2);

    // 2. Resample 24kHz → 8kHz (reduce to 1/3 of samples)
    const pcm16At8k = this.resample(int16Array, 24000, 8000);

    // 3. PCM16 → μ-law encode
    const ulawBuffer = this.pcm16ToUlaw(pcm16At8k);

    // 4. Encode to base64
    return ulawBuffer.toString('base64');
  }

  /**
   * Decode μ-law to linear PCM16
   * @param ulaw - Buffer containing μ-law encoded samples
   * @returns Int16Array containing linear PCM16 samples
   */
  private static ulawToPcm16(ulaw: Buffer): Int16Array {
    const output = new Int16Array(ulaw.length);

    for (let i = 0; i < ulaw.length; i++) {
      output[i] = ULAW_DECODE_TABLE[ulaw[i]];
    }

    return output;
  }

  /**
   * Encode linear PCM16 to μ-law
   * @param pcm - Int16Array containing linear PCM16 samples
   * @returns Buffer containing μ-law encoded samples
   */
  private static pcm16ToUlaw(pcm: Int16Array): Buffer {
    const output = Buffer.alloc(pcm.length);

    for (let i = 0; i < pcm.length; i++) {
      output[i] = this.encodeUlawSample(pcm[i]);
    }

    return output;
  }

  /**
   * Encode a single PCM16 sample to μ-law
   * Uses the G.711 μ-law algorithm
   */
  private static encodeUlawSample(sample: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;

    // Get sign and magnitude
    const sign = (sample >> 8) & 0x80;
    if (sign) {
      sample = -sample;
    }

    // Clip the magnitude
    if (sample > CLIP) {
      sample = CLIP;
    }

    // Add bias
    sample += BIAS;

    // Convert to compressed form
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
   * Resample audio using linear interpolation
   * @param input - Int16Array of input samples
   * @param fromRate - Input sample rate (Hz)
   * @param toRate - Output sample rate (Hz)
   * @returns Int16Array of resampled audio
   */
  private static resample(
    input: Int16Array,
    fromRate: number,
    toRate: number
  ): Int16Array {
    if (fromRate === toRate) {
      return input;
    }

    const ratio = toRate / fromRate;
    const outputLength = Math.floor(input.length * ratio);
    const output = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      // Calculate source position (fractional)
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      // Linear interpolation
      output[i] = Math.round(
        input[srcIndexFloor] * (1 - fraction) +
        input[srcIndexCeil] * fraction
      );
    }

    return output;
  }

  /**
   * Convert μ-law to AI-compatible format for Gemini (16kHz instead of 24kHz)
   */
  static twilioToGemini(ulawBase64: string): Uint8Array {
    const ulawBuffer = Buffer.from(ulawBase64, 'base64');
    const pcm16At8k = this.ulawToPcm16(ulawBuffer);
    const pcm16At16k = this.resample(pcm16At8k, 8000, 16000);
    return new Uint8Array(pcm16At16k.buffer);
  }

  /**
   * Convert Gemini PCM16 16kHz to Twilio μ-law 8kHz
   */
  static geminiToTwilio(pcm16At16k: Uint8Array): string {
    const int16Array = new Int16Array(pcm16At16k.buffer, pcm16At16k.byteOffset, pcm16At16k.byteLength / 2);
    const pcm16At8k = this.resample(int16Array, 16000, 8000);
    const ulawBuffer = this.pcm16ToUlaw(pcm16At8k);
    return ulawBuffer.toString('base64');
  }

  /**
   * Calculate RMS (Root Mean Square) volume level
   * @param samples - Int16Array of PCM samples
   * @returns Volume level between 0 and 1
   */
  static calculateVolume(samples: Int16Array): number {
    if (samples.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768.0;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / samples.length);
    return Math.min(rms, 1.0);
  }
}
