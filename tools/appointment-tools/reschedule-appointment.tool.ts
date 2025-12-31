import { BaseTool } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class RescheduleAppointmentTool extends BaseTool {
  // Definition is now loaded from reschedule-appointment.tool.md
  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    booking_id: string;
    new_appointment_time: string;
    reason?: string;
  }): Promise<any> {
    console.log('🔄 Rescheduling appointment:', args);
    return await this.appointmentService.rescheduleAppointment(args);
  }
}
