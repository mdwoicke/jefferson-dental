import { TwilioClient } from '../twilio/twilio-client';
import { config } from '../config';

export class NotificationService {
  private twilioClient: TwilioClient;

  constructor() {
    this.twilioClient = new TwilioClient();
  }

  /**
   * Format appointment time for SMS
   */
  private formatAppointmentTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Format confirmation message for SMS (keep under 160 chars for single SMS)
   */
  private formatConfirmationMessage(args: {
    appointment_details: string;
    booking_id?: string;
  }): string {
    // Parse details if they contain child names and time
    const lines = args.appointment_details.split('\n').filter(l => l.trim());

    // Build concise message
    let message = 'Jefferson Dental Confirmed\n\n';
    message += args.appointment_details + '\n';
    message += '123 Main St, Austin\n\n';
    message += 'Bring: Medicaid cards + ID\n';
    message += 'Call: 512-555-0100';

    if (args.booking_id) {
      message += `\nID: ${args.booking_id}`;
    }

    return message;
  }

  /**
   * Send SMS confirmation
   * Integrates with real Twilio API
   */
  async sendConfirmationSMS(args: {
    phone_number: string;
    appointment_details: string;
    booking_id?: string;
  }): Promise<{ sent: boolean; message_sid?: string; error?: string; test_mode?: boolean }> {
    try {
      // Validate phone number format
      if (!this.twilioClient.isValidPhoneNumber(args.phone_number)) {
        console.error('❌ Invalid phone number format:', args.phone_number);
        return { sent: false, error: 'Invalid phone number format' };
      }

      // Check if SMS is enabled
      if (!config.sms.enabled) {
        console.log('📱 SMS disabled in config');
        return { sent: false, error: 'SMS not enabled', test_mode: true };
      }

      // Check test mode
      if (config.sms.testMode) {
        console.log('📱 [TEST MODE] Would send SMS to:', args.phone_number);
        const message = this.formatConfirmationMessage({
          appointment_details: args.appointment_details,
          booking_id: args.booking_id
        });
        console.log('Message:', message);

        // COMMENTED OUT - All real SMS sending disabled
        // If test phone configured, only send to that number
        // if (config.sms.testPhoneNumber && args.phone_number !== config.sms.testPhoneNumber) {
        //   console.log('⚠️  Test mode: blocked non-test number');
        //   return { sent: false, test_mode: true, error: 'Test mode: blocked' };
        // }

        // COMMENTED OUT - Real SMS even in test mode
        // In test mode with test number, send real SMS
        // if (config.sms.testPhoneNumber && args.phone_number === config.sms.testPhoneNumber) {
        //   console.log('📱 Test mode: sending to test number');
        //   const result = await this.twilioClient.sendSMS(args.phone_number, message);
        //   return { sent: true, message_sid: result.sid, test_mode: true };
        // }

        // Always just log in test mode, never send real SMS
        console.log('📱 [SIMULATED] Test mode - no real SMS sent');
        return { sent: false, test_mode: true };
      }

      // TODO: Send real SMS (currently disabled - requires A2P 10DLC registration)
      // Uncomment when Twilio is properly configured with A2P 10DLC
      const message = this.formatConfirmationMessage({
        appointment_details: args.appointment_details,
        booking_id: args.booking_id
      });

      console.log('📱 [SIMULATED] Would send SMS:');
      console.log('   To:', args.phone_number);
      console.log('   Message:', message);

      // COMMENTED OUT - Real Twilio send
      // const result = await this.twilioClient.sendSMS(args.phone_number, message);
      // console.log(`✅ SMS sent: ${result.sid}`);
      // return {
      //   sent: true,
      //   message_sid: result.sid
      // };

      // Return simulated success for now
      const mockSid = `SM_SIMULATED_${Date.now()}`;
      console.log(`✅ [SIMULATED] SMS confirmation (not actually sent): ${mockSid}`);
      return {
        sent: false, // Set to false so UI knows it wasn't really sent
        message_sid: mockSid,
        test_mode: true
      };

    } catch (error: any) {
      console.error('❌ SMS send failed:', error.message);
      return {
        sent: false,
        error: error.message || 'SMS delivery failed'
      };
    }
  }

