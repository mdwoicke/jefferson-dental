import { BaseTool } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class AddAppointmentNotesTool extends BaseTool {
  // Definition is now loaded from add-appointment-notes.tool.md
  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    booking_id: string;
    notes: string;
  }): Promise<any> {
    console.log('📝 Adding appointment notes:', args);
    return await this.appointmentService.addAppointmentNotes(args);
  }
}
