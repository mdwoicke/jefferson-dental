/**
 * BaseSkill - Abstract base class for all skills
 *
 * Provides:
 * - Auto-logging to skill_execution_logs via invokeTool()
 * - Tool registry integration
 * - Step tracking for multi-step workflows
 */

import type { DatabaseAdapter } from '../database/db-interface';
import type { ToolRegistry } from '../lib/tool-registry';

export interface SkillMetadata {
  name: string;
  version: string;
  category: string;
  description?: string;
  requiredTools: string[];
  verificationMessage?: string; // Test message to verify .md file is loaded
}

export interface SkillContext {
  conversationId: string;
  patientId?: string;
  phoneNumber?: string;
}

export interface SkillStepResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs?: number;
}

/**
 * Abstract base class for all skills
 * Handles logging and tool invocation automatically
 */
export abstract class BaseSkill {
  protected metadata: SkillMetadata;
  protected dbAdapter: DatabaseAdapter;
  protected toolRegistry: ToolRegistry;
  protected context: SkillContext;
  private currentStep: number = 0;

  constructor(
    metadata: SkillMetadata,
    dbAdapter: DatabaseAdapter,
    toolRegistry: ToolRegistry,
    context: SkillContext
  ) {
    this.metadata = metadata;
    this.dbAdapter = dbAdapter;
    this.toolRegistry = toolRegistry;
    this.context = context;
  }

  /**
   * Main execution method - must be implemented by each skill
   */
  abstract execute(args: any): Promise<any>;

  /**
   * Invoke a tool with auto-logging to skill_execution_logs
   */
  protected async invokeTool(
    stepName: string,
    toolName: string,
    args: any
  ): Promise<SkillStepResult> {
    this.currentStep++;
    const startTime = Date.now();
    const stepNumber = this.currentStep;

    console.log(`🔧 [${this.metadata.name}] Step ${stepNumber}: ${stepName} (tool: ${toolName})`);

    try {
      // Execute the tool via registry
      const result = await this.toolRegistry.execute(toolName, args);
      const executionTimeMs = Date.now() - startTime;

      console.log(`✅ [${this.metadata.name}] Step ${stepNumber} completed in ${executionTimeMs}ms`);

      // Log to skill_execution_logs
      await this.logStep({
        stepNumber,
        stepName,
        toolUsed: toolName,
        inputArgs: JSON.stringify(args),
        outputResult: JSON.stringify(result),
        executionStatus: 'success',
        executionTimeMs
      });

      return {
        success: true,
        result,
        executionTimeMs
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      console.error(`❌ [${this.metadata.name}] Step ${stepNumber} failed:`, error.message);

      // Log failure to skill_execution_logs
      await this.logStep({
        stepNumber,
        stepName,
        toolUsed: toolName,
        inputArgs: JSON.stringify(args),
        executionStatus: 'failure',
        executionTimeMs,
        errorMessage: error.message
      });

      return {
        success: false,
        error: error.message,
        executionTimeMs
      };
    }
  }

  /**
   * Log a skill execution step to the database
   */
  private async logStep(stepData: {
    stepNumber: number;
    stepName: string;
    toolUsed: string;
    inputArgs: string;
    outputResult?: string;
    executionStatus: 'success' | 'failure' | 'skipped';
    executionTimeMs: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.dbAdapter.createSkillExecutionLog({
        conversationId: this.context.conversationId,
        skillName: this.metadata.name,
        stepNumber: stepData.stepNumber,
        stepName: stepData.stepName,
        toolUsed: stepData.toolUsed,
        inputArgs: stepData.inputArgs,
        outputResult: stepData.outputResult,
        executionStatus: stepData.executionStatus,
        executionTimeMs: stepData.executionTimeMs,
        errorMessage: stepData.errorMessage
      });
    } catch (error) {
      console.error('Failed to log skill step:', error);
      // Don't throw - logging failure shouldn't break execution
    }
  }

  /**
   * Reset step counter (useful for testing or re-execution)
   */
  protected resetSteps(): void {
    this.currentStep = 0;
  }

  /**
   * Get skill metadata
   */
  getMetadata(): SkillMetadata {
    return { ...this.metadata };
  }

  /**
   * Get current step number
   */
  getCurrentStep(): number {
    return this.currentStep;
  }
}
