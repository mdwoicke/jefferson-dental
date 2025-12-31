import { BaseTool } from '../tool-base';
import { ClinicService } from '../../services/clinic-service';

export default class GetAvailableServicesTool extends BaseTool {
  // Definition is now loaded from get-available-services.tool.md
  private clinicService: ClinicService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.clinicService = new ClinicService();
  }

  async execute(args: any): Promise<any> {
    console.log('🦷 Getting available services');
    return await this.clinicService.getAvailableServices();
  }
}
