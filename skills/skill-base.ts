import { ToolRegistry } from '../lib/tool-registry';
import { DatabaseAdapter } from '../database/db-interface';
import { MarkdownParser } from '../lib/markdown-parser';

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  category: string;
  requiredTools: string[];
  requiredSkills?: string[];
}

export interface SkillContext {
  conversationId?: string;
  patientId?: string;
  phoneNumber?: string;
  sessionData?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export abstract class BaseSkill {
  private _metadata?: SkillMetadata;

  /**
   * Get the skill metadata. If not set, attempts to load from .md file.
   */
  get metadata(): SkillMetadata {
    if (!this._metadata) {
      this._metadata = this.loadMetadataFromMarkdown();
    }
    return this._metadata;
  }

  /**
   * Set the skill metadata manually (for backward compatibility or programmatic definition)
   */
  set metadata(value: SkillMetadata) {
    this._metadata = value;
  }

  constructor(
    protected toolRegistry: ToolRegistry,
    protected dbAdapter: DatabaseAdapter,
    protected context: SkillContext = {}
  ) {}

  // Main execution method
  abstract execute(input: any): Promise<SkillResult>;

  /**
   * Load skill metadata from markdown file.
   * Looks for a .skill.md file with the same base name as the class file.
   */
  private loadMetadataFromMarkdown(): SkillMetadata {
    try {
      const mdPath = this.getMarkdownFilePath();

      if (!mdPath) {
        throw new Error(`Could not find markdown file for skill ${this.constructor.name}`);
      }

      const parsed = MarkdownParser.parseSkillMarkdown(mdPath);
      return parsed.metadata;
    } catch (error: any) {
      throw new Error(`Failed to load skill metadata from markdown for ${this.constructor.name}: ${error.message}`);
    }
  }

  /**
   * Get the markdown file path for this skill.
   * This method attempts to find the .skill.md file in the same directory as the skill class.
   */
  private getMarkdownFilePath(): string | null {
    // Use a stack trace to get the file path of the derived class
    const originalStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    const stack = new Error().stack;
    Error.stackTraceLimit = originalStackTraceLimit;

    if (!stack) return null;

    // Parse stack trace to find the file path
    const lines = stack.split('\n');
    for (const line of lines) {
      // Look for lines that reference -skill.ts files
      const match = line.match(/\((.*-skill\.ts):\d+:\d+\)/);
      if (match) {
        const tsPath = match[1];
        const mdPath = tsPath.replace('-skill.ts', '-skill.md');
        return mdPath;
      }
    }

    return null;
  }

  // Validate that all required tools are available
  validateDependencies(): { valid: boolean; missing?: string[] } {
    const missing: string[] = [];

    for (const toolName of this.metadata.requiredTools) {
      if (!this.toolRegistry.get(toolName)) {
        missing.push(toolName);
      }
    }

    return missing.length > 0 ? { valid: false, missing } : { valid: true };
  }

  // Helper to invoke a tool with automatic execution logging
  protected async invokeTool(name: string, args: any, stepName?: string): Promise<any> {
    console.log(`  🔧 Skill ${this.metadata.name} invoking tool: ${name}`);

    const stepStartTime = Date.now();
    const logStepName = stepName || `Invoke ${name}`;

    try {
      // Execute the tool
      const result = await this.toolRegistry.execute(name, args);

      // AUTO-LOG SUCCESSFUL SKILL EXECUTION
      if (this.context.conversationId) {
        try {
          await this.dbAdapter.createSkillExecutionLog({
            conversationId: this.context.conversationId,
            skillName: this.metadata.name,
            stepNumber: 1, // Could be enhanced to track actual step numbers
            stepName: logStepName,
            toolUsed: name,
            inputArgs: JSON.stringify(args),
            outputResult: JSON.stringify(result),
            executionStatus: 'success',
            executionTimeMs: Date.now() - stepStartTime
          });
          console.log(`  ✅ Logged skill execution: ${this.metadata.name} → ${name}`);
        } catch (logError) {
          console.error('  ⚠️  Failed to log skill execution (non-critical):', logError);
        }
      }

      return result;
    } catch (error: any) {
      // AUTO-LOG FAILED SKILL EXECUTION
      if (this.context.conversationId) {
        try {
          await this.dbAdapter.createSkillExecutionLog({
            conversationId: this.context.conversationId,
            skillName: this.metadata.name,
            stepNumber: 1,
            stepName: logStepName,
            toolUsed: name,
            inputArgs: JSON.stringify(args),
            executionStatus: 'failure',
            executionTimeMs: Date.now() - stepStartTime,
            errorMessage: error.message
          });
          console.log(`  ❌ Logged skill execution failure: ${this.metadata.name} → ${name}`);
        } catch (logError) {
          console.error('  ⚠️  Failed to log skill execution error (non-critical):', logError);
        }
      }

      throw error;
    }
  }

  // Update context during execution
  protected updateContext(updates: Partial<SkillContext>): void {
    this.context = { ...this.context, ...updates };
  }

  // Get context value
  protected getContext(key: keyof SkillContext): any {
    return this.context[key];
  }
}
