import twilio from 'twilio';
import { config } from '../config';

export class TwilioClient {
  private client: twilio.Twilio;
  private phoneNumber: string;

  constructor() {
    this.client = twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
    this.phoneNumber = config.twilio.phoneNumber;
  }

  /**
   * Initiate an outbound call to a phone number
   * Returns the Twilio Call SID
   */
  async initiateCall(toNumber: string): Promise<string> {
    try {
      console.log(`📞 Initiating call from ${this.phoneNumber} to ${toNumber}`);

      const call = await this.client.calls.create({
        to: toNumber,
        from: this.phoneNumber,
        url: `${config.server.host}/voice-webhook`,
        statusCallback: `${config.server.host}/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        method: 'POST'
      });

      console.log(`✅ Call initiated with SID: ${call.sid}`);
      return call.sid;
    } catch (error: any) {
      console.error('❌ Twilio call initiation failed:', error.message);
      throw new Error(`Failed to initiate call: ${error.message}`);
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    try {
      console.log(`🔚 Ending call ${callSid}`);

      await this.client.calls(callSid).update({
        status: 'completed'
      });

      console.log(`✅ Call ${callSid} ended`);
    } catch (error: any) {
      console.error('❌ Failed to end call:', error.message);
      throw new Error(`Failed to end call: ${error.message}`);
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<string> {
    try {
      const call = await this.client.calls(callSid).fetch();
      return call.status;
    } catch (error: any) {
      console.error('❌ Failed to fetch call status:', error.message);
      throw new Error(`Failed to get call status: ${error.message}`);
    }
  }

  /**
   * Generate TwiML response that connects media stream to our WebSocket
   */
  generateStreamTwiML(): string {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${config.server.host.replace('https://', '').replace('http://', '')}/media-stream" />
  </Connect>
</Response>`;

    return twiml;
  }

  /**
   * Validate that Twilio signature matches (for webhook security)
   */
  validateSignature(
    signature: string,
    url: string,
    params: Record<string, any>
  ): boolean {
    return twilio.validateRequest(
      config.twilio.authToken,
      signature,
      url,
      params
    );
  }

  /**
   * Send SMS message to a phone number
   * Returns the Twilio Message SID
   */
  async sendSMS(to: string, body: string): Promise<{ sid: string }> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(to)) {
        throw new Error(`Invalid phone number format: ${to}`);
      }

      console.log(`📱 Sending SMS from ${this.phoneNumber} to ${to}`);
      console.log(`   Message: ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);

      const message = await this.client.messages.create({
        to: to,
        from: this.phoneNumber,
        body: body
      });

      console.log(`✅ SMS sent with SID: ${message.sid}`);
      return { sid: message.sid };
    } catch (error: any) {
      console.error('❌ Twilio SMS send failed:', error.message);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Validate phone number format
   * Accepts E.164 format (+1234567890) or US format (1234567890)
   */
  isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // E.164 format: +1234567890 (1 to 15 digits)
    if (cleaned.startsWith('+')) {
      return /^\+\d{1,15}$/.test(cleaned);
    }

    // US format: 10 or 11 digits (with or without country code)
    return /^\d{10,11}$/.test(cleaned);
  }
}
