import { BaseTool } from '../tool-base';
import { NotificationService } from '../../services/notification-service';

export default class SendConfirmationSMSTool extends BaseTool {
  // Definition is now loaded from send-confirmation-sms.tool.md
  private notificationService: NotificationService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.notificationService = new NotificationService();
  }

  async execute(args: {
    phone_number: string;
    appointment_details: string;
  }): Promise<any> {
    console.log('📱 Sending confirmation SMS:', args);
    return await this.notificationService.sendConfirmationSMS(args);
  }
}
