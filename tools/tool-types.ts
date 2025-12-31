/**
 * Type definitions for the dynamic tool system
 */

import { ToolMetadata, ToolParameter, ToolDefinition } from './tool-base';

// Re-export types from tool-base for convenience
export type { ToolMetadata, ToolParameter, ToolDefinition };

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs?: number;
}

/**
 * Tool validation result
 */
export interface ToolValidationResult {
  valid: boolean;
  errors?: string[];
}
