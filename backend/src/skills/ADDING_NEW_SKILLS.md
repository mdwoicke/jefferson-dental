# Adding New Skills - Quick Guide

This guide shows how to add a new skill to the system following the established pattern.

## Step-by-Step Process

### 1. Create the Skill Markdown File

Create a `.skill.md` file to document your skill:

**Example: `/src/skills/example/example-skill.skill.md`**
```markdown
# Example Skill

---
name: example_skill
version: 1.0.0
category: example
description: This is an example skill that demonstrates the pattern
required_tools: [tool_one, tool_two]
---

## Overview
Brief description of what this skill does.

## Workflow Steps
1. Step 1 - Do something
2. Step 2 - Do something else
3. Step 3 - Finish up

## Required Tools
- `tool_one` - Description
- `tool_two` - Description

## Input Parameters
```typescript
{
  param1: string;
  param2: number;
}
```

## Output
```typescript
{
  success: boolean;
  result?: any;
  error?: string;
}
```
```

### 2. Create the Skill Implementation

Create the TypeScript implementation:

**Example: `/src/skills/example/example-skill.ts`**
```typescript
import { BaseSkill, SkillMetadata, SkillContext } from '../skill-base';
import type { DatabaseAdapter } from '../../database/db-interface';
import type { ToolRegistry } from '../../lib/tool-registry';

export interface ExampleSkillArgs {
  param1: string;
  param2: number;
}

export interface ExampleSkillResult {
  success: boolean;
  result?: any;
  error?: string;
  steps_completed: number;
}

export class ExampleSkill extends BaseSkill {
  constructor(
    dbAdapter: DatabaseAdapter,
    toolRegistry: ToolRegistry,
    context: SkillContext
  ) {
    const metadata: SkillMetadata = {
      name: 'example_skill',
      version: '1.0.0',
      category: 'example',
      description: 'This is an example skill',
      requiredTools: ['tool_one', 'tool_two']
    };

    super(metadata, dbAdapter, toolRegistry, context);
  }

  async execute(args: ExampleSkillArgs): Promise<ExampleSkillResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 EXECUTING SKILL: ${this.metadata.name}`);
    console.log(`${'='.repeat(60)}`);

    this.resetSteps();

    const result: ExampleSkillResult = {
      success: false,
      steps_completed: 0
    };

    try {
      // Step 1: First tool
      const step1 = await this.invokeTool(
        'Execute first tool',
        'tool_one',
        { someParam: args.param1 }
      );

      result.steps_completed = 1;

      if (!step1.success) {
        result.error = `Step 1 failed: ${step1.error}`;
        return result;
      }

      // Step 2: Second tool
      const step2 = await this.invokeTool(
        'Execute second tool',
        'tool_two',
        { someParam: args.param2 }
      );

      result.steps_completed = 2;

      if (!step2.success) {
        result.error = `Step 2 failed: ${step2.error}`;
        return result;
      }

      // Success
      result.success = true;
      result.result = {
        step1Result: step1.result,
        step2Result: step2.result
      };

      console.log(`✅ SKILL COMPLETED SUCCESSFULLY: ${this.metadata.name}`);
      return result;

    } catch (error: any) {
      console.error(`❌ Skill execution failed:`, error);
      result.error = error.message;
      result.success = false;
      return result;
    }
  }
}
```

### 3. Export the Skill

Create or update the index file:

**Example: `/src/skills/example/index.ts`**
```typescript
export { ExampleSkill } from './example-skill';
```

Update the main skills index:

**Update: `/src/skills/index.ts`**
```typescript
export { BaseSkill } from './skill-base';
export type { SkillMetadata, SkillContext, SkillStepResult } from './skill-base';

// Scheduling skills
export { ScheduleAppointmentSkill } from './scheduling';

