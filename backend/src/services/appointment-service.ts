/**
 * Appointment Service
 * Manages appointment scheduling with database persistence
 */

import { DatabaseAdapter } from '../database/db-interface';

export interface AvailabilitySlot {
  time: string;
  datetime: string;
  available_chairs: number;
  can_accommodate: boolean;
}

export interface AppointmentBooking {
  booking_id: string;
  status: 'confirmed' | 'pending' | 'failed';
  child_names: string[];
  appointment_time: string;
  appointment_type: string;
  location: string;
  confirmation_sent: boolean;
  sms_sent?: boolean;
  sms_sid?: string;
  sms_error?: string;
}

export class AppointmentService {
  private readonly TOTAL_CHAIRS = 3;
  private readonly DEFAULT_LOCATION = 'Jefferson Dental - Main Street';
  private currentPatientId: string | null = null;

  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Set current patient context for booking
   */
  setCurrentPatient(patientId: string): void {
    this.currentPatientId = patientId;
  }

  /**
   * Check availability for appointments
   * Queries database for existing appointments and calculates available slots
   */
  async checkAvailability(args: {
    date: string;
    time_range: string;
    num_children: number;
  }): Promise<AvailabilitySlot[]> {
    console.log('📅 Checking availability for:', args);

    try {
      // Get existing appointments for this date
      const existingAppointments = await this.dbAdapter.listAppointments({
        date: args.date,
        status: ['confirmed', 'pending']
      });

      // Generate time slots based on time_range
      const slots = this.generateTimeSlots(args.date, args.time_range);

      // Calculate availability for each slot
      const availableSlots: AvailabilitySlot[] = slots.map(slot => {
        // Count how many chairs are already booked at this time
        const bookedAtTime = existingAppointments.filter(
          apt => apt.appointment_time === slot.datetime
        );

        const bookedChairs = bookedAtTime.reduce(
          (sum, apt) => sum + (apt.child_count || 0),
          0
        );

        const availableChairs = this.TOTAL_CHAIRS - bookedChairs;
        const canAccommodate = availableChairs >= args.num_children;

        return {
          time: slot.time,
          datetime: slot.datetime,
          available_chairs: availableChairs,
          can_accommodate: canAccommodate
        };
      });

      // Filter to only slots that can accommodate the requested number of children
      const result = availableSlots.filter(slot => slot.can_accommodate);

      console.log(`✅ Found ${result.length} available slots`);
      return result;
    } catch (error) {
      console.error('❌ Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Book an appointment and persist to database
   */
  async bookAppointment(args: {
    child_names: string[];
    appointment_time: string;
    appointment_type: string;
  }): Promise<AppointmentBooking> {
    console.log('📝 Booking appointment:', args);

    if (!this.currentPatientId) {
      throw new Error('No patient context set for booking');
    }

    try {
      // Generate unique booking ID
      const bookingId = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Begin transaction
      await this.dbAdapter.beginTransaction();

      try {
        // Create appointment in database
        await this.dbAdapter.createAppointment({
          id: bookingId,
          booking_id: bookingId,
          patient_id: this.currentPatientId,
          appointment_time: args.appointment_time,
          appointment_type: args.appointment_type,
          status: 'confirmed',
          location: this.DEFAULT_LOCATION,
          confirmation_sent: false
        });

        // Link children to appointment
        const children = await this.dbAdapter.getChildrenByPatient(this.currentPatientId);

        for (const childName of args.child_names) {
          const child = children.find(c => c.name === childName);
          if (child) {
            await this.dbAdapter.linkChildToAppointment(bookingId, child.id);
          } else {
            console.warn(`⚠️  Child "${childName}" not found in patient record`);
          }
        }

        // Log audit trail
        await this.dbAdapter.logAudit({
          table_name: 'appointments',
          record_id: bookingId,
          operation: 'INSERT',
          new_value: {
            appointment_time: args.appointment_time,
            appointment_type: args.appointment_type,
            child_names: args.child_names
          },
          changed_by: 'ai_agent',
          change_reason: 'Appointment booked via AI conversation'
        });

        // Commit transaction
        await this.dbAdapter.commit();

        const booking: AppointmentBooking = {
          booking_id: bookingId,
          status: 'confirmed',
          child_names: args.child_names,
          appointment_time: args.appointment_time,
          appointment_type: args.appointment_type,
          location: this.DEFAULT_LOCATION,
          confirmation_sent: false
        };

        console.log('✅ Appointment booked and persisted:', bookingId);

        return booking;
      } catch (error) {
        // Rollback on error
        await this.dbAdapter.rollback();
        throw error;
      }
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      throw error;
    }
  }

  /**
   * Update appointment confirmation status
   */
  async markConfirmationSent(
    appointmentId: string,
    confirmationSid: string
  ): Promise<void> {
    console.log(`📧 Marking confirmation sent for appointment ${appointmentId}`);

    try {
      await this.dbAdapter.updateAppointment(appointmentId, {
        confirmation_sent: true,
        confirmation_method: 'sms',
        confirmation_sid: confirmationSid
      });

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'appointments',
        record_id: appointmentId,
        operation: 'UPDATE',
        field_name: 'confirmation_sent',
        old_value: false,
        new_value: true,
        changed_by: 'system',
        change_reason: 'SMS confirmation sent'
      });

      console.log('✅ Confirmation marked as sent');
    } catch (error) {
      console.error('❌ Error marking confirmation sent:', error);
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string
  ): Promise<void> {
    console.log(`❌ Cancelling appointment ${appointmentId}: ${reason}`);

    try {
      await this.dbAdapter.updateAppointment(appointmentId, {
        status: 'cancelled',
        cancellation_reason: reason
      });

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'appointments',
        record_id: appointmentId,
        operation: 'UPDATE',
        field_name: 'status',
        old_value: 'confirmed',
        new_value: 'cancelled',
        changed_by: 'system',
        change_reason: reason
      });

      console.log('✅ Appointment cancelled');
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Get appointments for a patient
   */
  async getPatientAppointments(patientId: string) {
    console.log(`📋 Getting appointments for patient ${patientId}`);

    try {
      const appointments = await this.dbAdapter.listAppointments({
        patient_id: patientId
      });

      console.log(`✅ Found ${appointments.length} appointments`);
      return appointments;
    } catch (error) {
      console.error('❌ Error getting patient appointments:', error);
      throw error;
    }
  }

  /**
   * Reschedule an existing appointment to a new time
   */
  async rescheduleAppointment(args: {
    booking_id: string;
    new_appointment_time: string;
    reason?: string;
  }): Promise<{
    success: boolean;
    booking_id: string;
    old_time: string;
    new_time: string;
    message: string;
  }> {
    console.log('🔄 Rescheduling appointment:', args);

    try {
      // Get existing appointment
      const appointments = await this.dbAdapter.listAppointments({
        booking_id: args.booking_id
      });

      if (appointments.length === 0) {
        throw new Error(`Appointment ${args.booking_id} not found`);
      }

      const appointment = appointments[0];
      const oldTime = appointment.appointment_time;

      // Update appointment time
      await this.dbAdapter.updateAppointment(args.booking_id, {
        appointment_time: args.new_appointment_time,
        rescheduled: true,
        reschedule_reason: args.reason || 'Patient request'
      });

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'appointments',
        record_id: args.booking_id,
        operation: 'UPDATE',
        field_name: 'appointment_time',
        old_value: oldTime,
        new_value: args.new_appointment_time,
        changed_by: 'ai_agent',
        change_reason: args.reason || 'Appointment rescheduled'
      });

      console.log('✅ Appointment rescheduled successfully');

      return {
        success: true,
        booking_id: args.booking_id,
        old_time: oldTime,
        new_time: args.new_appointment_time,
        message: 'Appointment successfully rescheduled'
      };
    } catch (error) {
      console.error('❌ Error rescheduling appointment:', error);
      throw error;
    }
  }