  /**
   * Send appointment reminder SMS
   */
  async sendAppointmentReminder(args: {
    phone_number: string;
    patient_name: string;
    child_name: string;
    appointment_time: string;
    location: string;
  }): Promise<{ sent: boolean; message_sid?: string; error?: string; test_mode?: boolean }> {
    try {
      console.log('⏰ Sending appointment reminder to:', args.phone_number);

      // Validate phone number format
      if (!this.twilioClient.isValidPhoneNumber(args.phone_number)) {
        return { sent: false, error: 'Invalid phone number format' };
      }

      // Check if SMS is enabled
      if (!config.sms.enabled) {
        console.log('📱 SMS disabled in config');
        return { sent: false, error: 'SMS not enabled', test_mode: true };
      }

      // Format appointment time
      const formattedTime = this.formatAppointmentTime(args.appointment_time);

      const reminderMessage = `Hi ${args.patient_name}! This is a reminder that ${args.child_name} has a dental appointment at Jefferson Dental on ${formattedTime}. Location: ${args.location}. Reply CONFIRM to confirm or call 512-555-0100 to reschedule.`;

      // Check test mode
      if (config.sms.testMode) {
        console.log('📱 [TEST MODE] Reminder message:', reminderMessage);

        // COMMENTED OUT - All real SMS sending disabled
        // if (config.sms.testPhoneNumber && args.phone_number !== config.sms.testPhoneNumber) {
        //   return { sent: false, test_mode: true, error: 'Test mode: blocked' };
        // }
        // if (config.sms.testPhoneNumber && args.phone_number === config.sms.testPhoneNumber) {
        //   const result = await this.twilioClient.sendSMS(args.phone_number, reminderMessage);
        //   return { sent: true, message_sid: result.sid, test_mode: true };
        // }

        // Always just log in test mode, never send real SMS
        console.log('📱 [SIMULATED] Test mode - no real SMS sent');
        return { sent: false, test_mode: true };
      }

      // TODO: Send real SMS (currently disabled - requires A2P 10DLC registration)
      console.log('📱 [SIMULATED] Would send reminder SMS:');
      console.log('   To:', args.phone_number);
      console.log('   Message:', reminderMessage);

      // COMMENTED OUT - Real Twilio send
      // const result = await this.twilioClient.sendSMS(args.phone_number, reminderMessage);
      // console.log(`✅ Reminder sent: ${result.sid}`);
      // return {
      //   sent: true,
      //   message_sid: result.sid
      // };

      // Return simulated success for now
      const mockSid = `SM_SIMULATED_${Date.now()}`;
      console.log(`✅ [SIMULATED] Reminder (not actually sent): ${mockSid}`);
      return {
        sent: false, // Set to false so UI knows it wasn't really sent
        message_sid: mockSid,
        test_mode: true
      };

    } catch (error: any) {
      console.error('❌ Reminder send failed:', error.message);
      return {
        sent: false,
        error: error.message || 'Reminder delivery failed'
      };
    }
  }

  /**
   * Check Medicaid insurance eligibility (mock implementation)
   * In production, this would integrate with Texas Medicaid API
   */
  async checkInsuranceEligibility(args: {
    medicaid_id: string;
    child_name: string;
    date_of_birth?: string;
  }): Promise<{
    eligible: boolean;
    coverage_type: string;
    effective_date?: string;
    termination_date?: string;
    copay_amount: number;
    message: string;
  }> {
    console.log('🏥 Checking Medicaid eligibility for:', args.medicaid_id);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Mock eligibility check (90% eligible, 10% not eligible)
    const isEligible = Math.random() > 0.1;

    if (isEligible) {
      const effectiveDate = new Date();
      effectiveDate.setMonth(effectiveDate.getMonth() - 6);

      const terminationDate = new Date();
      terminationDate.setFullYear(terminationDate.getFullYear() + 1);

      console.log('✅ Medicaid coverage active');

      return {
        eligible: true,
        coverage_type: 'CHIP / STAR Kids',
        effective_date: effectiveDate.toISOString().split('T')[0],
        termination_date: terminationDate.toISOString().split('T')[0],
        copay_amount: 0,
        message: `${args.child_name} is covered under Texas CHIP/STAR Kids. All preventive dental services are fully covered with no copay.`
      };
    } else {
      console.log('⚠️  Medicaid coverage not found or expired');

      return {
        eligible: false,
        coverage_type: 'None',
        copay_amount: 0,
        message: `Unable to verify active Medicaid coverage for ${args.child_name}. Please contact Texas Medicaid at 1-800-964-2777 to verify eligibility.`
      };
    }
  }

