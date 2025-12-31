import { BaseTool } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class GetAppointmentHistoryTool extends BaseTool {
  // Definition is now loaded from get-appointment-history.tool.md
  private appointmentService: AppointmentService;
  private currentPatientId: string | null = null;

  constructor(dbAdapter: any, context?: any) {
    super(dbAdapter, context);
    this.appointmentService = new AppointmentService(dbAdapter);
    if (context?.patientId) {
      this.currentPatientId = context.patientId;
    }
  }

  async execute(args: any): Promise<any> {
    console.log('📜 Getting appointment history');
    if (!this.currentPatientId && !this.context?.patientId) {
      throw new Error('No patient context set');
    }
    const patientId = this.currentPatientId || this.context?.patientId;
    return await this.appointmentService.getAppointmentHistory(patientId);
  }
}