  /**
   * Get appointment history for a patient
   */
  async getAppointmentHistory(patientId: string): Promise<Array<{
    booking_id: string;
    appointment_time: string;
    appointment_type: string;
    status: string;
    location: string;
    child_names: string[];
  }>> {
    console.log(`📜 Getting appointment history for patient ${patientId}`);

    try {
      const appointments = await this.dbAdapter.listAppointments({
        patient_id: patientId
      });

      // Sort by appointment time, most recent first
      const sorted = appointments.sort((a, b) =>
        new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime()
      );

      // Get children for each appointment
      const history = await Promise.all(
        sorted.map(async (apt) => {
          const children = await this.dbAdapter.getChildrenByPatient(patientId);
          const childNames = children
            .filter(c => {
              // In a real implementation, we'd check appointment_children table
              // For now, return all children
              return true;
            })
            .map(c => c.name);

          return {
            booking_id: apt.booking_id,
            appointment_time: apt.appointment_time,
            appointment_type: apt.appointment_type,
            status: apt.status,
            location: apt.location,
            child_names: childNames
          };
        })
      );

      console.log(`✅ Found ${history.length} appointments in history`);
      return history;
    } catch (error) {
      console.error('❌ Error getting appointment history:', error);
      throw error;
    }
  }

  /**
   * Add notes to an existing appointment
   */
  async addAppointmentNotes(args: {
    booking_id: string;
    notes: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log(`📝 Adding notes to appointment ${args.booking_id}`);

    try {
      await this.dbAdapter.updateAppointment(args.booking_id, {
        notes: args.notes
      });

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'appointments',
        record_id: args.booking_id,
        operation: 'UPDATE',
        field_name: 'notes',
        new_value: args.notes,
        changed_by: 'ai_agent',
        change_reason: 'Appointment notes added'
      });

      console.log('✅ Notes added to appointment');

      return {
        success: true,
        message: 'Notes successfully added to appointment'
      };
    } catch (error) {
      console.error('❌ Error adding appointment notes:', error);
      throw error;
    }
  }

  /**
   * Generate time slots for a given date and time range
   */
  private generateTimeSlots(date: string, timeRange: string): Array<{ time: string; datetime: string }> {
    const slots: Array<{ time: string; datetime: string }> = [];
    const baseDate = new Date(date);

    if (timeRange === 'morning') {
      slots.push({
        time: '9:00 AM',
        datetime: new Date(baseDate.setHours(9, 0, 0, 0)).toISOString()
      });
      slots.push({
        time: '10:30 AM',
        datetime: new Date(baseDate.setHours(10, 30, 0, 0)).toISOString()
      });
      slots.push({
        time: '11:15 AM',
        datetime: new Date(baseDate.setHours(11, 15, 0, 0)).toISOString()
      });
    } else if (timeRange === 'afternoon') {
      slots.push({
        time: '1:00 PM',
        datetime: new Date(baseDate.setHours(13, 0, 0, 0)).toISOString()
      });
      slots.push({
        time: '2:00 PM',
        datetime: new Date(baseDate.setHours(14, 0, 0, 0)).toISOString()
      });
      slots.push({
        time: '3:15 PM',
        datetime: new Date(baseDate.setHours(15, 15, 0, 0)).toISOString()
      });
      slots.push({
        time: '4:30 PM',
        datetime: new Date(baseDate.setHours(16, 30, 0, 0)).toISOString()
      });
    } else if (timeRange === 'evening') {
      slots.push({
        time: '5:30 PM',
        datetime: new Date(baseDate.setHours(17, 30, 0, 0)).toISOString()
      });
      slots.push({
        time: '6:45 PM',
        datetime: new Date(baseDate.setHours(18, 45, 0, 0)).toISOString()
      });
    }

    return slots;
  }
}
