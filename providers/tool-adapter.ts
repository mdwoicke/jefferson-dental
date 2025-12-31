import { ToolRegistry } from '../lib/tool-registry';
import { SkillEngine } from '../lib/skill-engine';
import { VoiceProvider } from '../types';

export class ProviderToolAdapter {
  constructor(
    private toolRegistry: ToolRegistry,
    private skillEngine: SkillEngine
  ) {}

  // Get all tools and skills as provider-specific schemas
  getToolsForProvider(provider: VoiceProvider): any[] {
    const tools = this.toolRegistry.toOpenAISchemas();
    const skills = this.getSkillsAsTools();
    return [...tools, ...skills];
  }

  // Convert skills to tool schemas so AI can call them
  private getSkillsAsTools(): any[] {
    const skills = this.skillEngine.list();
    return skills.map(skill => ({
      type: 'function',
      name: skill.name,
      description: skill.description,
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            description: 'Skill input parameters'
          }
        },
        required: ['input']
      }
    }));
  }

  // Execute tool or skill
  async execute(name: string, args: any, context?: any): Promise<any> {
    // Try tool first
    const tool = this.toolRegistry.get(name);
    if (tool) {
      return await this.toolRegistry.execute(name, args);
    }

    // Try skill
    const skills = this.skillEngine.list();
    if (skills.find(s => s.name === name)) {
      return await this.skillEngine.execute(name, args.input || args, context);
    }

    throw new Error(`Tool or skill not found: ${name}`);
  }
}
