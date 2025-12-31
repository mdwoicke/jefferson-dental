import { DatabaseAdapter } from '../database/db-interface';
import { MarkdownParser } from '../lib/markdown-parser';
import * as path from 'path';

export interface ToolMetadata {
  name: string;
  description: string;
  version: string;
  category: 'appointment' | 'patient' | 'notification' | 'clinic' | 'external';
  requiresAuth?: boolean;
  requiresPatientContext?: boolean;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: any[];
  items?: { type: string; description?: string }; // For array types
  schema?: any;
}

export interface ToolDefinition {
  metadata: ToolMetadata;
  parameters: ToolParameter[];
  returns: {
    type: string;
    description: string;
    schema?: any;
  };
}

export abstract class BaseTool {
  private _definition?: ToolDefinition;

  /**
   * Get the tool definition. If not set, attempts to load from .md file.
   */
  get definition(): ToolDefinition {
    if (!this._definition) {
      this._definition = this.loadDefinitionFromMarkdown();
    }
    return this._definition;
  }

  /**
   * Set the tool definition manually (for backward compatibility or programmatic definition)
   */
  set definition(value: ToolDefinition) {
    this._definition = value;
  }

  constructor(
    protected dbAdapter: DatabaseAdapter,
    protected context?: any
  ) {}

  abstract execute(args: any): Promise<any>;

  /**
   * Load tool definition from markdown file.
   * Looks for a .tool.md file with the same base name as the class file.
   */
  private loadDefinitionFromMarkdown(): ToolDefinition {
    try {
      // Get the constructor function's file path via stack trace hack
      const mdPath = this.getMarkdownFilePath();

      if (!mdPath) {
        throw new Error(`Could not find markdown file for tool ${this.constructor.name}`);
      }

      return MarkdownParser.parseToolMarkdown(mdPath);
    } catch (error: any) {
      throw new Error(`Failed to load tool definition from markdown for ${this.constructor.name}: ${error.message}`);
    }
  }

  /**
   * Get the markdown file path for this tool.
   * This method attempts to find the .tool.md file in the same directory as the tool class.
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
      // Look for lines that reference .tool.ts files
      const match = line.match(/\((.*\.tool\.ts):\d+:\d+\)/);
      if (match) {
        const tsPath = match[1];
        const mdPath = tsPath.replace('.tool.ts', '.tool.md');
        return mdPath;
      }
    }

    return null;
  }

  // Validate arguments against parameter definitions
  validate(args: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    for (const param of this.definition.parameters) {
      if (param.required && !(param.name in args)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      if (args[param.name] !== undefined) {
        const actualType = typeof args[param.name];
        if (actualType !== param.type) {
          errors.push(`Parameter ${param.name} must be ${param.type}, got ${actualType}`);
        }

        if (param.enum && !param.enum.includes(args[param.name])) {
          errors.push(`Parameter ${param.name} must be one of: ${param.enum.join(', ')}`);
        }
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  // Convert to OpenAI function schema
  toOpenAISchema(): any {
    return {
      type: 'function',
      name: this.definition.metadata.name,
      description: this.definition.metadata.description,
      parameters: {
        type: 'object',
        properties: this.definition.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum && { enum: param.enum }),
            ...(param.type === 'array' && param.items && { items: param.items })
          };
          return acc;
        }, {} as any),
        required: this.definition.parameters.filter(p => p.required).map(p => p.name)
      }
    };
  }

  // Convert to MCP tool schema
  toMCPSchema(): any {
    return {
      name: this.definition.metadata.name,
      description: this.definition.metadata.description,
      inputSchema: {
        type: 'object',
        properties: this.definition.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description
          };
          return acc;
        }, {} as any),
        required: this.definition.parameters.filter(p => p.required).map(p => p.name)
      }
    };
  }
}
