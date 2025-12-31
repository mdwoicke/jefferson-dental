# Adding New Skills to the Voice Agent - Step-by-Step Guide

## Overview

This guide provides detailed instructions for adding new **skills** to the Jefferson Dental voice agent (Sophia). Skills are multi-step workflows that Sophia can execute during phone conversations with patients.

**Important Distinction:**
- **Voice Agent Skills** (this guide): Capabilities Sophia uses during phone calls (e.g., scheduling, patient lookup)
- **Browser Testing Skills**: Browser automation tools for testing web applications (NOT covered in this guide)

This document focuses exclusively on **voice agent skills** used during call testing.

---

## Table of Contents

1. [What are Skills?](#what-are-skills)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step: Adding a New Skill](#step-by-step-adding-a-new-skill)
4. [File Structure](#file-structure)
5. [Testing Your New Skill](#testing-your-new-skill)
6. [Examples](#examples)
7. [Differences from Browser Testing](#differences-from-browser-testing)

---

## What are Skills?

**Skills** are orchestrated workflows that combine multiple **tools** to accomplish complex tasks during voice calls.

### Skills vs Tools

- **Tools**: Atomic operations (single responsibility)
  - Example: `check_availability`, `book_appointment`, `send_sms`
  - Stateless, composable, testable

- **Skills**: Multi-step workflows
  - Example: `schedule_appointment` skill uses: check_availability → book_appointment → send_sms
  - Maintains context and state
  - Can call other skills

### How Skills Work in Voice Calls

1. User speaks to Sophia during a call
2. OpenAI/Gemini AI decides to invoke a skill based on conversation context
3. Skill executes multiple tools in sequence
4. Results are returned to the AI
5. Sophia responds naturally to the user based on skill outcome

---

## Prerequisites

Before adding a new skill, ensure you have:

1. **Required tools already created**
   - Skills orchestrate existing tools
   - If your skill needs tools that don't exist, create those first (see `SKILLS_TOOLS_IMPLEMENTATION_GUIDE.md`)

2. **Understanding of the skill's purpose**
   - What workflow does it automate?
   - What tools will it use?
   - What inputs does it need?
   - What outputs will it return?

3. **Database access** (if needed)
   - Skills can interact with the database via the `DatabaseAdapter`

---

## Step-by-Step: Adding a New Skill

### Step 1: Choose a Category Directory

Skills are organized by category. Create or use an existing category directory:

```bash
# Existing categories
skills/scheduling/          # Appointment-related workflows
skills/patient-intake/      # Patient onboarding workflows

# Create a new category if needed
mkdir -p skills/your-category-name/
```

**Example**: For a cancellation workflow skill, use `skills/scheduling/`

---

### Step 2: Create the Skill Markdown File

Create a `.skill.md` file that defines the skill's metadata and documentation.

**Naming Convention**: `skill-name.skill.md`

**Location**: `skills/your-category/your-skill-name.skill.md`

**Template**:

```markdown
# Your Skill Display Name

Brief description of what this skill does.

## Metadata

- **Name**: your_skill_name
- **Version**: 1.0.0
- **Category**: your-category
- **Required Tools**: tool_1, tool_2, tool_3

## Workflow

Describe the workflow steps:

1. **Step 1**: Description
2. **Step 2**: Description
3. **Step 3**: Description

## Input Schema

### inputParameter1

- **Type**: string
- **Required**: true
- **Description**: Description of this parameter

### inputParameter2

- **Type**: number
- **Required**: false
- **Description**: Description of this parameter

## Output Schema

- **Type**: object (SkillResult)
- **Success**: boolean - True if workflow succeeded
- **Message**: string - Human-readable outcome message
- **Data**: object - Contains workflow-specific data
- **Error**: string - Error message if workflow failed
```

**Example**: `skills/scheduling/cancel-appointment.skill.md`

```markdown
# Cancel Appointment

Workflow for cancelling an existing appointment and sending confirmation.

## Metadata

- **Name**: cancel_appointment_workflow
- **Version**: 1.0.0
- **Category**: scheduling
- **Required Tools**: get_appointment_history, cancel_appointment, send_cancellation_sms

## Workflow

1. **Lookup Appointment**: Find the patient's upcoming appointment
2. **Cancel Appointment**: Cancel the appointment in the system
3. **Send Confirmation**: Send SMS confirmation of cancellation

## Input Schema

### patientId

- **Type**: string
- **Required**: true
- **Description**: Unique identifier for the patient

### reason

- **Type**: string
- **Required**: false
- **Description**: Reason for cancellation (optional)

## Output Schema

- **Type**: object (SkillResult)
- **Success**: boolean - True if cancellation succeeded
- **Message**: string - Confirmation message
- **Data**: object - Contains cancelledAppointmentId and originalDatetime
- **Error**: string - Error message if cancellation failed
```

---

### Step 3: Create the Skill TypeScript Class

Create a `.ts` file that implements the skill logic.

**Naming Convention**: `skill-name-skill.ts` (must match the markdown file base name)

**Location**: `skills/your-category/your-skill-name-skill.ts`

**Template**:

```typescript
import { BaseSkill, SkillResult } from '../skill-base';

export default class YourSkillNameSkill extends BaseSkill {
  // Metadata is automatically loaded from your-skill-name.skill.md

  async execute(input: {
    // Define your input parameters with types
    param1: string;
    param2: number;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting ${this.metadata.name} skill`);

    try {
      // Step 1: Execute first tool
      console.log('  Step 1/3: Doing first action...');
      const result1 = await this.invokeTool('tool_name_1', {
        arg1: input.param1,
        arg2: input.param2
      });

      // Check result and handle failures
      if (!result1 || result1.length === 0) {
        return {
          success: false,
          message: 'No results found',
          data: { /* optional data */ }
        };
      }

      // Step 2: Execute second tool
      console.log('  Step 2/3: Doing second action...');
      const result2 = await this.invokeTool('tool_name_2', {
        arg1: result1.someField
      });

      // Step 3: Execute third tool
      console.log('  Step 3/3: Doing final action...');
      await this.invokeTool('tool_name_3', {
        arg1: input.param1,
        arg2: result2.someField
      });

      // Update context (optional)
      this.updateContext({
        sessionData: {
          lastExecutedSkill: this.metadata.name,
          customData: result2.id
        }
      });

      // Return success result
      return {
        success: true,
        message: 'Workflow completed successfully',
        data: {
          // Include relevant data for the AI to reference
          resultId: result2.id,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error: any) {
      console.error('❌ Skill execution failed:', error);
      return {
        success: false,
        message: 'An error occurred during workflow',
        error: error.message
      };
    }
  }
}
```

**Example**: `skills/scheduling/cancel-appointment-skill.ts`

```typescript
import { BaseSkill, SkillResult } from '../skill-base';

export default class CancelAppointmentSkill extends BaseSkill {
  // Metadata loaded from cancel-appointment.skill.md

  async execute(input: {
    patientId: string;
    reason?: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting cancel_appointment_workflow skill`);

    try {
      // Step 1: Find upcoming appointment
      console.log('  Step 1/3: Finding upcoming appointment...');
      const history = await this.invokeTool('get_appointment_history', {
        patient_id: input.patientId,
        status: 'upcoming'
      });

      if (!history || history.length === 0) {
        return {
          success: false,
          message: 'No upcoming appointments found to cancel'
        };
      }

      const appointment = history[0];
      console.log(`  Found appointment: ${appointment.id} on ${appointment.datetime}`);

      // Step 2: Cancel the appointment
      console.log('  Step 2/3: Cancelling appointment...');
      const cancellation = await this.invokeTool('cancel_appointment', {
        appointment_id: appointment.id,
        reason: input.reason || 'Patient requested cancellation'
      });

      // Step 3: Send confirmation SMS
      console.log('  Step 3/3: Sending cancellation confirmation...');
      await this.invokeTool('send_cancellation_sms', {
        phone_number: appointment.phone_number,
        appointment_datetime: appointment.datetime,
        child_names: appointment.child_names
      });

      return {
        success: true,
        message: `Appointment on ${appointment.datetime} cancelled successfully`,
        data: {
          cancelledAppointmentId: appointment.id,
          originalDatetime: appointment.datetime
        }
      };

    } catch (error: any) {
      console.error('❌ Skill execution failed:', error);
      return {
        success: false,
        message: 'Error during cancellation workflow',
        error: error.message
      };
    }
  }
}
```

---

### Step 4: Register the Skill in the Category Index

Update the category's `index.ts` to export your new skill.

**Location**: `skills/your-category/index.ts`

```typescript
// Export all skills in this category
export { default as ScheduleAppointmentSkill } from './schedule-appointment-skill';
export { default as CancelAppointmentSkill } from './cancel-appointment-skill';
export { default as YourNewSkill } from './your-new-skill-skill';
```

---

### Step 5: Skill Auto-Discovery

**The skill is now automatically discovered!**

The `SkillEngine` will:
1. Scan the `skills/` directory for all files matching `*-skill.ts`
2. Load each skill class
3. Read metadata from the corresponding `.skill.md` file
4. Register the skill with the AI provider

No manual registration needed! ✅

---

### Step 6: Test Your Skill

See [Testing Your New Skill](#testing-your-new-skill) section below.

---

## File Structure

After creating a new skill, your file structure should look like:

```
jefferson-dental/
├── skills/
│   ├── your-category/
│   │   ├── index.ts                          # Export all skills
│   │   ├── your-skill-name.skill.md          # Metadata & documentation
│   │   └── your-skill-name-skill.ts          # Implementation
│   ├── skill-base.ts                         # Base class (don't modify)
│   └── index.ts                              # Root exports
```

**Important Naming Rules:**
- Markdown file: `your-skill-name.skill.md`
- TypeScript file: `your-skill-name-skill.ts` (must match the base name)
- Class name: `YourSkillNameSkill` (PascalCase)
- Skill function name (in metadata): `your_skill_name` (snake_case)

---

## Testing Your New Skill

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Verify Skill Discovery

Check the console output when the app starts. You should see:

```
🔍 Discovering skills from ./skills...
   Found X skill files
✅ Registered skill: your_skill_name (v1.0.0)
```

### 3. Test via Voice Call Simulation

1. Click **"Simulate Outbound Call"** in the UI
2. Wait for Sophia to initiate the call
3. Engage in conversation that would trigger your skill
4. Observe the console logs for skill execution

**Example conversation to trigger `cancel_appointment_workflow`:**

```
Sophia: "Hello, this is Sophia from Jefferson Dental..."
You: "Hi, I need to cancel my appointment"
Sophia: [AI decides to invoke cancel_appointment_workflow skill]
```

### 4. Check Execution Logs

Look for these console messages:

```
🎯 Starting your_skill_name skill
  Step 1/3: Doing first action...
  🔧 Skill your_skill_name invoking tool: tool_name_1
  ✅ Logged skill execution: your_skill_name → tool_name_1
  Step 2/3: Doing second action...
  ...
✅ Skill your_skill_name completed in XXXms
```

### 5. Check Database Logs

If your skill uses `this.invokeTool()`, execution logs are automatically saved to:
- **Table**: `skill_execution_logs`
- **Fields**: conversationId, skillName, stepNumber, stepName, toolUsed, executionStatus, etc.

Query the database to verify:

```sql
SELECT * FROM skill_execution_logs
WHERE skill_name = 'your_skill_name'
ORDER BY executed_at DESC;
```

---

## Examples

### Example 1: Simple Query Skill

**Use Case**: Look up patient insurance information

**File**: `skills/patient-info/check-insurance-skill.ts`

```typescript
import { BaseSkill, SkillResult } from '../skill-base';

export default class CheckInsuranceSkill extends BaseSkill {
  async execute(input: {
    patientId: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting check_insurance skill`);

    try {
      const insurance = await this.invokeTool('get_insurance_info', {
        patient_id: input.patientId
      });

      return {
        success: true,
        message: `Insurance status: ${insurance.status}`,
        data: {
          insuranceProvider: insurance.provider,
          status: insurance.status,
          expirationDate: insurance.expiration_date
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Could not retrieve insurance information',
        error: error.message
      };
    }
  }
}
```

### Example 2: Conditional Logic Skill

**Use Case**: Emergency appointment booking with urgency triage

**File**: `skills/scheduling/emergency-booking-skill.ts`

```typescript
import { BaseSkill, SkillResult } from '../skill-base';

export default class EmergencyBookingSkill extends BaseSkill {
  async execute(input: {
    patientId: string;
    urgencyLevel: 'critical' | 'high' | 'moderate';
    symptoms: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting emergency_booking skill (urgency: ${input.urgencyLevel})`);

    try {
      let timeRange: string;
      let priorityScore: number;

      // Conditional logic based on urgency
      if (input.urgencyLevel === 'critical') {
        timeRange = 'today';
        priorityScore = 10;
      } else if (input.urgencyLevel === 'high') {
        timeRange = 'tomorrow';
        priorityScore = 7;
      } else {
        timeRange = 'this_week';
        priorityScore = 5;
      }

      // Step 1: Find emergency slots
      const slots = await this.invokeTool('find_emergency_slots', {
        time_range: timeRange,
        priority: priorityScore
      });

      if (!slots || slots.length === 0) {
        // Escalate to manual handling
        await this.invokeTool('send_emergency_alert', {
          patient_id: input.patientId,
          urgency: input.urgencyLevel,
          symptoms: input.symptoms
        });

        return {
          success: false,
          message: 'No emergency slots available. Office staff will call you shortly.',
          data: { escalated: true }
        };
      }

      // Step 2: Book the emergency slot
      const booking = await this.invokeTool('book_emergency_appointment', {
        patient_id: input.patientId,
        slot_id: slots[0].id,
        notes: `EMERGENCY (${input.urgencyLevel}): ${input.symptoms}`
      });

      return {
        success: true,
        message: `Emergency appointment booked for ${slots[0].datetime}`,
        data: {
          appointmentId: booking.id,
          datetime: slots[0].datetime,
          urgency: input.urgencyLevel
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Error during emergency booking',
        error: error.message
      };
    }
  }
}
```

### Example 3: Nested Skill Execution

**Use Case**: Reschedule appointment (cancels old + schedules new)

**File**: `skills/scheduling/reschedule-workflow-skill.ts`

```typescript
import { BaseSkill, SkillResult } from '../skill-base';

export default class RescheduleWorkflowSkill extends BaseSkill {
  async execute(input: {
    patientId: string;
    newDate: string;
    newTimeRange: string;
    reason?: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting reschedule_workflow skill`);

    try {
      // Step 1: Cancel existing appointment using cancel skill
      console.log('  Step 1/2: Cancelling existing appointment...');
      const cancellationResult = await this.invokeTool('cancel_appointment_workflow', {
        input: {
          patientId: input.patientId,
          reason: input.reason || 'Rescheduling'
        }
      });

      if (!cancellationResult.success) {
        return {
          success: false,
          message: 'Could not cancel existing appointment',
          error: cancellationResult.error
        };
      }

      // Step 2: Schedule new appointment using schedule skill
      console.log('  Step 2/2: Scheduling new appointment...');
      const schedulingResult = await this.invokeTool('schedule_appointment', {
        input: {
          patientId: input.patientId,
          date: input.newDate,
          timeRange: input.newTimeRange,
          numChildren: cancellationResult.data.numChildren,
          parentPhone: cancellationResult.data.phoneNumber
        }
      });

      return {
        success: schedulingResult.success,
        message: `Rescheduled from ${cancellationResult.data.originalDatetime} to ${schedulingResult.data.datetime}`,
        data: {
          oldAppointmentId: cancellationResult.data.cancelledAppointmentId,
          newAppointmentId: schedulingResult.data.appointmentId,
          newDatetime: schedulingResult.data.datetime
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Error during reschedule workflow',
        error: error.message
      };
    }
  }
}
```

---

## Differences from Browser Testing

### Voice Agent Skills (This Guide)

**Purpose**: Automate workflows during voice conversations with patients

**How Skills are Called**:
1. User speaks to the AI during a simulated/real phone call
2. OpenAI/Gemini decides which skill to invoke based on conversation context
3. Skill executes tools (database queries, API calls, SMS sending)
4. Result is returned to the AI
5. AI responds naturally to the user

**Skill Definition**:
- TypeScript class extending `BaseSkill`
- Metadata in `.skill.md` file
- Auto-discovered via `SkillEngine`
- Registered as callable functions in the AI provider

**Skill Execution Context**:
- Runs in the Node.js backend
- Has access to database via `DatabaseAdapter`
- Can invoke tools and other skills
- Context includes: conversationId, patientId, phoneNumber

**Testing**:
- Start voice call simulation in the app UI
- Speak to trigger the skill
- Check console logs and database logs

**Example Skills**:
- `schedule_appointment`
- `cancel_appointment_workflow`
- `emergency_booking`
- `check_insurance`

---

### Browser Testing "Skills" (NOT This Guide)

**Purpose**: Automate browser interactions for testing web applications

**How "Skills" are Called**:
1. User instructs Claude in the chat: "Navigate to example.com and click the login button"
2. Claude uses MCP browser automation tools
3. Tools interact with Chrome browser via extension
4. Screenshots/results returned to Claude

**"Skill" Definition**:
- NOT TypeScript classes
- MCP (Model Context Protocol) tools
- Pre-defined by the claude-in-chrome extension
- NOT customizable by the user

**Execution Context**:
- Runs in the browser via Chrome extension
- Has access to web pages, DOM, console logs
- No database access
- Context includes: tabId, browser window state

**Testing**:
- Use Claude's browser automation commands
- No UI button to click
- Results shown in screenshots

**Example "Skills"**:
- `screenshot`
- `navigate`
- `form_input`
- `read_page`
- `computer` (click, type, scroll)

---

### Key Differences Summary

| Aspect | Voice Agent Skills | Browser Testing Tools |
|--------|-------------------|----------------------|
| **Environment** | Node.js backend | Chrome browser |
| **Triggered By** | AI during phone calls | Claude chat commands |
| **Language** | TypeScript classes | MCP protocol |
| **Customizable?** | ✅ Yes (this guide) | ❌ No (pre-defined) |
| **Access To** | Database, services, APIs | Web pages, DOM |
| **Examples** | schedule_appointment | screenshot, navigate |
| **Testing** | Voice call simulation | Browser automation |

---

## Troubleshooting

### Skill Not Discovered

**Symptom**: Skill doesn't appear in console logs during startup

**Solutions**:
1. Verify file naming: `your-skill-name-skill.ts` and `your-skill-name.skill.md`
2. Ensure files are in a subdirectory of `skills/`
3. Check that the class extends `BaseSkill`
4. Verify the class is exported as `export default`

### Skill Metadata Loading Error

**Symptom**: `Failed to load skill metadata from markdown`

**Solutions**:
1. Ensure `.skill.md` file exists in the same directory
2. Verify markdown file follows the correct format (see Step 2)
3. Check that `## Metadata` section is present with required fields

### Skill Execution Fails

**Symptom**: Skill returns error or times out

**Solutions**:
1. Check that all required tools exist (verify in console logs)
2. Add try-catch blocks around tool invocations
3. Validate input parameters before using them
4. Check database connectivity
5. Review execution logs in `skill_execution_logs` table

### AI Doesn't Invoke the Skill

**Symptom**: Conversation doesn't trigger your skill

**Solutions**:
1. Verify skill is registered (check startup console logs)
2. Ensure skill description in `.skill.md` is clear and specific
3. Test with explicit user requests (e.g., "I want to cancel my appointment")
4. Check that required tools are available

---

## Best Practices

1. **Single Responsibility**: Each skill should accomplish one clear workflow
2. **Error Handling**: Always wrap tool invocations in try-catch
3. **Logging**: Use console.log with step numbers for debugging
4. **Validation**: Validate inputs before processing
5. **Context Updates**: Update context with important execution data
6. **Rollback Logic**: Handle partial failures gracefully
7. **Documentation**: Keep `.skill.md` file up-to-date with implementation

---

## Need Help?

- See existing skills in `skills/scheduling/` for reference
- Read `SKILLS_TOOLS_IMPLEMENTATION_GUIDE.md` for architecture details
- Check console logs for detailed execution traces
- Review `skill_execution_logs` table for historical execution data

---

**Happy skill building!** 🚀
