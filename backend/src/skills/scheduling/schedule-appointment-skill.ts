/**
 * ScheduleAppointmentSkill - Multi-step workflow for scheduling dental appointments
 *
 * Orchestrates:
 * 1. check_availability - Find available time slots
 * 2. (selection happens in conversation)
 * 3. book_appointment - Create the booking
 * 4. send_confirmation_sms - Send confirmation to parent
 *
 * All steps are auto-logged to skill_execution_logs via BaseSkill.invokeTool()
 */

import { BaseSkill, SkillMetadata, SkillContext } from '../skill-base';
import type { DatabaseAdapter } from '../../database/db-interface';
import type { ToolRegistry } from '../../lib/tool-registry';
import { MarkdownParser } from '../../lib/markdown-parser';
import * as path from 'path';

export interface ScheduleAppointmentArgs {
  date: string;
  time_range: 'morning' | 'afternoon' | 'evening';
  num_children: number;
  child_names: string[];
  appointment_type: 'exam' | 'cleaning' | 'exam_and_cleaning' | 'emergency';
  phone_number: string;
  appointment_time?: string; // Optional: if user already selected a specific time
}

export interface ScheduleAppointmentResult {
  success: boolean;
  booking_id?: string;
  appointment_time?: string;
  booking?: any; // Full booking result from book_appointment
  confirmation_sent?: boolean;
  sms_sid?: string;
  error?: string;
  steps_completed: number;
  availability_checked?: boolean;
  slots_found?: number;
  message?: string;
}

/**
 * ScheduleAppointmentSkill - Full appointment scheduling workflow
 */
export class ScheduleAppointmentSkill extends BaseSkill {
  constructor(
    dbAdapter: DatabaseAdapter,
    toolRegistry: ToolRegistry,
    context: SkillContext
  ) {
    // Load metadata from .skill.md file (Claude skills pattern)
    const mdPath = path.join(__dirname, 'schedule-appointment.skill.md');
    const parsed = MarkdownParser.parseSkillMarkdown(mdPath);
    const metadata = parsed.metadata;

    super(metadata, dbAdapter, toolRegistry, context);

    console.log(`📖 Skill metadata loaded from .md file: ${metadata.name} v${metadata.version}`);
    console.log(`   File: ${mdPath}`);
    console.log(`   Category: ${metadata.category}`);
    console.log(`   Required tools: ${metadata.requiredTools.join(', ')}`);
    if (metadata.verificationMessage) {
      console.log(`   🔍 VERIFICATION: ${metadata.verificationMessage}`);
    }
  }

