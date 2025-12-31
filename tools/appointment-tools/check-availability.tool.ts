import { BaseTool } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class CheckAvailabilityTool extends BaseTool {
  // Definition is now loaded from check-availability.tool.md
  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    date: string;
    time_range: string;
    num_children: number;
  }): Promise<any> {
    console.log('📅 Checking availability:', args);
    return await this.appointmentService.checkAvailability(args);
  }
}