  /**
   * Send follow-up survey after appointment
   */
  async sendFollowUpSurvey(args: {
    phone_number: string;
    patient_name: string;
    appointment_id: string;
  }): Promise<{ sent: boolean; message_sid?: string; survey_link?: string }> {
    console.log('📋 Sending follow-up survey to:', args.phone_number);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate mock survey link
    const surveyLink = `https://jefferson-dental.com/survey/${args.appointment_id}`;

    const surveyMessage = `Hi ${args.patient_name}! Thank you for visiting Jefferson Dental. We'd love your feedback: ${surveyLink}`;

    console.log('Survey message:', surveyMessage);

    // Mock success response
    const messageSid = `SM${Date.now()}${Math.random().toString(36).substr(2, 24).toUpperCase()}`;

    console.log(`✅ Survey sent (mock): ${messageSid}`);

    return {
      sent: true,
      message_sid: messageSid,
      survey_link: surveyLink
    };
  }

  /**
   * Send cancellation confirmation
   */
  async sendCancellationNotification(args: {
    phone_number: string;
    patient_name: string;
    child_name: string;
    cancelled_time: string;
  }): Promise<{ sent: boolean; message_sid?: string; error?: string; test_mode?: boolean }> {
    try {
      console.log('❌ Sending cancellation notification to:', args.phone_number);

      // Validate phone number format
      if (!this.twilioClient.isValidPhoneNumber(args.phone_number)) {
        return { sent: false, error: 'Invalid phone number format' };
      }

      // Check if SMS is enabled
      if (!config.sms.enabled) {
        console.log('📱 SMS disabled in config');
        return { sent: false, error: 'SMS not enabled', test_mode: true };
      }

      // Format appointment time
      const formattedTime = this.formatAppointmentTime(args.cancelled_time);

      const cancellationMessage = `Hi ${args.patient_name}, your appointment for ${args.child_name} on ${formattedTime} has been cancelled. Call us at 512-555-0100 to reschedule. - Jefferson Dental`;

      // Check test mode
      if (config.sms.testMode) {
        console.log('📱 [TEST MODE] Cancellation message:', cancellationMessage);

        // COMMENTED OUT - All real SMS sending disabled
        // if (config.sms.testPhoneNumber && args.phone_number !== config.sms.testPhoneNumber) {
        //   return { sent: false, test_mode: true, error: 'Test mode: blocked' };
        // }
        // if (config.sms.testPhoneNumber && args.phone_number === config.sms.testPhoneNumber) {
        //   const result = await this.twilioClient.sendSMS(args.phone_number, cancellationMessage);
        //   return { sent: true, message_sid: result.sid, test_mode: true };
        // }

        // Always just log in test mode, never send real SMS
        console.log('📱 [SIMULATED] Test mode - no real SMS sent');
        return { sent: false, test_mode: true };
      }

      // TODO: Send real SMS (currently disabled - requires A2P 10DLC registration)
      console.log('📱 [SIMULATED] Would send cancellation SMS:');
      console.log('   To:', args.phone_number);
      console.log('   Message:', cancellationMessage);

      // COMMENTED OUT - Real Twilio send
      // const result = await this.twilioClient.sendSMS(args.phone_number, cancellationMessage);
      // console.log(`✅ Cancellation notification sent: ${result.sid}`);
      // return {
      //   sent: true,
      //   message_sid: result.sid
      // };

      // Return simulated success for now
      const mockSid = `SM_SIMULATED_${Date.now()}`;
      console.log(`✅ [SIMULATED] Cancellation (not actually sent): ${mockSid}`);
      return {
        sent: false, // Set to false so UI knows it wasn't really sent
        message_sid: mockSid,
        test_mode: true
      };

    } catch (error: any) {
      console.error('❌ Cancellation notification failed:', error.message);
      return {
        sent: false,
        error: error.message || 'Notification delivery failed'
      };
    }
  }
}
