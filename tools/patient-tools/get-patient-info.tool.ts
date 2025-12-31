import { BaseTool } from '../tool-base';
import { CRMService } from '../../services/crm-service';

export default class GetPatientInfoTool extends BaseTool {
  // Definition is now loaded from get-patient-info.tool.md
  private crmService: CRMService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.crmService = new CRMService(dbAdapter);
  }

  async execute(args: {
    phone_number: string;
  }): Promise<any> {
    console.log('👤 Getting patient info:', args);
    return await this.crmService.getPatientInfo(args.phone_number);
  }
}
