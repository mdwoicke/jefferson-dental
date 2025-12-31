import { BaseSkill, SkillContext } from '../skills/skill-base';
import { ToolRegistry } from './tool-registry';
import { DatabaseAdapter } from '../database/db-interface';

// Type for a concrete skill constructor
type SkillConstructor = new (
  toolRegistry: ToolRegistry,
  dbAdapter: DatabaseAdapter,
  context?: SkillContext
) => BaseSkill;

export class SkillEngine {
  private skills: Map<string, SkillConstructor> = new Map();
  private instances: Map<string, BaseSkill> = new Map();

  constructor(
    private toolRegistry: ToolRegistry,
    private dbAdapter: DatabaseAdapter
  ) {}

  // Register a skill class
  register(SkillClass: SkillConstructor): void {
    const tempInstance = new SkillClass(this.toolRegistry, this.dbAdapter);
    const name = tempInstance.metadata.name;
    this.skills.set(name, SkillClass);
    console.log(`✅ Registered skill: ${name} (v${tempInstance.metadata.version})`);
  }

  // Auto-discover skills from directory
  // Note: This method requires Node.js and won't work in browser environments
  async discoverSkills(skillsDir: string): Promise<void> {
    // Browser check - skip discovery if running in browser
    if (typeof window !== 'undefined') {
      console.warn('⚠️  Skill auto-discovery not supported in browser environment');
      return;
    }

    try {
      // Dynamic import of glob (Node.js only)
      const { glob } = await import('glob');
      const skillFiles = glob.sync(`${skillsDir}/**/*-skill.ts`);
      console.log(`🔍 Discovering skills from ${skillsDir}...`);
      console.log(`   Found ${skillFiles.length} skill files`);

      for (const file of skillFiles) {
        try {
          const module = await import(file);
          if (module.default && typeof module.default === 'function') {
            this.register(module.default);
          }
        } catch (error) {
          console.error(`❌ Failed to load skill from ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to discover skills:', error);
      console.warn('⚠️  Auto-discovery requires Node.js environment');
    }
  }

  // Execute a skill with context
  async execute(name: string, input: any, context?: SkillContext): Promise<any> {
    const SkillClass = this.skills.get(name);
    if (!SkillClass) {
      throw new Error(`Skill not found: ${name}`);
    }

    // Create instance with context
    const skill = new SkillClass(this.toolRegistry, this.dbAdapter, context);

    // Validate dependencies
    const validation = skill.validateDependencies();
    if (!validation.valid) {
      throw new Error(`Skill ${name} missing required tools: ${validation.missing?.join(', ')}`);
    }

    // Execute
    console.log(`🎯 Executing skill: ${name}`);
    const startTime = Date.now();
    try {
      const result = await skill.execute(input);
      const executionTime = Date.now() - startTime;
      console.log(`✅ Skill ${name} completed in ${executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Skill ${name} failed after ${executionTime}ms:`, error);
      throw error;
    }
  }

  // List all registered skills
  list(): any[] {
    return Array.from(this.skills.keys()).map(name => {
      const SkillClass = this.skills.get(name)!;
      const instance = new SkillClass(this.toolRegistry, this.dbAdapter);
      return instance.metadata;
    });
  }
}
