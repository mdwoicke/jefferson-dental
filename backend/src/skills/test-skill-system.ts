/**
 * Test Script for Skill System
 *
 * This script verifies that the skill system is properly integrated.
 * Run with: npx ts-node src/skills/test-skill-system.ts
 */

import { ToolRegistry } from '../lib/tool-registry';
import { MarkdownParser } from '../lib/markdown-parser';
import * as path from 'path';

async function testSkillSystem() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING SKILL SYSTEM');
  console.log('='.repeat(60) + '\n');

  // Test 1: ToolRegistry
  console.log('📋 TEST 1: ToolRegistry');
  console.log('-'.repeat(60));

  const registry = new ToolRegistry();

  // Register some mock tools
  registry.register('mock_tool_1', async (args) => {
    console.log('  Executing mock_tool_1 with args:', args);
    return { success: true, message: 'Tool 1 executed' };
  }, 'Mock tool for testing');

  registry.register('mock_tool_2', async (args) => {
    console.log('  Executing mock_tool_2 with args:', args);
    return { success: true, message: 'Tool 2 executed' };
  }, 'Another mock tool');

  // Print registry status
  registry.printStatus();

  // Test execution
  try {
    const result = await registry.execute('mock_tool_1', { test: 'data' });
    console.log('✅ Tool execution result:', result);
  } catch (error: any) {
    console.error('❌ Tool execution failed:', error.message);
  }

  // Test 2: MarkdownParser
  console.log('\n📋 TEST 2: MarkdownParser');
  console.log('-'.repeat(60));

  try {
    const skillPath = path.join(__dirname, 'scheduling', 'schedule-appointment.skill.md');
    console.log('  Parsing skill file:', skillPath);

    const parsed = MarkdownParser.parseSkillMarkdown(skillPath);
    console.log('✅ Skill parsed successfully:');
    console.log('  Name:', parsed.metadata.name);
    console.log('  Version:', parsed.metadata.version);
    console.log('  Category:', parsed.metadata.category);
    console.log('  Required Tools:', parsed.metadata.requiredTools.join(', '));
    console.log('  Description:', parsed.metadata.description);
  } catch (error: any) {
    console.error('❌ Skill parsing failed:', error.message);
  }

  // Test 3: Parse all skills in directory
  console.log('\n📋 TEST 3: Parse All Skills');
  console.log('-'.repeat(60));

  try {
    const skillsDir = path.join(__dirname);
    console.log('  Scanning directory:', skillsDir);

    const skills = MarkdownParser.parseSkillDirectory(skillsDir);
    console.log(`✅ Found ${skills.length} skill(s):`);

    for (const skill of skills) {
      console.log(`  - ${skill.metadata.name} v${skill.metadata.version} (${skill.metadata.category})`);
    }
  } catch (error: any) {
    console.error('❌ Directory parsing failed:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ SKILL SYSTEM TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Start the backend server: npm start');
  console.log('  2. Make a test call via the frontend');
  console.log('  3. Trigger the schedule_appointment skill');
  console.log('  4. Check skill_execution_logs table for step tracking');
  console.log('');
}

// Run the test
testSkillSystem().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
