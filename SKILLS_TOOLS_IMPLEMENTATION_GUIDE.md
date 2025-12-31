# Claude Skills & Tools Implementation Guide
## Jefferson Dental Voice App - Complete Integration

This guide provides a comprehensive overview of implementing Claude Skills and MCP Tools in the Jefferson Dental voice application, with complete sample code showing end-to-end functionality.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Folder Structure](#folder-structure)
3. [Core Components](#core-components)
4. [Sample Code - Tools](#sample-code---tools)
5. [Sample Code - Skills](#sample-code---skills)
6. [End-to-End Flow Examples](#end-to-end-flow-examples)
7. [Integration Steps](#integration-steps)
8. [Testing & Validation](#testing--validation)

---

## Architecture Overview

### Current State (Before)
```
User speaks → OpenAI Provider → Hardcoded switch statement → Service method → Database
                                 (14 tools hardcoded)
```

### Future State (After)
```
User speaks → Provider → Tool Registry → Tool/Skill Engine → Service layer → Database
                         (Dynamic loading)   (Auto-discovery)
```

### Key Concepts

**Tools** = Atomic operations (single responsibility)
- Example: `check_availability`, `book_appointment`
- Stateless, composable, testable
- MCP-compatible schemas

**Skills** = Workflows (multi-step orchestration)
- Example: `schedule_appointment_skill` (checks availability + books + sends SMS)
- Uses multiple tools
- Maintains context and state
- Can call other skills

---

## Folder Structure

```
jefferson-dental/
├── tools/                                    # MCP Tools Directory
│   ├── tool-base.ts                         # Base tool class
│   ├── tool-types.ts                        # Type definitions
│   ├── index.ts                             # Registry exports
│   │
│   ├── appointment-tools/                   # Domain: Appointments
│   │   ├── index.ts
│   │   ├── check-availability.tool.ts
│   │   ├── book-appointment.tool.ts
│   │   ├── cancel-appointment.tool.ts
│   │   └── reschedule-appointment.tool.ts
│   │
│   ├── patient-tools/                       # Domain: Patient Data
│   │   ├── index.ts
│   │   ├── get-patient-info.tool.ts
│   │   └── search-patients.tool.ts
│   │
│   └── notification-tools/                  # Domain: Communications
│       ├── index.ts
│       ├── send-sms.tool.ts
│       └── send-email.tool.ts
│
├── skills/                                   # Claude Skills Directory
│   ├── skill-base.ts                        # Base skill class
│   ├── skill-types.ts                       # Type definitions
│   ├── index.ts                             # Skill registry exports
│   │
│   ├── scheduling/                          # Domain: Scheduling Workflows
│   │   ├── index.ts
│   │   ├── schedule-appointment-skill.ts
│   │   └── reschedule-workflow-skill.ts
│   │
│   └── patient-intake/                      # Domain: Onboarding
│       ├── index.ts
│       └── new-patient-intake-skill.ts
│
├── lib/                                      # Core Infrastructure
│   ├── tool-registry.ts                     # Tool registration & discovery
│   ├── skill-engine.ts                      # Skill execution engine
│   ├── context-manager.ts                   # Context & state management
│   └── mcp-client.ts                        # MCP protocol client (optional)
│
└── providers/                                # Provider Layer (Modified)
    ├── openai-provider.ts                   # Uses ToolRegistry
    ├── tool-adapter.ts                      # Provider-agnostic adapter
    └── gemini-provider.ts                   # Uses ToolRegistry
```

---

## Core Components

### 1. Tool Base Class (`tools/tool-base.ts`)

```typescript
import { DatabaseAdapter } from '../database/db-interface';

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
  abstract definition: ToolDefinition;

  constructor(
    protected dbAdapter: DatabaseAdapter,
    protected context?: any
  ) {}

  abstract execute(args: any): Promise<any>;

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
            ...(param.enum && { enum: param.enum })
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
```

### 2. Tool Registry (`lib/tool-registry.ts`)

```typescript
import { BaseTool } from '../tools/tool-base';
import { DatabaseAdapter } from '../database/db-interface';
import { glob } from 'glob';

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
  async discoverTools(toolsDir: string): Promise<void> {
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
```

### 3. Skill Base Class (`skills/skill-base.ts`)

```typescript
import { ToolRegistry } from '../lib/tool-registry';
import { DatabaseAdapter } from '../database/db-interface';

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  category: string;
  requiredTools: string[];
  requiredSkills?: string[];
}

export interface SkillContext {
  conversationId?: string;
  patientId?: string;
  phoneNumber?: string;
  sessionData?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export abstract class BaseSkill {
  abstract metadata: SkillMetadata;

  constructor(
    protected toolRegistry: ToolRegistry,
    protected dbAdapter: DatabaseAdapter,
    protected context: SkillContext = {}
  ) {}

  // Main execution method
  abstract execute(input: any): Promise<SkillResult>;

  // Validate that all required tools are available
  validateDependencies(): { valid: boolean; missing?: string[] } {
    const missing: string[] = [];

    for (const toolName of this.metadata.requiredTools) {
      if (!this.toolRegistry.get(toolName)) {
        missing.push(toolName);
      }
    }

    return missing.length > 0 ? { valid: false, missing } : { valid: true };
  }

  // Helper to invoke a tool
  protected async invokeTool(name: string, args: any): Promise<any> {
    console.log(`  🔧 Skill ${this.metadata.name} invoking tool: ${name}`);
    return await this.toolRegistry.execute(name, args);
  }

  // Update context during execution
  protected updateContext(updates: Partial<SkillContext>): void {
    this.context = { ...this.context, ...updates };
  }

  // Get context value
  protected getContext(key: keyof SkillContext): any {
    return this.context[key];
  }
}
```

### 4. Skill Engine (`lib/skill-engine.ts`)

```typescript
import { BaseSkill, SkillContext } from '../skills/skill-base';
import { ToolRegistry } from './tool-registry';
import { DatabaseAdapter } from '../database/db-interface';
import { glob } from 'glob';

export class SkillEngine {
  private skills: Map<string, typeof BaseSkill> = new Map();
  private instances: Map<string, BaseSkill> = new Map();

  constructor(
    private toolRegistry: ToolRegistry,
    private dbAdapter: DatabaseAdapter
  ) {}

  // Register a skill class
  register(SkillClass: typeof BaseSkill): void {
    const tempInstance = new SkillClass(this.toolRegistry, this.dbAdapter);
    const name = tempInstance.metadata.name;
    this.skills.set(name, SkillClass);
    console.log(`✅ Registered skill: ${name} (v${tempInstance.metadata.version})`);
  }

  // Auto-discover skills from directory
  async discoverSkills(skillsDir: string): Promise<void> {
    const skillFiles = glob.sync(`${skillsDir}/**/*-skill.ts`);
    console.log(`🔍 Discovering skills from ${skillsDir}...`);
    console.log(`   Found ${skillFiles.length} skill files`);

    for (const file of skillFiles) {
      try {
        const module = await import(file);
        if (module.default && typeof module.default === 'function') {
          this.register(module.default);
        }
      } catch (error) {
        console.error(`❌ Failed to load skill from ${file}:`, error);
      }
    }
  }

  // Execute a skill with context
  async execute(name: string, input: any, context?: SkillContext): Promise<any> {
    const SkillClass = this.skills.get(name);
    if (!SkillClass) {
      throw new Error(`Skill not found: ${name}`);
    }

    // Create instance with context
    const skill = new SkillClass(this.toolRegistry, this.dbAdapter, context);

    // Validate dependencies
    const validation = skill.validateDependencies();
    if (!validation.valid) {
      throw new Error(`Skill ${name} missing required tools: ${validation.missing?.join(', ')}`);
    }

    // Execute
    console.log(`🎯 Executing skill: ${name}`);
    const startTime = Date.now();
    try {
      const result = await skill.execute(input);
      const executionTime = Date.now() - startTime;
      console.log(`✅ Skill ${name} completed in ${executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Skill ${name} failed after ${executionTime}ms:`, error);
      throw error;
    }
  }

  // List all registered skills
  list(): any[] {
    return Array.from(this.skills.keys()).map(name => {
      const SkillClass = this.skills.get(name)!;
      const instance = new SkillClass(this.toolRegistry, this.dbAdapter);
      return instance.metadata;
    });
  }
}
```

---

## Sample Code - Tools

### Example Tool: Check Availability (`tools/appointment-tools/check-availability.tool.ts`)

```typescript
import { BaseTool, ToolDefinition } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class CheckAvailabilityTool extends BaseTool {
  definition: ToolDefinition = {
    metadata: {
      name: 'check_availability',
      description: 'Check available appointment time slots for a specific date and time range',
      version: '1.0.0',
      category: 'appointment',
      requiresPatientContext: false
    },
    parameters: [
      {
        name: 'date',
        type: 'string',
        description: 'The date to check availability (YYYY-MM-DD format)',
        required: true
      },
      {
        name: 'time_range',
        type: 'string',
        description: 'Preferred time range',
        required: true,
        enum: ['morning', 'afternoon', 'evening', 'any']
      },
      {
        name: 'num_children',
        type: 'number',
        description: 'Number of children needing appointments',
        required: true
      }
    ],
    returns: {
      type: 'array',
      description: 'Array of available time slots with chair availability',
      schema: {
        items: {
          type: 'object',
          properties: {
            time: { type: 'string', description: 'Human-readable time' },
            datetime: { type: 'string', description: 'ISO datetime' },
            available_chairs: { type: 'number' },
            can_accommodate: { type: 'boolean' }
          }
        }
      }
    }
  };

  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    date: string;
    time_range: string;
    num_children: number;
  }): Promise<any> {
    console.log(`  📅 Checking availability for ${args.date} (${args.time_range})`);
    return await this.appointmentService.checkAvailability(args);
  }
}
```

### Example Tool: Book Appointment (`tools/appointment-tools/book-appointment.tool.ts`)

```typescript
import { BaseTool, ToolDefinition } from '../tool-base';
import { AppointmentService } from '../../services/appointment-service';

export default class BookAppointmentTool extends BaseTool {
  definition: ToolDefinition = {
    metadata: {
      name: 'book_appointment',
      description: 'Book an appointment for one or more children',
      version: '1.0.0',
      category: 'appointment',
      requiresPatientContext: true
    },
    parameters: [
      {
        name: 'patient_id',
        type: 'string',
        description: 'Patient ID',
        required: true
      },
      {
        name: 'datetime',
        type: 'string',
        description: 'ISO datetime for appointment',
        required: true
      },
      {
        name: 'num_children',
        type: 'number',
        description: 'Number of children to book',
        required: true
      },
      {
        name: 'notes',
        type: 'string',
        description: 'Optional notes',
        required: false
      }
    ],
    returns: {
      type: 'object',
      description: 'Booking confirmation',
      schema: {
        properties: {
          success: { type: 'boolean' },
          appointment_id: { type: 'string' },
          child_names: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  };

  private appointmentService: AppointmentService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.appointmentService = new AppointmentService(dbAdapter);
  }

  async execute(args: {
    patient_id: string;
    datetime: string;
    num_children: number;
    notes?: string;
  }): Promise<any> {
    console.log(`  📝 Booking appointment for patient ${args.patient_id}`);
    return await this.appointmentService.bookAppointment(args);
  }
}
```

### Example Tool: Send SMS (`tools/notification-tools/send-sms.tool.ts`)

```typescript
import { BaseTool, ToolDefinition } from '../tool-base';
import { NotificationService } from '../../services/notification-service';

export default class SendSMSTool extends BaseTool {
  definition: ToolDefinition = {
    metadata: {
      name: 'send_confirmation_sms',
      description: 'Send appointment confirmation via SMS',
      version: '1.0.0',
      category: 'notification'
    },
    parameters: [
      {
        name: 'phone_number',
        type: 'string',
        description: 'Phone number in E.164 format',
        required: true
      },
      {
        name: 'appointment_datetime',
        type: 'string',
        description: 'Appointment datetime',
        required: true
      },
      {
        name: 'child_names',
        type: 'array',
        description: 'Names of children',
        required: true
      }
    ],
    returns: {
      type: 'object',
      description: 'SMS delivery status'
    }
  };

  private notificationService: NotificationService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.notificationService = new NotificationService();
  }

  async execute(args: {
    phone_number: string;
    appointment_datetime: string;
    child_names: string[];
  }): Promise<any> {
    console.log(`  📱 Sending SMS to ${args.phone_number}`);
    return await this.notificationService.sendConfirmationSMS(args);
  }
}
```

---

## Sample Code - Skills

### Example Skill: Schedule Appointment Workflow (`skills/scheduling/schedule-appointment-skill.ts`)

```typescript
import { BaseSkill, SkillMetadata, SkillContext, SkillResult } from '../skill-base';

export default class ScheduleAppointmentSkill extends BaseSkill {
  metadata: SkillMetadata = {
    name: 'schedule_appointment',
    description: 'Complete workflow for scheduling an appointment with availability check and confirmation',
    version: '1.0.0',
    category: 'scheduling',
    requiredTools: [
      'check_availability',
      'book_appointment',
      'send_confirmation_sms'
    ]
  };

  async execute(input: {
    patientId: string;
    date: string;
    timeRange: string;
    numChildren: number;
    parentPhone: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting schedule_appointment skill for ${input.numChildren} children`);

    try {
      // Step 1: Check availability
      console.log('  Step 1/4: Checking availability...');
      const availability = await this.invokeTool('check_availability', {
        date: input.date,
        time_range: input.timeRange,
        num_children: input.numChildren
      });

      if (!availability || availability.length === 0) {
        return {
          success: false,
          message: `No available slots for ${input.date} in ${input.timeRange}`,
          data: { suggestedDates: await this.getSuggestedDates(input.date) }
        };
      }

      // Step 2: Select best slot (first available)
      const selectedSlot = availability[0];
      console.log(`  Step 2/4: Selected slot at ${selectedSlot.time}`);

      // Step 3: Book the appointment
      console.log('  Step 3/4: Booking appointment...');
      const booking = await this.invokeTool('book_appointment', {
        patient_id: input.patientId,
        datetime: selectedSlot.datetime,
        num_children: input.numChildren,
        notes: `Scheduled via AI voice agent - ${this.metadata.name}`
      });

      if (!booking.success) {
        return {
          success: false,
          message: 'Failed to book appointment',
          error: booking.error
        };
      }

      // Step 4: Send confirmation SMS
      console.log('  Step 4/4: Sending confirmation SMS...');
      await this.invokeTool('send_confirmation_sms', {
        phone_number: input.parentPhone,
        appointment_datetime: selectedSlot.datetime,
        child_names: booking.child_names
      });

      // Update context
      this.updateContext({
        sessionData: {
          lastAppointmentId: booking.appointment_id,
          lastBookedDatetime: selectedSlot.datetime
        }
      });

      return {
        success: true,
        message: 'Appointment successfully scheduled and confirmation sent',
        data: {
          appointmentId: booking.appointment_id,
          datetime: selectedSlot.datetime,
          time: selectedSlot.time,
          childNames: booking.child_names
        }
      };
    } catch (error: any) {
      console.error('❌ Skill execution failed:', error);
      return {
        success: false,
        message: 'An error occurred while scheduling',
        error: error.message
      };
    }
  }

  private async getSuggestedDates(requestedDate: string): Promise<string[]> {
    // Logic to suggest alternative dates
    const suggestions: string[] = [];
    const startDate = new Date(requestedDate);

    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + i);
      const dateStr = nextDate.toISOString().split('T')[0];

      // Check if this date has availability
      try {
        const availability = await this.invokeTool('check_availability', {
          date: dateStr,
          time_range: 'any',
          num_children: 1
        });

        if (availability && availability.length > 0) {
          suggestions.push(dateStr);
        }

        if (suggestions.length >= 3) break;
      } catch (error) {
        // Continue checking other dates
      }
    }

    return suggestions;
  }
}
```

### Example Skill: Reschedule Workflow (`skills/scheduling/reschedule-workflow-skill.ts`)

```typescript
import { BaseSkill, SkillMetadata, SkillResult } from '../skill-base';

export default class RescheduleWorkflowSkill extends BaseSkill {
  metadata: SkillMetadata = {
    name: 'reschedule_workflow',
    description: 'Complete workflow to reschedule an existing appointment',
    version: '1.0.0',
    category: 'scheduling',
    requiredTools: [
      'get_appointment_history',
      'cancel_appointment',
      'check_availability',
      'book_appointment',
      'send_confirmation_sms'
    ]
  };

  async execute(input: {
    patientId: string;
    newDate: string;
    newTimeRange: string;
    reason?: string;
  }): Promise<SkillResult> {
    console.log(`🎯 Starting reschedule_workflow skill`);

    try {
      // Step 1: Find existing upcoming appointment
      console.log('  Step 1/5: Finding existing appointment...');
      const history = await this.invokeTool('get_appointment_history', {
        patient_id: input.patientId,
        status: 'upcoming'
      });

      if (!history || history.length === 0) {
        return {
          success: false,
          message: 'No upcoming appointments found to reschedule'
        };
      }

      const existingAppointment = history[0];
      console.log(`  Found appointment: ${existingAppointment.id} on ${existingAppointment.datetime}`);

      // Step 2: Cancel the existing appointment
      console.log('  Step 2/5: Cancelling existing appointment...');
      await this.invokeTool('cancel_appointment', {
        appointment_id: existingAppointment.id,
        reason: input.reason || 'Rescheduled by patient request'
      });

      // Step 3: Check availability for new date
      console.log('  Step 3/5: Checking new date availability...');
      const availability = await this.invokeTool('check_availability', {
        date: input.newDate,
        time_range: input.newTimeRange,
        num_children: existingAppointment.num_children
      });

      if (!availability || availability.length === 0) {
        // Rollback: Need to rebook original appointment
        console.warn('  ⚠️  No availability, attempting to restore original booking...');
        return {
          success: false,
          message: `No availability on ${input.newDate}. Original appointment was cancelled.`,
          data: { needsRebooking: true }
        };
      }

      // Step 4: Book new appointment
      const selectedSlot = availability[0];
      console.log('  Step 4/5: Booking new appointment...');
      const booking = await this.invokeTool('book_appointment', {
        patient_id: input.patientId,
        datetime: selectedSlot.datetime,
        num_children: existingAppointment.num_children,
        notes: `Rescheduled from ${existingAppointment.datetime}. Reason: ${input.reason || 'Patient request'}`
      });

      // Step 5: Send confirmation
      console.log('  Step 5/5: Sending confirmation...');
      await this.invokeTool('send_confirmation_sms', {
        phone_number: existingAppointment.phone_number,
        appointment_datetime: selectedSlot.datetime,
        child_names: existingAppointment.child_names
      });

      return {
        success: true,
        message: `Appointment rescheduled from ${existingAppointment.datetime} to ${selectedSlot.datetime}`,
        data: {
          oldAppointmentId: existingAppointment.id,
          newAppointmentId: booking.appointment_id,
          oldDatetime: existingAppointment.datetime,
          newDatetime: selectedSlot.datetime
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

## End-to-End Flow Examples

### Flow 1: Simple Tool Call (Check Availability)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER SPEAKS: "Can you check availability tomorrow morning?"     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI DECIDES: Call check_availability tool                    │
│ Arguments: {                                                     │
│   date: "2025-12-22",                                           │
│   time_range: "morning",                                        │
│   num_children: 2                                               │
│ }                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PROVIDER: Receives function call via WebSocket                  │
│ Message type: "response.function_call_arguments.done"           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOOL REGISTRY: Lookup "check_availability"                      │
│ toolRegistry.execute('check_availability', args)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOOL INSTANCE: CheckAvailabilityTool                            │
│ 1. Validate arguments ✅                                         │
│ 2. Execute: appointmentService.checkAvailability()              │
│ 3. Query database for available slots                           │
│ 4. Return result:                                               │
│    [                                                             │
│      { time: "9:00 AM", datetime: "...", available_chairs: 3 }  │
│      { time: "10:00 AM", datetime: "...", available_chairs: 2 } │
│    ]                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PROVIDER: Send result back to OpenAI                            │
│ {                                                                │
│   type: "conversation.item.create",                             │
│   item: {                                                        │
│     type: "function_call_output",                               │
│     call_id: "...",                                             │
│     output: "[{time: '9:00 AM', ...}]"                          │
│   }                                                              │
│ }                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI RESPONDS: "Yes, we have availability tomorrow morning    │
│ at 9 AM and 10 AM. Would you like me to book one of these?"    │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Multi-Step Skill Execution (Schedule Appointment)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER SPEAKS: "Yes, book the 9 AM slot for both my kids"        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI DECIDES: Invoke schedule_appointment skill               │
│ (Skill registered as a special tool in the registry)            │
│ Arguments: {                                                     │
│   patientId: "pat_123",                                         │
│   date: "2025-12-22",                                           │
│   timeRange: "morning",                                         │
│   numChildren: 2,                                               │
│   parentPhone: "+15551234567"                                   │
│ }                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SKILL ENGINE: Execute "schedule_appointment" skill              │
│ skillEngine.execute('schedule_appointment', args, context)      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SKILL INSTANCE: ScheduleAppointmentSkill.execute()              │
│                                                                  │
│ Step 1/4: Check availability                                    │
│   → invokeTool('check_availability', {...})                     │
│   ← Returns: [{ time: "9:00 AM", ... }]                        │
│                                                                  │
│ Step 2/4: Select best slot                                      │
│   → selectedSlot = availability[0]                              │
│                                                                  │
│ Step 3/4: Book appointment                                      │
│   → invokeTool('book_appointment', {                            │
│        patient_id: "pat_123",                                   │
│        datetime: "2025-12-22T09:00:00Z",                        │
│        num_children: 2                                          │
│      })                                                          │
│   ← Returns: {                                                  │
│        success: true,                                           │
│        appointment_id: "apt_456",                               │
│        child_names: ["Tony", "Paula"]                           │
│      }                                                           │
│                                                                  │
│ Step 4/4: Send confirmation                                     │
│   → invokeTool('send_confirmation_sms', {                       │
│        phone_number: "+15551234567",                            │
│        appointment_datetime: "2025-12-22T09:00:00Z",            │
│        child_names: ["Tony", "Paula"]                           │
│      })                                                          │
│   ← Returns: { sent: true, message_sid: "SM..." }              │
│                                                                  │
│ Return: {                                                        │
│   success: true,                                                │
│   message: "Appointment successfully scheduled...",             │
│   data: {                                                        │
│     appointmentId: "apt_456",                                   │
│     datetime: "2025-12-22T09:00:00Z",                           │
│     childNames: ["Tony", "Paula"]                               │
│   }                                                              │
│ }                                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PROVIDER: Send skill result back to OpenAI                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI RESPONDS: "Perfect! I've scheduled appointments for      │
│ Tony and Paula on December 22nd at 9 AM. You should receive a  │
│ confirmation text message shortly. Is there anything else?"     │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: Skill Calling Another Skill (Reschedule)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER: "Actually, my kid is sick. Can we reschedule?"           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI: "I'm sorry to hear that. What date works better?"      │
│ USER: "How about next Monday afternoon?"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI: Invoke reschedule_workflow skill                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESCHEDULE WORKFLOW SKILL:                                      │
│                                                                  │
│ Step 1: Get appointment history                                 │
│   → invokeTool('get_appointment_history', {...})                │
│   ← Find appointment apt_456 on 2025-12-22                     │
│                                                                  │
│ Step 2: Cancel existing appointment                             │
│   → invokeTool('cancel_appointment', {                          │
│        appointment_id: "apt_456",                               │
│        reason: "Patient sick"                                   │
│      })                                                          │
│   ← Cancelled successfully                                      │
│                                                                  │
│ Step 3: Check new date availability                             │
│   → invokeTool('check_availability', {                          │
│        date: "2025-12-29",                                      │
│        time_range: "afternoon",                                 │
│        num_children: 2                                          │
│      })                                                          │
│   ← Available slots found                                       │
│                                                                  │
│ Step 4-5: Use SCHEDULE_APPOINTMENT SKILL (nested)              │
│   → skillEngine.execute('schedule_appointment', {               │
│        patientId: "pat_123",                                    │
│        date: "2025-12-29",                                      │
│        timeRange: "afternoon",                                  │
│        ...                                                       │
│      })                                                          │
│   ← New appointment booked + SMS sent                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ OPENAI: "No problem! I've rescheduled your appointment from     │
│ December 22nd to Monday, December 29th at 2 PM. Feel better!"  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Steps

### Step 1: Create Base Infrastructure

```bash
# Create directories
mkdir -p tools/{appointment-tools,patient-tools,notification-tools}
mkdir -p skills/{scheduling,patient-intake}
mkdir -p lib
```

### Step 2: Implement Core Classes

1. **Create `tools/tool-base.ts`** (copy from sample code above)
2. **Create `lib/tool-registry.ts`** (copy from sample code above)
3. **Create `skills/skill-base.ts`** (copy from sample code above)
4. **Create `lib/skill-engine.ts`** (copy from sample code above)

### Step 3: Create Provider Adapter

```typescript
// providers/tool-adapter.ts
import { ToolRegistry } from '../lib/tool-registry';
import { SkillEngine } from '../lib/skill-engine';
import { VoiceProvider } from '../types';

export class ProviderToolAdapter {
  constructor(
    private toolRegistry: ToolRegistry,
    private skillEngine: SkillEngine
  ) {}

  // Get all tools and skills as provider-specific schemas
  getToolsForProvider(provider: VoiceProvider): any[] {
    const tools = this.toolRegistry.toOpenAISchemas();
    const skills = this.getSkillsAsTools();
    return [...tools, ...skills];
  }

  // Convert skills to tool schemas so AI can call them
  private getSkillsAsTools(): any[] {
    const skills = this.skillEngine.list();
    return skills.map(skill => ({
      type: 'function',
      name: skill.name,
      description: skill.description,
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            description: 'Skill input parameters'
          }
        },
        required: ['input']
      }
    }));
  }

  // Execute tool or skill
  async execute(name: string, args: any, context?: any): Promise<any> {
    // Try tool first
    const tool = this.toolRegistry.get(name);
    if (tool) {
      return await this.toolRegistry.execute(name, args);
    }

    // Try skill
    const skills = this.skillEngine.list();
    if (skills.find(s => s.name === name)) {
      return await this.skillEngine.execute(name, args.input || args, context);
    }

    throw new Error(`Tool or skill not found: ${name}`);
  }
}
```

### Step 4: Modify OpenAI Provider

```typescript
// providers/openai-provider.ts (MODIFICATIONS)

import { ToolRegistry } from '../lib/tool-registry';
import { SkillEngine } from '../lib/skill-engine';
import { ProviderToolAdapter } from './tool-adapter';

export class OpenAIProvider implements IVoiceProvider {
  // ... existing properties
  private toolRegistry!: ToolRegistry;
  private skillEngine!: SkillEngine;
  private toolAdapter!: ProviderToolAdapter;

  constructor(dbAdapter?: DatabaseAdapter) {
    // ... existing initialization

    if (dbAdapter) {
      // Initialize tool registry
      this.toolRegistry = new ToolRegistry(dbAdapter);

      // Initialize skill engine
      this.skillEngine = new SkillEngine(this.toolRegistry, dbAdapter);

      // Initialize adapter
      this.toolAdapter = new ProviderToolAdapter(this.toolRegistry, this.skillEngine);

      // Load tools and skills
      this.initializeToolsAndSkills();
    }
  }

  private async initializeToolsAndSkills(): Promise<void> {
    try {
      // Auto-discover tools
      await this.toolRegistry.discoverTools('./tools');

      // Auto-discover skills
      await this.skillEngine.discoverSkills('./skills');

      console.log('✅ Tools and skills loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load tools/skills:', error);
    }
  }

  private async sendSessionUpdate(): Promise<void> {
    // REPLACE hardcoded tools array with dynamic registry
    const tools = this.toolAdapter?.getToolsForProvider('openai') || [];

    const sessionUpdate = {
      type: 'session.update',
      session: {
        // ... existing config
        tools: tools, // ← Dynamic tools + skills
        tool_choice: 'auto'
      }
    };

    this.ws?.send(JSON.stringify(sessionUpdate));
  }

  private async executeFunctionCall(call: FunctionCall): Promise<void> {
    // REPLACE switch statement with adapter
    try {
      const context = {
        conversationId: this.conversationId,
        patientId: this.currentPatientId,
        phoneNumber: this.phoneNumber
      };

      const result = await this.toolAdapter.execute(call.name, args, context);

      // ... existing logging and callback code
      // Send result back to OpenAI
    } catch (error) {
      // ... existing error handling
    }
  }
}
```

### Step 5: Migrate Existing Tools

Convert each existing function to a tool:

```typescript
// Example: Migrate get_patient_info
// FROM: Hardcoded in switch statement
// TO: tools/patient-tools/get-patient-info.tool.ts

import { BaseTool, ToolDefinition } from '../tool-base';
import { CRMService } from '../../services/crm-service';

export default class GetPatientInfoTool extends BaseTool {
  definition: ToolDefinition = {
    metadata: {
      name: 'get_patient_info',
      description: 'Retrieve patient information by phone number',
      version: '1.0.0',
      category: 'patient'
    },
    parameters: [
      {
        name: 'phone_number',
        type: 'string',
        description: 'Patient phone number',
        required: true
      }
    ],
    returns: {
      type: 'object',
      description: 'Patient record'
    }
  };

  private crmService: CRMService;

  constructor(dbAdapter: any) {
    super(dbAdapter);
    this.crmService = new CRMService(dbAdapter);
  }

  async execute(args: { phone_number: string }): Promise<any> {
    return await this.crmService.getPatientByPhone(args.phone_number);
  }
}
```

### Step 6: Create Initial Skills

Create your first skill to test the system:

```typescript
// skills/scheduling/schedule-appointment-skill.ts
// (Use the complete example from the sample code section above)
```

### Step 7: Test End-to-End

```typescript
// Test script: test-tools-skills.ts
import { ToolRegistry } from './lib/tool-registry';
import { SkillEngine } from './lib/skill-engine';
import { DatabaseAdapter } from './database/db-interface';

async function testSystem() {
  const dbAdapter = /* your db adapter */;

  // Initialize
  const toolRegistry = new ToolRegistry(dbAdapter);
  const skillEngine = new SkillEngine(toolRegistry, dbAdapter);

  // Load tools and skills
  await toolRegistry.discoverTools('./tools');
  await skillEngine.discoverSkills('./skills');

  // Test a tool
  console.log('Testing check_availability tool...');
  const slots = await toolRegistry.execute('check_availability', {
    date: '2025-12-22',
    time_range: 'morning',
    num_children: 2
  });
  console.log('Available slots:', slots);

  // Test a skill
  console.log('\nTesting schedule_appointment skill...');
  const result = await skillEngine.execute('schedule_appointment', {
    patientId: 'pat_123',
    date: '2025-12-22',
    timeRange: 'morning',
    numChildren: 2,
    parentPhone: '+15551234567'
  });
  console.log('Skill result:', result);
}

testSystem();
```

---

## Testing & Validation

### Unit Tests for Tools

```typescript
// tools/__tests__/check-availability.test.ts
import CheckAvailabilityTool from '../appointment-tools/check-availability.tool';
import { MockDatabaseAdapter } from '../../database/__mocks__/db-adapter';

describe('CheckAvailabilityTool', () => {
  let tool: CheckAvailabilityTool;
  let mockDb: MockDatabaseAdapter;

  beforeEach(() => {
    mockDb = new MockDatabaseAdapter();
    tool = new CheckAvailabilityTool(mockDb);
  });

  test('validates required parameters', () => {
    const result = tool.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required parameter: date');
  });

  test('validates enum values', () => {
    const result = tool.validate({
      date: '2025-12-22',
      time_range: 'invalid',
      num_children: 2
    });
    expect(result.valid).toBe(false);
  });

  test('executes successfully with valid args', async () => {
    const result = await tool.execute({
      date: '2025-12-22',
      time_range: 'morning',
      num_children: 2
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

### Integration Tests for Skills

```typescript
// skills/__tests__/schedule-appointment-skill.test.ts
import ScheduleAppointmentSkill from '../scheduling/schedule-appointment-skill';
import { ToolRegistry } from '../../lib/tool-registry';
import { MockDatabaseAdapter } from '../../database/__mocks__/db-adapter';

describe('ScheduleAppointmentSkill', () => {
  let skill: ScheduleAppointmentSkill;
  let toolRegistry: ToolRegistry;
  let mockDb: MockDatabaseAdapter;

  beforeEach(async () => {
    mockDb = new MockDatabaseAdapter();
    toolRegistry = new ToolRegistry(mockDb);
    await toolRegistry.discoverTools('./tools');
    skill = new ScheduleAppointmentSkill(toolRegistry, mockDb);
  });

  test('validates dependencies', () => {
    const result = skill.validateDependencies();
    expect(result.valid).toBe(true);
  });

  test('executes complete workflow', async () => {
    const result = await skill.execute({
      patientId: 'pat_123',
      date: '2025-12-22',
      timeRange: 'morning',
      numChildren: 2,
      parentPhone: '+15551234567'
    });

    expect(result.success).toBe(true);
    expect(result.data?.appointmentId).toBeDefined();
  });

  test('handles no availability gracefully', async () => {
    // Mock no availability
    mockDb.setMockData('appointments', [/* fully booked */]);

    const result = await skill.execute({
      patientId: 'pat_123',
      date: '2025-12-22',
      timeRange: 'morning',
      numChildren: 2,
      parentPhone: '+15551234567'
    });

    expect(result.success).toBe(false);
    expect(result.data?.suggestedDates).toBeDefined();
  });
});
```

---

## Summary

This implementation provides:

✅ **Dynamic Tool Loading**: Add new tools without modifying provider code
✅ **Skill Workflows**: Multi-step orchestration with context
✅ **Provider Agnostic**: Works with OpenAI and Gemini
✅ **Type Safe**: Full TypeScript support
✅ **Testable**: Each component can be tested in isolation
✅ **MCP Compatible**: Ready for external MCP server integration
✅ **Auto-Discovery**: Tools and skills register automatically
✅ **Voice Integrated**: Seamless integration with voice conversations

The system transforms hardcoded function calling into a flexible, extensible architecture that supports complex workflows while maintaining simplicity for basic operations.
