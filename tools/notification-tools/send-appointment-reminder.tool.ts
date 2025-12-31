import { BaseTool } from '../tool-base';
import { NotificationService } from '../../services/notification-service';

export default class SendAppointmentReminderTool extends BaseTool {
  // Definition is now loaded from send-appointment-reminder.tool.md
  private notificationService: NotificationService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.notificationService = new NotificationService();
  }

  async execute(args: {
    phone_number: string;
    patient_name: string;
    child_name: string;
    appointment_time: string;
    location: string;
  }): Promise<any> {
    console.log('⏰ Sending appointment reminder:', args);
    return await this.notificationService.sendAppointmentReminder(args);
  }
}
