# Tool and Skill Markdown Documentation System

## Overview

The Jefferson Dental project now uses **markdown files** to define tool and skill metadata instead of inline TypeScript definitions. This provides several benefits:

- **Separation of Concerns**: Logic (TS) is separated from documentation/metadata (MD)
- **Easier Maintenance**: Non-developers can update tool descriptions without touching code
- **Version Control**: Changes to tool metadata are easier to review in git diffs
- **Documentation**: The .md files serve as both machine-readable definitions and human-readable documentation

## How It Works

### Tools

Each tool (e.g., `book-appointment.tool.ts`) now has a corresponding markdown file (e.g., `book-appointment.tool.md`) in the same directory.

**Before** (inline definition):
```typescript
export default class BookAppointmentTool extends BaseTool {
  definition: ToolDefinition = {
    metadata: {
      name: 'book_appointment',
      description: 'Book a dental appointment...',
      version: '1.0.0',
      category: 'appointment',
      requiresPatientContext: true
    },
    parameters: [...],
    returns: {...}
  };
  // ... implementation
}
```

**After** (loaded from .md file):
```typescript
export default class BookAppointmentTool extends BaseTool {
  // Definition is now loaded from book-appointment.tool.md
  private appointmentService: AppointmentService;
  // ... implementation
}
```

The `BaseTool` class automatically loads the definition from the `.md` file using the `MarkdownParser` utility.

### Skills

Skills work the same way:

**Before**:
```typescript
export default class ScheduleAppointmentSkill extends BaseSkill {
  metadata: SkillMetadata = {
    name: 'schedule_appointment',
    description: '...',
    version: '1.0.0',
    category: 'scheduling',
    requiredTools: [...]
  };
  // ... implementation
}
```

**After**:
```typescript
export default class ScheduleAppointmentSkill extends BaseSkill {
  // Metadata is now loaded from schedule-appointment.skill.md
  // ... implementation
}
```

## File Structure

```
tools/
├── appointment-tools/
│   ├── book-appointment.tool.ts        # Tool implementation
│   ├── book-appointment.tool.md        # Tool definition (NEW)
│   ├── check-availability.tool.ts
│   ├── check-availability.tool.md      # (NEW)
│   └── ...
├── patient-tools/
│   ├── get-patient-info.tool.ts
│   ├── get-patient-info.tool.md        # (NEW)
│   └── ...
└── ...

skills/
└── scheduling/
    ├── schedule-appointment-skill.ts   # Skill implementation
    ├── schedule-appointment.skill.md   # Skill definition (NEW)
    └── ...
```

## Markdown Format

See [TOOL_SKILL_MD_FORMAT.md](./TOOL_SKILL_MD_FORMAT.md) for the complete markdown format specification.

### Tool Example

```markdown
# Book Appointment

Book a dental appointment for specified children. Only call after user confirms.

## Metadata

- **Name**: book_appointment
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: true

## Parameters

### child_names

- **Type**: array
- **Required**: true
- **Description**: Names of children to schedule
- **Items**:
  - **Type**: string
  - **Description**: Child name

### appointment_time

- **Type**: string
- **Required**: true
- **Description**: ISO 8601 datetime for appointment

## Returns

- **Type**: object
- **Description**: Booking confirmation with appointment details
```

### Skill Example

```markdown
# Schedule Appointment

Complete workflow for scheduling an appointment with availability check and confirmation.

## Metadata

- **Name**: schedule_appointment
- **Version**: 1.0.0
- **Category**: scheduling
- **Required Tools**: check_availability, book_appointment, send_confirmation_sms

## Workflow

This skill orchestrates a complete appointment scheduling workflow:

1. Check availability for the requested date and time range
2. Select the best available time slot
3. Book the appointment in the system
4. Send SMS confirmation to the patient's parent

## Returns

- **Type**: object (SkillResult)
- **Success**: boolean - True if appointment was scheduled successfully
- **Message**: string - Human-readable status message
- **Data**: object - Contains appointmentId, datetime, time, and childNames
```

## Verification

### Manual Verification

To verify that a tool or skill is correctly loading from its .md file, you can instantiate it and check the definition:

```typescript
import BookAppointmentTool from './tools/appointment-tools/book-appointment.tool';

const tool = new BookAppointmentTool(dbAdapter);
console.log(tool.definition);
// Should output the parsed definition from book-appointment.tool.md
```

### Automated Tests

Run the test suite to verify all tools and skills are correctly loading:

```bash
npm test tests/markdown-parser.test.ts
npm test tests/tool-skill-integration.test.ts
```

These tests verify:
- ✓ All .md files are parseable
- ✓ All required sections are present
- ✓ Tools and skills can be instantiated
- ✓ Definitions are correctly loaded
- ✓ OpenAI and MCP schema generation works
- ✓ Tool Registry integration works
- ✓ Skill Engine integration works

## Adding a New Tool

1. Create the `.tool.md` file with the tool definition (see format above)
2. Create the `.tool.ts` file with just the implementation:

```typescript
import { BaseTool } from '../tool-base';
import { ServiceName } from '../../services/service-name';

export default class MyNewTool extends BaseTool {
  // Definition is loaded from my-new-tool.tool.md
  private service: ServiceName;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.service = new ServiceName(dbAdapter);
  }

  async execute(args: {
    param1: string;
    param2: number;
  }): Promise<any> {
    // Implementation here
    return await this.service.doSomething(args);
  }
}
```

3. The tool will automatically load its definition from the .md file when instantiated

## Adding a New Skill

1. Create the `.skill.md` file with the skill metadata (see format above)
2. Create the `-skill.ts` file with just the implementation:

```typescript
import { BaseSkill, SkillResult } from '../skill-base';

export default class MyNewSkill extends BaseSkill {
  // Metadata is loaded from my-new-skill.md

  async execute(input: {
    param1: string;
    param2: number;
  }): Promise<SkillResult> {
    // Implementation here
    try {
      const result = await this.invokeTool('tool_name', { ... });
      return {
        success: true,
        message: 'Skill completed successfully',
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Skill failed',
        error: error.message
      };
    }
  }
}
```

3. The skill will automatically load its metadata from the .md file when instantiated

## Troubleshooting

### "Could not find markdown file for tool"

This error means the tool's .md file is missing or in the wrong location. Ensure:
- The .md file is in the same directory as the .ts file
- The .md file has the same base name (e.g., `book-appointment.tool.md` for `book-appointment.tool.ts`)

### "Failed to load tool definition from markdown"

This means the .md file exists but couldn't be parsed. Common causes:
- Missing required sections (Metadata, Parameters, Returns)
- Missing required fields within sections
- Invalid syntax (check the format specification)

Run the parser tests to get more detailed error messages:

```bash
npm test tests/markdown-parser.test.ts
```

### "Parameter missing required fields"

Each parameter must have all required fields:
- **Type**: The data type
- **Required**: true or false
- **Description**: A description of the parameter

## Benefits of This Approach

1. **Cleaner Code**: Tool/skill implementation files are now focused purely on logic
2. **Better Documentation**: The .md files serve as both definition and documentation
3. **Easier Review**: Git diffs of .md files are much more readable than TypeScript object literals
4. **Non-Developer Friendly**: Product managers and documentation writers can update tool descriptions
5. **Consistent Format**: The markdown parser enforces a consistent structure across all tools/skills
6. **Testability**: Easy to test that all definitions are valid and complete
7. **Schema Generation**: Automatically generates OpenAI and MCP schemas from the .md definitions
