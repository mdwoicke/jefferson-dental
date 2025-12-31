/**
 * ToolRegistry - Central registry for mapping tool names to execution functions
 *
 * Provides:
 * - register(name, fn) - Register a tool execution function
 * - get(name) - Get a tool execution function
 * - execute(name, args) - Execute a tool by name
 * - Integration with OpenAI function handlers
 */

export type ToolExecutionFunction = (args: any) => Promise<any>;

export interface ToolDefinition {
  name: string;
  description?: string;
  execute: ToolExecutionFunction;
}

/**
 * Registry for all available tools/functions
 * Used by skills to invoke tools and by OpenAI client to execute functions
 */
export class ToolRegistry {
  private tools: Map<string, ToolExecutionFunction> = new Map();
  private metadata: Map<string, { description?: string }> = new Map();

  /**
   * Register a tool execution function
   */
  register(name: string, executeFn: ToolExecutionFunction, description?: string): void {
    if (this.tools.has(name)) {
      console.warn(`⚠️  Tool '${name}' is already registered. Overwriting.`);
    }
    this.tools.set(name, executeFn);
    this.metadata.set(name, { description });
    console.log(`🔧 Registered tool: ${name}${description ? ` - ${description}` : ''}`);
  }

  /**
   * Register multiple tools at once
   */
  registerMultiple(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool.name, tool.execute, tool.description);
    }
  }

  /**
   * Get a tool execution function by name
   */
  get(name: string): ToolExecutionFunction | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name with args
   */
  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry. Available tools: ${this.getToolNames().join(', ')}`);
    }

    console.log(`🔧 Executing tool: ${name}`, args);
    const startTime = Date.now();

    try {
      const result = await tool(args);
      const executionTime = Date.now() - startTime;
      console.log(`✅ Tool '${name}' completed in ${executionTime}ms`);
      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Tool '${name}' failed after ${executionTime}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(name: string): { description?: string } | undefined {
    return this.metadata.get(name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.metadata.delete(name);
      console.log(`🗑️  Unregistered tool: ${name}`);
    }
    return deleted;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.metadata.clear();
    console.log('🗑️  Cleared all tools from registry');
  }

  /**
   * Get summary of registered tools
   */
  getSummary(): string {
    const count = this.tools.size;
    const names = this.getToolNames().join(', ');
    return `ToolRegistry: ${count} tool(s) registered [${names}]`;
  }

  /**
   * Print registry status (for debugging)
   */
  printStatus(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 TOOL REGISTRY STATUS');
    console.log('='.repeat(60));
    console.log(`Total tools: ${this.tools.size}`);
    console.log('\nRegistered tools:');
    for (const name of this.tools.keys()) {
      const meta = this.metadata.get(name);
      console.log(`  - ${name}${meta?.description ? ': ' + meta.description : ''}`);
    }
    console.log('='.repeat(60) + '\n');
  }
}
