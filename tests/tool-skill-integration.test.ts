import BookAppointmentTool from '../tools/appointment-tools/book-appointment.tool';
import CheckAvailabilityTool from '../tools/appointment-tools/check-availability.tool';
import GetPatientInfoTool from '../tools/patient-tools/get-patient-info.tool';
import ScheduleAppointmentSkill from '../skills/scheduling/schedule-appointment-skill';
import { ToolRegistry } from '../lib/tool-registry';
import { SkillEngine } from '../lib/skill-engine';

// Mock database adapter for testing
const mockDbAdapter = {
  async query() { return []; },
  async execute() { return { rowsAffected: 0 }; },
  async createFunctionCallLog() {},
  async createSkillExecutionLog() {},
  async getPatientInfo() { return null; }
} as any;

describe('Tool and Skill Integration with Markdown', () => {
  describe('Tool Definition Loading', () => {
    test('BookAppointmentTool should load definition from .md file', () => {
      const tool = new BookAppointmentTool(mockDbAdapter);
      const definition = tool.definition;

      expect(definition).toBeDefined();
      expect(definition.metadata.name).toBe('book_appointment');
      expect(definition.metadata.version).toBe('1.0.0');
      expect(definition.metadata.category).toBe('appointment');
      expect(definition.metadata.requiresPatientContext).toBe(true);
      expect(definition.parameters).toHaveLength(3);

      // Verify specific parameters
      const childNamesParam = definition.parameters.find(p => p.name === 'child_names');
      expect(childNamesParam).toBeDefined();
      expect(childNamesParam?.type).toBe('array');
      expect(childNamesParam?.required).toBe(true);
    });

    test('CheckAvailabilityTool should load definition from .md file', () => {
      const tool = new CheckAvailabilityTool(mockDbAdapter);
      const definition = tool.definition;

      expect(definition).toBeDefined();
      expect(definition.metadata.name).toBe('check_availability');
      expect(definition.metadata.category).toBe('appointment');
      expect(definition.parameters).toHaveLength(3);

      const timeRangeParam = definition.parameters.find(p => p.name === 'time_range');
      expect(timeRangeParam?.enum).toEqual(['morning', 'afternoon', 'evening']);
    });

    test('GetPatientInfoTool should load definition from .md file', () => {
      const tool = new GetPatientInfoTool(mockDbAdapter);
      const definition = tool.definition;

      expect(definition).toBeDefined();
      expect(definition.metadata.name).toBe('get_patient_info');
      expect(definition.metadata.category).toBe('patient');
      expect(definition.metadata.requiresPatientContext).toBe(false);
      expect(definition.parameters).toHaveLength(1);

      const phoneParam = definition.parameters[0];
      expect(phoneParam.name).toBe('phone_number');
      expect(phoneParam.type).toBe('string');
      expect(phoneParam.required).toBe(true);
    });

    test('Tool should be able to convert to OpenAI schema', () => {
      const tool = new BookAppointmentTool(mockDbAdapter);
      const schema = tool.toOpenAISchema();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('function');
      expect(schema.name).toBe('book_appointment');
      expect(schema.parameters.type).toBe('object');
      expect(schema.parameters.properties).toBeDefined();
      expect(schema.parameters.required).toContain('child_names');
      expect(schema.parameters.required).toContain('appointment_time');
      expect(schema.parameters.required).toContain('appointment_type');
    });

    test('Tool should be able to convert to MCP schema', () => {
      const tool = new BookAppointmentTool(mockDbAdapter);
      const schema = tool.toMCPSchema();

      expect(schema).toBeDefined();
      expect(schema.name).toBe('book_appointment');
      expect(schema.inputSchema).toBeDefined();
      expect(schema.inputSchema.properties).toBeDefined();
      expect(schema.inputSchema.required).toContain('child_names');
    });

    test('Tool validation should work with loaded definition', () => {
      const tool = new BookAppointmentTool(mockDbAdapter);

      // Valid args
      const validArgs = {
        child_names: ['John', 'Jane'],
        appointment_time: '2025-01-15T10:00:00Z',
        appointment_type: 'exam'
      };
      const validResult = tool.validate(validArgs);
      expect(validResult.valid).toBe(true);

      // Invalid args (missing required field)
      const invalidArgs = {
        child_names: ['John'],
        appointment_type: 'exam'
      };
      const invalidResult = tool.validate(invalidArgs);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Missing required parameter: appointment_time');

      // Invalid args (invalid enum value)
      const invalidEnumArgs = {
        child_names: ['John'],
        appointment_time: '2025-01-15T10:00:00Z',
        appointment_type: 'invalid_type'
      };
      const invalidEnumResult = tool.validate(invalidEnumArgs);
      expect(invalidEnumResult.valid).toBe(false);
    });
  });

  describe('Skill Metadata Loading', () => {
    const mockToolRegistry = new ToolRegistry(mockDbAdapter);
    // Register mock tools
    mockToolRegistry.register(new CheckAvailabilityTool(mockDbAdapter));
    mockToolRegistry.register(new BookAppointmentTool(mockDbAdapter));
    mockToolRegistry.register(new GetPatientInfoTool(mockDbAdapter));

    test('ScheduleAppointmentSkill should load metadata from .md file', () => {
      const skill = new ScheduleAppointmentSkill(mockToolRegistry, mockDbAdapter);
      const metadata = skill.metadata;

      expect(metadata).toBeDefined();
      expect(metadata.name).toBe('schedule_appointment');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('scheduling');
      expect(metadata.requiredTools).toHaveLength(3);
      expect(metadata.requiredTools).toContain('check_availability');
      expect(metadata.requiredTools).toContain('book_appointment');
      expect(metadata.requiredTools).toContain('send_confirmation_sms');
    });

    test('Skill dependency validation should work with loaded metadata', () => {
      // Only register check_availability, not all required tools
      const partialRegistry = new ToolRegistry(mockDbAdapter);
      partialRegistry.register(new CheckAvailabilityTool(mockDbAdapter));

      const skill = new ScheduleAppointmentSkill(partialRegistry, mockDbAdapter);
      const validation = skill.validateDependencies();

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('book_appointment');
      expect(validation.missing).toContain('send_confirmation_sms');
    });

    test('Skill dependency validation should pass when all tools are registered', () => {
      const fullRegistry = new ToolRegistry(mockDbAdapter);
      fullRegistry.register(new CheckAvailabilityTool(mockDbAdapter));
      fullRegistry.register(new BookAppointmentTool(mockDbAdapter));

      // We need to add send_confirmation_sms tool
      // For now, we'll create a minimal mock
      const mockSMSTool = {
        definition: {
          metadata: { name: 'send_confirmation_sms' },
          parameters: [],
          returns: { type: 'object', description: '' }
        },
        validate: () => ({ valid: true }),
        execute: async () => ({}),
        toOpenAISchema: () => ({}),
        toMCPSchema: () => ({})
      } as any;
      fullRegistry.register(mockSMSTool);

      const skill = new ScheduleAppointmentSkill(fullRegistry, mockDbAdapter);
      const validation = skill.validateDependencies();

      expect(validation.valid).toBe(true);
      expect(validation.missing).toBeUndefined();
    });
  });

  describe('Tool Registry Integration', () => {
    test('ToolRegistry should work with tools that load from .md files', () => {
      const registry = new ToolRegistry(mockDbAdapter);
      const tool = new BookAppointmentTool(mockDbAdapter);

      registry.register(tool);

      const retrieved = registry.get('book_appointment');
      expect(retrieved).toBe(tool);
      expect(retrieved?.definition.metadata.name).toBe('book_appointment');

      const allTools = registry.list();
      expect(allTools.length).toBeGreaterThan(0);
      expect(allTools[0].name).toBe('book_appointment');
    });

    test('ToolRegistry toOpenAISchemas should work with .md-loaded tools', () => {
      const registry = new ToolRegistry(mockDbAdapter);
      registry.register(new BookAppointmentTool(mockDbAdapter));
      registry.register(new CheckAvailabilityTool(mockDbAdapter));

      const schemas = registry.toOpenAISchemas();

      expect(schemas).toHaveLength(2);
      expect(schemas[0].name).toBeTruthy();
      expect(schemas[0].parameters).toBeDefined();
      expect(schemas[1].name).toBeTruthy();
      expect(schemas[1].parameters).toBeDefined();
    });

    test('ToolRegistry toMCPSchemas should work with .md-loaded tools', () => {
      const registry = new ToolRegistry(mockDbAdapter);
      registry.register(new BookAppointmentTool(mockDbAdapter));
      registry.register(new CheckAvailabilityTool(mockDbAdapter));

      const schemas = registry.toMCPSchemas();

      expect(schemas).toHaveLength(2);
      expect(schemas[0].name).toBeTruthy();
      expect(schemas[0].inputSchema).toBeDefined();
      expect(schemas[1].name).toBeTruthy();
      expect(schemas[1].inputSchema).toBeDefined();
    });
  });

  describe('Skill Engine Integration', () => {
    test('SkillEngine should work with skills that load from .md files', () => {
      const registry = new ToolRegistry(mockDbAdapter);
      const engine = new SkillEngine(registry, mockDbAdapter);

      engine.register(ScheduleAppointmentSkill);

      const allSkills = engine.list();
      expect(allSkills).toHaveLength(1);
      expect(allSkills[0].name).toBe('schedule_appointment');
      expect(allSkills[0].version).toBe('1.0.0');
    });
  });
});