  /**
   * Execute the complete scheduling workflow
   */
  async execute(args: ScheduleAppointmentArgs): Promise<ScheduleAppointmentResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 EXECUTING SKILL: ${this.metadata.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Args:`, args);
    console.log(`${'='.repeat(60)}\n`);

    this.resetSteps(); // Start fresh

    const result: ScheduleAppointmentResult = {
      success: false,
      steps_completed: 0
    };

    try {
      // ========================================================================
      // STEP 1: Check Availability
      // ========================================================================
      const availabilityStep = await this.invokeTool(
        'Check available appointment slots',
        'check_availability',
        {
          date: args.date,
          time_range: args.time_range,
          num_children: args.num_children
        }
      );

      result.steps_completed = 1;
      result.availability_checked = availabilityStep.success;

      if (!availabilityStep.success) {
        result.error = `Failed to check availability: ${availabilityStep.error}`;
        return result;
      }

      // check_availability returns an array of AvailabilitySlot directly
      const availableSlots = availabilityStep.result;
      result.slots_found = Array.isArray(availableSlots) ? availableSlots.length : 0;

      if (!availableSlots || result.slots_found === 0) {
        result.error = 'No available slots found for the requested date/time';
        result.success = false;

        // Add distinctive marker for no availability
        return {
          ...result,
          message: `⚠️ MULTI-STEP SKILL RESULT: schedule_appointment Step 1 complete - No available slots found for ${args.date} ${args.time_range}. Please try a different date or time.`
        };
      }

      console.log(`✅ Found ${result.slots_found} available slot(s)`);

      // ========================================================================
      // STEP 2: Select Slot (if not already provided)
      // ========================================================================
      // In a real conversation, the AI would present slots to the user and get confirmation
      // For this workflow, we either use the provided appointment_time or pick the first slot
      const selectedTime = args.appointment_time || availableSlots[0].datetime;
      console.log(`📅 Selected appointment time: ${selectedTime}`);

      // ========================================================================
      // STEP 3: Book Appointment
      // ========================================================================
      const bookingStep = await this.invokeTool(
        'Book dental appointment',
        'book_appointment',
        {
          child_names: args.child_names,
          appointment_time: selectedTime,
          appointment_type: args.appointment_type
        }
      );

      result.steps_completed = 2;

      if (!bookingStep.success) {
        result.error = `Failed to book appointment: ${bookingStep.error}`;
        return result;
      }

      const bookingResult = bookingStep.result;
      result.booking_id = bookingResult.booking_id;
      result.appointment_time = bookingResult.appointment_time;
      result.booking = bookingResult; // Store full booking for frontend extraction

      console.log(`✅ Booking created: ${result.booking_id}`);

      // ========================================================================
      // STEP 4: Send Confirmation SMS
      // ========================================================================
      // Format appointment details for SMS
      const appointmentDetails = this.formatConfirmationDetails(
        args.child_names,
        selectedTime,
        args.appointment_type
      );

      const smsStep = await this.invokeTool(
        'Send SMS confirmation',
        'send_confirmation_sms',
        {
          phone_number: args.phone_number,
          appointment_details: appointmentDetails,
          booking_id: result.booking_id
        }
      );

      result.steps_completed = 3;

      if (!smsStep.success) {
        // SMS failure doesn't fail the entire workflow - booking still succeeded
        console.warn(`⚠️  SMS confirmation failed: ${smsStep.error}`);
        result.confirmation_sent = false;
      } else {
        result.confirmation_sent = smsStep.result.sent;
        result.sms_sid = smsStep.result.message_sid;
        console.log(`✅ SMS confirmation sent: ${result.sms_sid}`);
      }

      // ========================================================================
      // Success!
      // ========================================================================
      result.success = true;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ SKILL COMPLETED SUCCESSFULLY: ${this.metadata.name}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Steps completed: ${result.steps_completed}/3`);
      console.log(`Booking ID: ${result.booking_id}`);
      console.log(`Appointment time: ${result.appointment_time}`);
      console.log(`Confirmation sent: ${result.confirmation_sent}`);
      console.log(`${'='.repeat(60)}\n`);

      // Add distinctive marker that will appear in AI transcription
      // Include verification message from .md file to prove it was loaded
      const verificationTag = this.metadata.verificationMessage
        ? ` [${this.metadata.verificationMessage}]`
        : '';

      return {
        ...result,
        message: `✅ SKILL WORKFLOW COMPLETE: Appointment ${result.booking_id} scheduled for ${new Date(result.appointment_time || '').toLocaleDateString()} at ${new Date(result.appointment_time || '').toLocaleTimeString()}. All ${result.steps_completed} steps executed successfully. SMS confirmation ${result.confirmation_sent ? 'sent' : 'pending'}.${verificationTag}`
      };
    } catch (error: any) {
      console.error(`❌ Skill execution failed:`, error);
      result.error = error.message;
      result.success = false;

      // Add distinctive error marker that will appear in AI transcription
      const verificationTag = this.metadata.verificationMessage
        ? ` [${this.metadata.verificationMessage}]`
        : '';

      return {
        ...result,
        message: `⚠️ SKILL ERROR: Workflow failed at step ${result.steps_completed}. Error: ${error.message}${verificationTag}`
      };
    }
  }

  /**
   * Format confirmation details for SMS
   */
  private formatConfirmationDetails(
    childNames: string[],
    appointmentTime: string,
    appointmentType: string
  ): string {
    const names = childNames.join(' and ');
    const date = new Date(appointmentTime);
    const formattedTime = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${names} - ${formattedTime} (${appointmentType.replace(/_/g, ' ')})`;
  }
}
