import { BaseTool } from '../tool-base';
import { ClinicService } from '../../services/clinic-service';

export default class GetAppointmentPreparationTool extends BaseTool {
  // Definition is now loaded from get-appointment-preparation.tool.md
  private clinicService: ClinicService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.clinicService = new ClinicService();
  }

  async execute(args: any): Promise<any> {
    console.log('📋 Getting appointment preparation info');
    return await this.clinicService.getAppointmentPreparation();
  }
}
