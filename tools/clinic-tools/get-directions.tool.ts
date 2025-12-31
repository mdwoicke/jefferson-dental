import { BaseTool } from '../tool-base';
import { ClinicService } from '../../services/clinic-service';

export default class GetDirectionsTool extends BaseTool {
  // Definition is now loaded from get-directions.tool.md
  private clinicService: ClinicService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.clinicService = new ClinicService();
  }

  async execute(args: {
    from_address?: string;
  }): Promise<any> {
    console.log('🗺️  Getting directions:', args);
    return await this.clinicService.getDirections(args);
  }
}
