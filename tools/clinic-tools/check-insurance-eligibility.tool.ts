import { BaseTool } from '../tool-base';
import { ClinicService } from '../../services/clinic-service';

export default class CheckInsuranceEligibilityTool extends BaseTool {
  // Definition is now loaded from check-insurance-eligibility.tool.md
  private clinicService: ClinicService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.clinicService = new ClinicService();
  }

  async execute(args: {
    medicaid_id: string;
    child_name: string;
    date_of_birth?: string;
  }): Promise<any> {
    console.log('🏥 Checking insurance eligibility:', args);
    return await this.clinicService.checkInsuranceEligibility(args);
  }
}
