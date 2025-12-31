import { BaseTool } from '../tool-base';
import { ClinicService } from '../../services/clinic-service';

export default class GetClinicHoursTool extends BaseTool {
  // Definition is now loaded from get-clinic-hours.tool.md
  private clinicService: ClinicService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.clinicService = new ClinicService();
  }

  async execute(args: {
    date?: string;
  }): Promise<any> {
    console.log('🕐 Getting clinic hours:', args);
    return await this.clinicService.getClinicHours(args);
  }
}
