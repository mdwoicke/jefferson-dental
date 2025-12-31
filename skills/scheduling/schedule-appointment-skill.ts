import { BaseSkill, SkillResult } from '../skill-base';

export default class ScheduleAppointmentSkill extends BaseSkill {
  // Metadata is now loaded from schedule-appointment.skill.md

  async execute(input: {
    patientId: string;
    date: string;
    timeRange: string;
    numChildren: number;
    parentPhone: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting schedule_appointment skill for ${input.numChildren} children`);

    try {
      // Step 1: Check availability
      console.log('  Step 1/4: Checking availability...');
      const availability = await this.invokeTool('check_availability', {
        date: input.date,
        time_range: input.timeRange,
        num_children: input.numChildren
      });

      if (!availability || availability.length === 0) {
        return {
          success: false,
          message: `No available slots for ${input.date} in ${input.timeRange}`,
          data: { suggestedDates: await this.getSuggestedDates(input.date) }
        };
      }

      // Step 2: Select best slot (first available)
      const selectedSlot = availability[0];
      console.log(`  Step 2/4: Selected slot at ${selectedSlot.time}`);

      // Step 3: Book the appointment
      console.log('  Step 3/4: Booking appointment...');
      const booking = await this.invokeTool('book_appointment', {
        patient_id: input.patientId,
        datetime: selectedSlot.datetime,
        num_children: input.numChildren,
        notes: `Scheduled via AI voice agent - ${this.metadata.name}`
      });

      if (!booking.success) {
        return {
          success: false,
          message: 'Failed to book appointment',
          error: booking.error
        };
      }

      // Step 4: Send confirmation SMS
      console.log('  Step 4/4: Sending confirmation SMS...');
      await this.invokeTool('send_confirmation_sms', {
        phone_number: input.parentPhone,
        appointment_datetime: selectedSlot.datetime,
        child_names: booking.child_names
      });

      // Update context
      this.updateContext({
        sessionData: {
          lastAppointmentId: booking.appointment_id,
          lastBookedDatetime: selectedSlot.datetime
        }
      });

      return {
        success: true,
        message: 'Appointment successfully scheduled and confirmation sent',
        data: {
          appointmentId: booking.appointment_id,
          datetime: selectedSlot.datetime,
          time: selectedSlot.time,
          childNames: booking.child_names
        }
      };
    } catch (error: any) {
      console.error('❌ Skill execution failed:', error);
      return {
        success: false,
        message: 'An error occurred while scheduling',
        error: error.message
      };
    }
  }

  private async getSuggestedDates(requestedDate: string): Promise<string[]> {
    // Logic to suggest alternative dates
    const suggestions: string[] = [];
    const startDate = new Date(requestedDate);

    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + i);
      const dateStr = nextDate.toISOString().split('T')[0];

      // Check if this date has availability
      try {
        const availability = await this.invokeTool('check_availability', {
          date: dateStr,
          time_range: 'any',
          num_children: 1
        });

        if (availability && availability.length > 0) {
          suggestions.push(dateStr);
        }

        if (suggestions.length >= 3) break;
      } catch (error) {
        // Continue checking other dates
      }
    }

    return suggestions;
  }
}
