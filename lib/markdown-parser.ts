import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolMetadata, ToolParameter } from '../tools/tool-base';
import { SkillMetadata } from '../skills/skill-base';

export interface ParsedToolMarkdown {
  title: string;
  description: string;
  metadata: ToolMetadata;
  parameters: ToolParameter[];
  returns: {
    type: string;
    description: string;
  };
}

export interface ParsedSkillMarkdown {
  title: string;
  description: string;
  metadata: SkillMetadata;
  workflow?: string;
}

export class MarkdownParser {
  /**
   * Parse a tool markdown file and return structured ToolDefinition
   */
  static parseToolMarkdown(filePath: string): ToolDefinition {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = this.parseToolContent(content);

    return {
      metadata: parsed.metadata,
      parameters: parsed.parameters,
      returns: parsed.returns
    };
  }

  /**
   * Parse tool markdown content (for testing or direct content parsing)
   */
  static parseToolContent(content: string): ParsedToolMarkdown {
    const lines = content.split('\n');

    // Extract title (first # heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract description (text between title and ## Metadata)
    const descMatch = content.match(/^#\s+.+\n\n(.+?)(?=\n##)/s);
    const description = descMatch ? descMatch[1].trim() : '';

    // Parse metadata section
    const metadata = this.parseToolMetadata(content);

    // Parse parameters section
    const parameters = this.parseParameters(content);

    // Parse returns section
    const returns = this.parseReturns(content);

    return {
      title,
      description,
      metadata,
      parameters,
      returns
    };
  }

  /**
   * Parse a skill markdown file and return structured SkillMetadata
   */
  static parseSkillMarkdown(filePath: string): { metadata: SkillMetadata; description: string; workflow?: string } {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseSkillContent(content);
  }

  /**
   * Parse skill markdown content (for testing or direct content parsing)
   */
  static parseSkillContent(content: string): ParsedSkillMarkdown {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = content.match(/^#\s+.+\n\n(.+?)(?=\n##)/s);
    const description = descMatch ? descMatch[1].trim() : '';

    const metadata = this.parseSkillMetadata(content);

    // Extract workflow section if present
    const workflowMatch = content.match(/##\s+Workflow\s*\n\n(.+?)(?=\n##|$)/s);
    const workflow = workflowMatch ? workflowMatch[1].trim() : undefined;

    return {
      title,
      description,
      metadata,
      workflow
    };
  }

  /**
   * Parse the metadata section of a tool markdown file
   */
  private static parseToolMetadata(content: string): ToolMetadata {
    const metadataMatch = content.match(/##\s+Metadata\s*\n\n(.+?)(?=\n##)/s);
    if (!metadataMatch) {
      throw new Error('Tool markdown missing Metadata section');
    }

    const metadataText = metadataMatch[1];

    const name = this.extractMetadataField(metadataText, 'Name');
    const description = this.extractMetadataField(metadataText, 'Description') || '';
    const version = this.extractMetadataField(metadataText, 'Version');
    const category = this.extractMetadataField(metadataText, 'Category') as any;
    const requiresAuth = this.extractBooleanField(metadataText, 'Requires Auth');
    const requiresPatientContext = this.extractBooleanField(metadataText, 'Requires Patient Context');

    if (!name || !version || !category) {
      throw new Error('Tool metadata missing required fields (Name, Version, or Category)');
    }

    return {
      name,
      description,
      version,
      category,
      ...(requiresAuth !== undefined && { requiresAuth }),
      ...(requiresPatientContext !== undefined && { requiresPatientContext })
    };
  }

  /**
   * Parse the metadata section of a skill markdown file
   */
  private static parseSkillMetadata(content: string): SkillMetadata {
    const metadataMatch = content.match(/##\s+Metadata\s*\n\n(.+?)(?=\n##)/s);
    if (!metadataMatch) {
      throw new Error('Skill markdown missing Metadata section');
    }

    const metadataText = metadataMatch[1];

    const name = this.extractMetadataField(metadataText, 'Name');
    const description = this.extractMetadataField(metadataText, 'Description') || '';
    const version = this.extractMetadataField(metadataText, 'Version');
    const category = this.extractMetadataField(metadataText, 'Category');
    const requiredToolsStr = this.extractMetadataField(metadataText, 'Required Tools');
    const requiredSkillsStr = this.extractMetadataField(metadataText, 'Required Skills');

    if (!name || !version || !category || !requiredToolsStr) {
      throw new Error('Skill metadata missing required fields');
    }

    const requiredTools = requiredToolsStr.split(',').map(t => t.trim());
    const requiredSkills = requiredSkillsStr ? requiredSkillsStr.split(',').map(s => s.trim()) : undefined;

    return {
      name,
      description,
      version,
      category,
      requiredTools,
      ...(requiredSkills && { requiredSkills })
    };
  }

  /**
   * Parse the Parameters section of a tool markdown file
   */
  private static parseParameters(content: string): ToolParameter[] {
    const parametersMatch = content.match(/##\s+Parameters\s*\n\n(.+?)(?=\n##)/s);
    if (!parametersMatch) {
      return [];
    }

    const parametersText = parametersMatch[1];
    const parameters: ToolParameter[] = [];

    // Split by ### to get individual parameters
    const paramSections = parametersText.split(/###\s+/).filter(s => s.trim());

    for (const section of paramSections) {
      const lines = section.split('\n');
      const paramName = lines[0].trim();

      const typeMatch = section.match(/\*\*Type\*\*:\s*(.+)/);
      const requiredMatch = section.match(/\*\*Required\*\*:\s*(true|false)/i);
      const descMatch = section.match(/\*\*Description\*\*:\s*(.+)/);
      const enumMatch = section.match(/\*\*Enum\*\*:\s*(.+)/);

      if (!typeMatch || !requiredMatch || !descMatch) {
        throw new Error(`Parameter ${paramName} missing required fields (Type, Required, or Description)`);
      }

      const type = typeMatch[1].trim() as any;
      const required = requiredMatch[1].toLowerCase() === 'true';
      const description = descMatch[1].trim();
      const enumValues = enumMatch ? enumMatch[1].split(',').map(v => v.trim()) : undefined;

      const param: ToolParameter = {
        name: paramName,
        type,
        description,
        required
      };

      if (enumValues) {
        param.enum = enumValues;
      }

      // Handle array items
      if (type === 'array') {
        const itemsTypeMatch = section.match(/\*\*Items\*\*:\s*\n\s*-\s*\*\*Type\*\*:\s*(.+)/);
        const itemsDescMatch = section.match(/\*\*Items\*\*:\s*\n\s*-\s*\*\*Type\*\*:.+\n\s*-\s*\*\*Description\*\*:\s*(.+)/);

        if (itemsTypeMatch) {
          param.items = {
            type: itemsTypeMatch[1].trim()
          };
          if (itemsDescMatch) {
            param.items.description = itemsDescMatch[1].trim();
          }
        }
      }

      parameters.push(param);
    }

    return parameters;
  }

  /**
   * Parse the Returns section of a tool markdown file
   */
  private static parseReturns(content: string): { type: string; description: string } {
    const returnsMatch = content.match(/##\s+Returns\s*\n\n(.+?)(?=\n##|$)/s);
    if (!returnsMatch) {
      throw new Error('Tool markdown missing Returns section');
    }

    const returnsText = returnsMatch[1];

    const typeMatch = returnsText.match(/\*\*Type\*\*:\s*(.+)/);
    const descMatch = returnsText.match(/\*\*Description\*\*:\s*(.+)/);

    if (!typeMatch || !descMatch) {
      throw new Error('Returns section missing Type or Description');
    }

    return {
      type: typeMatch[1].trim(),
      description: descMatch[1].trim()
    };
  }

  /**
   * Extract a metadata field value from markdown bullet points
   */
  private static extractMetadataField(text: string, fieldName: string): string | undefined {
    const regex = new RegExp(`-\\s*\\*\\*${fieldName}\\*\\*:\\s*(.+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract a boolean metadata field
   */
  private static extractBooleanField(text: string, fieldName: string): boolean | undefined {
    const value = this.extractMetadataField(text, fieldName);
    if (value === undefined) return undefined;
    return value.toLowerCase() === 'true';
  }

  /**
   * Find the .md file for a given .ts file
   * Looks for {basename}.tool.md or {basename}.skill.md in the same directory
   */
  static findMarkdownFile(tsFilePath: string, type: 'tool' | 'skill'): string | null {
    const dir = path.dirname(tsFilePath);
    const basename = path.basename(tsFilePath, '.ts');
    const mdPath = path.join(dir, `${basename}.md`);

    if (fs.existsSync(mdPath)) {
      return mdPath;
    }

    return null;
  }
}
