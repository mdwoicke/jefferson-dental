import { BaseTool } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class CancelAppointmentTool extends BaseTool {
  // Definition is now loaded from cancel-appointment.tool.md
  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    booking_id: string;
    reason: string;
  }): Promise<any> {
    console.log('❌ Cancelling appointment:', args);
    await this.appointmentService.cancelAppointment(args.booking_id, args.reason);
    return { success: true, message: 'Appointment cancelled successfully' };
  }
}
