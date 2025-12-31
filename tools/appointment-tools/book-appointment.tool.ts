import { BaseTool } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class BookAppointmentTool extends BaseTool {
  // Definition is now loaded from book-appointment.tool.md
  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    child_names: string[];
    appointment_time: string;
    appointment_type: string;
  }): Promise<any> {
    console.log('📝 Booking appointment:', args);
    return await this.appointmentService.bookAppointment(args);
  }
}