// Example skills
export { ExampleSkill } from './example';
```

### 4. Register Tools (if needed)

If your skill needs new tools, register them in the OpenAI client:

**Update: `/src/ai/openai-client.ts`**
```typescript
private registerTools(): void {
  // ... existing tools ...

  // Add new tools
  this.toolRegistry.register('tool_one',
    async (args) => this.handleToolOne(args),
    'Description of tool one'
  );

  this.toolRegistry.register('tool_two',
    async (args) => this.handleToolTwo(args),
    'Description of tool two'
  );

  this.toolRegistry.printStatus();
}

// Add handler methods
private async handleToolOne(args: any): Promise<any> {
  // Implementation
}

private async handleToolTwo(args: any): Promise<any> {
  // Implementation
}
```

### 5. Add Skill to OpenAI Tools

Add the skill to the OpenAI tools array:

**Update: `/src/ai/openai-client.ts` in `sendSessionUpdate()`**
```typescript
tools: [
  // ... existing tools ...
  {
    type: 'function',
    name: 'example_skill',
    description: 'This is an example skill that orchestrates multiple tools',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Description of param1'
        },
        param2: {
          type: 'number',
          description: 'Description of param2'
        }
      },
      required: ['param1', 'param2']
    }
  }
]
```

### 6. Add Skill Handler

Add the execution handler to the switch statement:

**Update: `/src/ai/openai-client.ts` in `executeFunctionCall()`**
```typescript
import { ExampleSkill } from '../skills/example';

// In executeFunctionCall():
switch (name) {
  // ... existing cases ...
  case 'example_skill':
    result = await this.handleExampleSkill(args);
    break;
}

// Add handler method
private async handleExampleSkill(args: ExampleSkillArgs): Promise<any> {
  console.log('🎯 SKILL CALLED: example_skill', args);

  if (!this.dbAdapter || !this.conversationId) {
    throw new Error('Database adapter or conversation ID not set');
  }

  const skillContext: SkillContext = {
    conversationId: this.conversationId,
    patientId: this.currentPatientId || undefined,
    phoneNumber: this.phoneNumber || undefined
  };

  const skill = new ExampleSkill(
    this.dbAdapter,
    this.toolRegistry,
    skillContext
  );

  const result = await skill.execute(args);
  console.log('✅ SKILL COMPLETED: example_skill', result);

  return result;
}
```

### 7. Update System Prompt (Optional)

If you want to guide the AI to use this skill, update the prompt:

**Update: `/src/utils/prompt-builder.ts`**
```typescript
// Add skill documentation to relevant prompts
**Available Skills:**
- schedule_appointment - Complete appointment scheduling workflow
- example_skill - Brief description of what it does
```

### 8. Compile and Test

```bash
# Compile TypeScript
npm run build

# Start the server
npm start

# Make a test call and trigger the skill
```

## Checklist

- [ ] Create `.skill.md` file with metadata
- [ ] Create skill implementation extending BaseSkill
- [ ] Export skill from module index
- [ ] Register any new tools in ToolRegistry
- [ ] Add skill to OpenAI tools array
- [ ] Add skill handler in executeFunctionCall()
- [ ] Update system prompt (optional)
- [ ] Compile TypeScript successfully
- [ ] Test the skill in a conversation

## Key Points

1. **Always extend BaseSkill** - It provides auto-logging via `invokeTool()`
2. **Use invokeTool() for each step** - Don't call tools directly
3. **Return structured results** - Include success, error, steps_completed
4. **Handle errors gracefully** - Don't throw unless critical
5. **Log progress** - Use console.log for debugging
6. **Reset steps** - Call `this.resetSteps()` at the start of execute()

## Benefits of Skills

- ✅ Auto-logging to skill_execution_logs
- ✅ Step tracking and metrics
- ✅ Error handling and recovery
- ✅ Reusable tool orchestration
- ✅ Consistent pattern across skills

## Example: Real-World Skill

See `/src/skills/scheduling/schedule-appointment-skill.ts` for a complete, production-ready example that orchestrates 3 tools across multiple steps with SMS confirmation.
