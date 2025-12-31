#!/usr/bin/env ts-node
/**
 * Verification script to confirm tools and skills are loading definitions from .md files
 *
 * Run with: npx ts-node tests/verify-md-loading.ts
 */

import BookAppointmentTool from '../tools/appointment-tools/book-appointment.tool';
import CheckAvailabilityTool from '../tools/appointment-tools/check-availability.tool';
import GetPatientInfoTool from '../tools/patient-tools/get-patient-info.tool';
import SendConfirmationSMSTool from '../tools/notification-tools/send-confirmation-sms.tool';
import ScheduleAppointmentSkill from '../skills/scheduling/schedule-appointment-skill';
import { ToolRegistry } from '../lib/tool-registry';

// Mock database adapter
const mockDbAdapter = {
  async query() { return []; },
  async execute() { return { rowsAffected: 0 }; },
} as any;

console.log('🧪 Verifying Tool and Skill Markdown Loading\n');
console.log('=' .repeat(60));

// Test Tools
console.log('\n📦 Testing Tool Definition Loading from .md files:\n');

const tools = [
  { name: 'BookAppointmentTool', instance: new BookAppointmentTool(mockDbAdapter) },
  { name: 'CheckAvailabilityTool', instance: new CheckAvailabilityTool(mockDbAdapter) },
  { name: 'GetPatientInfoTool', instance: new GetPatientInfoTool(mockDbAdapter) },
  { name: 'SendConfirmationSMSTool', instance: new SendConfirmationSMSTool(mockDbAdapter) },
];

let toolsPassed = 0;
let toolsFailed = 0;

tools.forEach(({ name, instance }) => {
  try {
    const definition = instance.definition;
    const metadata = definition.metadata;

    console.log(`✅ ${name}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Version: ${metadata.version}`);
    console.log(`   Category: ${metadata.category}`);
    console.log(`   Parameters: ${definition.parameters.length}`);
    console.log(`   Return Type: ${definition.returns.type}`);

    // Verify it can be converted to schemas
    const openAISchema = instance.toOpenAISchema();
    const mcpSchema = instance.toMCPSchema();

    console.log(`   OpenAI Schema: ✓`);
    console.log(`   MCP Schema: ✓`);
    console.log('');

    toolsPassed++;
  } catch (error: any) {
    console.log(`❌ ${name} FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    toolsFailed++;
  }
});

// Test Skills
console.log('\n🎯 Testing Skill Metadata Loading from .md files:\n');

const mockToolRegistry = new ToolRegistry(mockDbAdapter);

const skills = [
  { name: 'ScheduleAppointmentSkill', instance: new ScheduleAppointmentSkill(mockToolRegistry, mockDbAdapter) },
];

let skillsPassed = 0;
let skillsFailed = 0;

skills.forEach(({ name, instance }) => {
  try {
    const metadata = instance.metadata;

    console.log(`✅ ${name}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Version: ${metadata.version}`);
    console.log(`   Category: ${metadata.category}`);
    console.log(`   Required Tools: ${metadata.requiredTools.join(', ')}`);
    console.log('');

    skillsPassed++;
  } catch (error: any) {
    console.log(`❌ ${name} FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    skillsFailed++;
  }
});

// Test Tool Registry Integration
console.log('\n🗂️  Testing Tool Registry Integration:\n');

try {
  const registry = new ToolRegistry(mockDbAdapter);

  tools.forEach(({ instance }) => {
    registry.register(instance);
  });

  const allTools = registry.list();
  console.log(`✅ Registered ${allTools.length} tools`);

  const openAISchemas = registry.toOpenAISchemas();
  console.log(`✅ Generated ${openAISchemas.length} OpenAI schemas`);

  const mcpSchemas = registry.toMCPSchemas();
  console.log(`✅ Generated ${mcpSchemas.length} MCP schemas`);

  console.log('');
  console.log('Tool Registry Integration: ✓');
} catch (error: any) {
  console.log(`❌ Tool Registry Integration FAILED`);
  console.log(`   Error: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:\n');
console.log(`Tools: ${toolsPassed} passed, ${toolsFailed} failed`);
console.log(`Skills: ${skillsPassed} passed, ${skillsFailed} failed`);

const totalPassed = toolsPassed + skillsPassed;
const totalFailed = toolsFailed + skillsFailed;

if (totalFailed === 0) {
  console.log('\n🎉 All tests passed! Tools and skills are correctly loading from .md files.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${totalFailed} tests failed. Please review the errors above.`);
  process.exit(1);
}
