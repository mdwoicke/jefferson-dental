/**
 * MarkdownParser - Parser for .skill.md files
 *
 * Provides:
 * - parseSkillMarkdown(path) - Read and parse .skill.md files
 * - Extracts metadata section (name, version, category, required tools)
 * - Returns { metadata: SkillMetadata }
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SkillMetadata } from '../skills/skill-base';

export interface ParsedSkill {
  metadata: SkillMetadata;
  content: string; // Full markdown content
}

/**
 * Parse a .skill.md file and extract metadata
 */
export class MarkdownParser {
  /**
   * Parse a skill markdown file
   * @param filePath Absolute path to the .skill.md file
   * @returns Parsed skill with metadata and content
   */
  static parseSkillMarkdown(filePath: string): ParsedSkill {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Skill file not found: ${filePath}`);
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract metadata section
    const metadata = this.extractMetadata(content);

    return {
      metadata,
      content
    };
  }

  /**
   * Extract metadata from markdown frontmatter or structured sections
   */
  private static extractMetadata(content: string): SkillMetadata {
    const metadata: Partial<SkillMetadata> = {
      requiredTools: []
    };

    // Try to extract YAML frontmatter first (between --- markers)
    // Allow content (like title) before the frontmatter
    const frontmatterMatch = content.match(/---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      metadata.name = this.extractYamlValue(frontmatter, 'name');
      metadata.version = this.extractYamlValue(frontmatter, 'version');
      metadata.category = this.extractYamlValue(frontmatter, 'category');
      metadata.description = this.extractYamlValue(frontmatter, 'description');
      metadata.verificationMessage = this.extractYamlValue(frontmatter, 'verification_message');

      // Extract required_tools array
      const toolsMatch = frontmatter.match(/required_tools:\s*\[(.*?)\]/s);
      if (toolsMatch) {
        metadata.requiredTools = toolsMatch[1]
          .split(',')
          .map(t => t.trim().replace(/['"]/g, ''))
          .filter(t => t.length > 0);
      }
    } else {
      // Fallback: Extract from markdown headers
      metadata.name = this.extractHeaderValue(content, 'Name') ||
                      this.extractHeaderValue(content, 'Skill Name') ||
                      'unknown';
      metadata.version = this.extractHeaderValue(content, 'Version') || '1.0.0';
      metadata.category = this.extractHeaderValue(content, 'Category') || 'general';
      metadata.description = this.extractHeaderValue(content, 'Description');

      // Extract required tools from a list
      const toolsSection = this.extractSection(content, 'Required Tools');
      if (toolsSection) {
        metadata.requiredTools = this.extractListItems(toolsSection);
      }
    }

    // Validate required fields
    if (!metadata.name || !metadata.version || !metadata.category) {
      throw new Error(
        `Invalid skill metadata. Required: name, version, category. ` +
        `Found: ${JSON.stringify(metadata)}`
      );
    }

    return metadata as SkillMetadata;
  }

  /**
   * Extract a YAML value from frontmatter
   */
  private static extractYamlValue(yaml: string, key: string): string | undefined {
    const match = yaml.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim().replace(/['"]/g, '') : undefined;
  }

  /**
   * Extract value from markdown header pattern: ## Key: Value
   */
  private static extractHeaderValue(content: string, key: string): string | undefined {
    const patterns = [
      new RegExp(`^#{1,6}\\s*${key}\\s*:\\s*(.+)`, 'im'),
      new RegExp(`^\\*\\*${key}\\*\\*:\\s*(.+)`, 'im'),
      new RegExp(`^${key}:\\s*(.+)`, 'im')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract a section by header
   */
  private static extractSection(content: string, headerText: string): string | undefined {
    const pattern = new RegExp(
      `^#{1,6}\\s*${headerText}\\s*\\n([\\s\\S]*?)(?=\\n#{1,6}|$)`,
      'im'
    );
    const match = content.match(pattern);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract list items from markdown
   */
  private static extractListItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Match markdown list items (-, *, +)
      const match = line.match(/^[\s]*[-*+]\s+(.+)/);
      if (match) {
        items.push(match[1].trim());
      }
    }

    return items;
  }

  /**
   * Parse multiple skill files from a directory
   */
  static parseSkillDirectory(directoryPath: string): ParsedSkill[] {
    const skills: ParsedSkill[] = [];

    if (!fs.existsSync(directoryPath)) {
      console.warn(`⚠️  Skill directory not found: ${directoryPath}`);
      return skills;
    }

    // Recursively find all .skill.md files
    const skillFiles = this.findSkillFiles(directoryPath);

    for (const filePath of skillFiles) {
      try {
        const skill = this.parseSkillMarkdown(filePath);
        skills.push(skill);
        console.log(`✅ Parsed skill: ${skill.metadata.name} v${skill.metadata.version}`);
      } catch (error: any) {
        console.error(`❌ Failed to parse ${filePath}:`, error.message);
      }
    }

    return skills;
  }

  /**
   * Recursively find all .skill.md files in a directory
   */
  private static findSkillFiles(dir: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.findSkillFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.skill.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get skill name from file path (without parsing)
   */
  static getSkillNameFromPath(filePath: string): string {
    const basename = path.basename(filePath, '.skill.md');
    return basename.replace(/-/g, '_');
  }
}
