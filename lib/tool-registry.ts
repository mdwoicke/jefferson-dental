import { BaseTool } from '../tools/tool-base';
import { DatabaseAdapter } from '../database/db-interface';

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();
  private metadata: Map<string, any> = new Map();

  constructor(private dbAdapter: DatabaseAdapter) {}

  // Register a single tool
  register(tool: BaseTool): void {
    const name = tool.definition.metadata.name;
    this.tools.set(name, tool);
    this.metadata.set(name, tool.definition.metadata);
    console.log(`✅ Registered tool: ${name} (v${tool.definition.metadata.version})`);
  }

  // Auto-discover and register all tools from directory
  // Note: This method requires Node.js and won't work in browser environments
  async discoverTools(toolsDir: string): Promise<void> {
    // Browser check - skip discovery if running in browser
    if (typeof window !== 'undefined') {
      console.warn('⚠️  Tool auto-discovery not supported in browser environment');
      return;
    }

    try {
      // Dynamic import of glob (Node.js only)
      const { glob } = await import('glob');
      const toolFiles = glob.sync(`${toolsDir}/**/*.tool.ts`);
      console.log(`🔍 Discovering tools from ${toolsDir}...`);
      console.log(`   Found ${toolFiles.length} tool files`);

      for (const file of toolFiles) {
        try {
          const module = await import(file);
          if (module.default && typeof module.default === 'function') {
            const ToolClass = module.default;
            const instance = new ToolClass(this.dbAdapter);
            this.register(instance);
          }
        } catch (error) {
          console.error(`❌ Failed to load tool from ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to discover tools:', error);
      console.warn('⚠️  Auto-discovery requires Node.js environment');
    }
  }

  // Get tool by name
  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  // List all registered tools
  list(): any[] {
    return Array.from(this.metadata.values());
  }

  // Get tools by category
  getByCategory(category: string): BaseTool[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.definition.metadata.category === category);
  }

  // Execute a tool by name
  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate arguments
    const validation = tool.validate(args);
    if (!validation.valid) {
      throw new Error(`Invalid arguments for ${name}: ${validation.errors?.join(', ')}`);
    }

    // Execute and return result
    const startTime = Date.now();
    try {
      const result = await tool.execute(args);
      const executionTime = Date.now() - startTime;
      console.log(`✅ Tool ${name} executed in ${executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Tool ${name} failed after ${executionTime}ms:`, error);
      throw error;
    }
  }

  // Export all tools as OpenAI function schemas
  toOpenAISchemas(): any[] {
    return Array.from(this.tools.values()).map(tool => tool.toOpenAISchema());
  }

  // Export all tools as MCP schemas
  toMCPSchemas(): any[] {
    return Array.from(this.tools.values()).map(tool => tool.toMCPSchema());
  }
}
