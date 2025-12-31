import { MarkdownParser } from '../lib/markdown-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('MarkdownParser', () => {
  describe('Tool Markdown Parsing', () => {
    test('should parse a complete tool markdown file', () => {
      const toolMd = path.join(__dirname, '../tools/appointment-tools/book-appointment.tool.md');
      const definition = MarkdownParser.parseToolMarkdown(toolMd);

      expect(definition).toBeDefined();
      expect(definition.metadata.name).toBe('book_appointment');
      expect(definition.metadata.version).toBe('1.0.0');
      expect(definition.metadata.category).toBe('appointment');
      expect(definition.metadata.requiresPatientContext).toBe(true);
      expect(definition.parameters).toHaveLength(3);
      expect(definition.returns.type).toBe('object');
    });

    test('should parse tool parameters correctly', () => {
      const toolMd = path.join(__dirname, '../tools/appointment-tools/check-availability.tool.md');
      const definition = MarkdownParser.parseToolMarkdown(toolMd);

      expect(definition.parameters).toHaveLength(3);

      const dateParam = definition.parameters.find(p => p.name === 'date');
      expect(dateParam).toBeDefined();
      expect(dateParam?.type).toBe('string');
      expect(dateParam?.required).toBe(true);
      expect(dateParam?.description).toContain('YYYY-MM-DD');

      const timeRangeParam = definition.parameters.find(p => p.name === 'time_range');
      expect(timeRangeParam?.enum).toEqual(['morning', 'afternoon', 'evening']);
    });

    test('should parse array parameters with items', () => {
      const toolMd = path.join(__dirname, '../tools/appointment-tools/book-appointment.tool.md');
      const definition = MarkdownParser.parseToolMarkdown(toolMd);

      const childNamesParam = definition.parameters.find(p => p.name === 'child_names');
      expect(childNamesParam).toBeDefined();
      expect(childNamesParam?.type).toBe('array');
      expect(childNamesParam?.items).toBeDefined();
      expect(childNamesParam?.items?.type).toBe('string');
      expect(childNamesParam?.items?.description).toContain('Child name');
    });

    test('should parse tools with no parameters', () => {
      const toolMd = path.join(__dirname, '../tools/appointment-tools/get-appointment-history.tool.md');
      const definition = MarkdownParser.parseToolMarkdown(toolMd);

      expect(definition.parameters).toHaveLength(0);
      expect(definition.returns.type).toBe('array');
    });

    test('should parse optional parameters', () => {
      const toolMd = path.join(__dirname, '../tools/appointment-tools/reschedule-appointment.tool.md');
      const definition = MarkdownParser.parseToolMarkdown(toolMd);

      const reasonParam = definition.parameters.find(p => p.name === 'reason');
      expect(reasonParam).toBeDefined();
      expect(reasonParam?.required).toBe(false);
    });
  });

  describe('Skill Markdown Parsing', () => {
    test('should parse a complete skill markdown file', () => {
      const skillMd = path.join(__dirname, '../skills/scheduling/schedule-appointment.skill.md');
      const result = MarkdownParser.parseSkillMarkdown(skillMd);

      expect(result).toBeDefined();
      expect(result.metadata.name).toBe('schedule_appointment');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.category).toBe('scheduling');
      expect(result.metadata.requiredTools).toHaveLength(3);
      expect(result.metadata.requiredTools).toContain('check_availability');
      expect(result.metadata.requiredTools).toContain('book_appointment');
      expect(result.metadata.requiredTools).toContain('send_confirmation_sms');
    });

    test('should extract skill workflow description', () => {
      const skillMd = path.join(__dirname, '../skills/scheduling/schedule-appointment.skill.md');
      const result = MarkdownParser.parseSkillMarkdown(skillMd);

      expect(result.workflow).toBeDefined();
      expect(result.workflow).toContain('workflow');
      expect(result.workflow).toContain('Check Availability');
    });

    test('should parse skill description', () => {
      const skillMd = path.join(__dirname, '../skills/scheduling/schedule-appointment.skill.md');
      const result = MarkdownParser.parseSkillMarkdown(skillMd);

      expect(result.description).toBeDefined();
      expect(result.description).toContain('Complete workflow');
    });
  });

  describe('Content Parsing (without files)', () => {
    test('should parse tool markdown content directly', () => {
      const content = `# Test Tool

This is a test tool for testing.

## Metadata

- **Name**: test_tool
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: true

## Parameters

### test_param

- **Type**: string
- **Required**: true
- **Description**: A test parameter

## Returns

- **Type**: object
- **Description**: Test return value
`;

      const parsed = MarkdownParser.parseToolContent(content);

      expect(parsed.title).toBe('Test Tool');
      expect(parsed.description).toBe('This is a test tool for testing.');
      expect(parsed.metadata.name).toBe('test_tool');
      expect(parsed.metadata.requiresPatientContext).toBe(true);
      expect(parsed.parameters).toHaveLength(1);
      expect(parsed.parameters[0].name).toBe('test_param');
      expect(parsed.returns.type).toBe('object');
    });

    test('should parse skill markdown content directly', () => {
      const content = `# Test Skill

This is a test skill.

## Metadata

- **Name**: test_skill
- **Version**: 1.0.0
- **Category**: testing
- **Required Tools**: tool1, tool2

## Workflow

Step 1: Do something
Step 2: Do something else
`;

      const parsed = MarkdownParser.parseSkillContent(content);

      expect(parsed.title).toBe('Test Skill');
      expect(parsed.description).toBe('This is a test skill.');
      expect(parsed.metadata.name).toBe('test_skill');
      expect(parsed.metadata.requiredTools).toEqual(['tool1', 'tool2']);
      expect(parsed.workflow).toContain('Step 1');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for missing metadata section', () => {
      const content = `# Test Tool

This is a test tool.

## Parameters

### test_param

- **Type**: string
- **Required**: true
- **Description**: A test parameter

## Returns

- **Type**: object
- **Description**: Test return
`;

      expect(() => MarkdownParser.parseToolContent(content)).toThrow('missing Metadata section');
    });

    test('should throw error for missing required metadata fields', () => {
      const content = `# Test Tool

This is a test tool.

## Metadata

- **Name**: test_tool

## Parameters

## Returns

- **Type**: object
- **Description**: Test return
`;

      expect(() => MarkdownParser.parseToolContent(content)).toThrow('missing required fields');
    });

    test('should throw error for missing Returns section', () => {
      const content = `# Test Tool

This is a test tool.

## Metadata

- **Name**: test_tool
- **Version**: 1.0.0
- **Category**: appointment

## Parameters
`;

      expect(() => MarkdownParser.parseToolContent(content)).toThrow('missing Returns section');
    });

    test('should throw error for parameter missing required fields', () => {
      const content = `# Test Tool

This is a test tool.

## Metadata

- **Name**: test_tool
- **Version**: 1.0.0
- **Category**: appointment

## Parameters

### test_param

- **Type**: string
- **Description**: A test parameter

## Returns

- **Type**: object
- **Description**: Test return
`;

      expect(() => MarkdownParser.parseToolContent(content)).toThrow('missing required fields');
    });
  });

  describe('All Tool Markdown Files', () => {
    const toolDirs = [
      'appointment-tools',
      'patient-tools',
      'notification-tools',
      'clinic-tools'
    ];

    toolDirs.forEach(dir => {
      test(`should parse all ${dir} markdown files`, () => {
        const toolDir = path.join(__dirname, '../tools', dir);
        const files = fs.readdirSync(toolDir).filter(f => f.endsWith('.tool.md'));

        expect(files.length).toBeGreaterThan(0);

        files.forEach(file => {
          const filePath = path.join(toolDir, file);
          const definition = MarkdownParser.parseToolMarkdown(filePath);

          expect(definition).toBeDefined();
          expect(definition.metadata.name).toBeTruthy();
          expect(definition.metadata.version).toBeTruthy();
          expect(definition.metadata.category).toBeTruthy();
          expect(definition.returns).toBeDefined();
          expect(definition.returns.type).toBeTruthy();
        });
      });
    });
  });

  describe('All Skill Markdown Files', () => {
    test('should parse all skill markdown files', () => {
      const skillsDir = path.join(__dirname, '../skills');

      const findSkillFiles = (dir: string): string[] => {
        const files: string[] = [];
        const items = fs.readdirSync(dir);

        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !item.includes('node_modules')) {
            files.push(...findSkillFiles(fullPath));
          } else if (item.endsWith('.skill.md')) {
            files.push(fullPath);
          }
        });

        return files;
      };

      const skillFiles = findSkillFiles(skillsDir);
      expect(skillFiles.length).toBeGreaterThan(0);

      skillFiles.forEach(file => {
        const result = MarkdownParser.parseSkillMarkdown(file);

        expect(result).toBeDefined();
        expect(result.metadata.name).toBeTruthy();
        expect(result.metadata.version).toBeTruthy();
        expect(result.metadata.category).toBeTruthy();
        expect(result.metadata.requiredTools).toBeDefined();
        expect(result.metadata.requiredTools.length).toBeGreaterThan(0);
      });
    });
  });
});
