const Database = require('better-sqlite3');
const db = new Database('./data/jefferson-dental.db');

console.log('\n📊 Checking for test calls and skill executions...\n');

// Check conversations table
try {
  const conversations = db.prepare(`
    SELECT id, phone_number, outcome, created_at, updated_at
    FROM conversations
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  console.log('Recent Conversations:');
  if (conversations.length === 0) {
    console.log('   ❌ No conversations found\n');
  } else {
    conversations.forEach((conv, i) => {
      console.log(`\n${i + 1}. Conversation ${conv.id}`);
      console.log(`   Phone: ${conv.phone_number}`);
      console.log(`   Outcome: ${conv.outcome || 'in progress'}`);
      console.log(`   Created: ${conv.created_at}`);
    });
    console.log();
  }
} catch (err) {
  console.log('   ⚠️  Conversations table not found or error:', err.message, '\n');
}

// Check if skill_execution_logs table exists
try {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='skill_execution_logs'
  `).all();

  if (tables.length > 0) {
    console.log('skill_execution_logs table exists ✅\n');

    const skillLogs = db.prepare(`
      SELECT skill_name, step_name, execution_status,
             substr(output_result, 1, 300) as output_preview,
             created_at
      FROM skill_execution_logs
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    console.log('Recent Skill Executions:');
    if (skillLogs.length === 0) {
      console.log('   ❌ No skill executions found');
    } else {
      skillLogs.forEach((log, i) => {
        console.log(`\n${i + 1}. ${log.skill_name} - ${log.step_name}`);
        console.log(`   Status: ${log.execution_status}`);
        console.log(`   Time: ${log.created_at}`);
        if (log.output_preview) {
          console.log(`   Output: ${log.output_preview}...`);
          // Check for verification message
          if (log.output_preview.includes('MD-FILE-LOADED')) {
            console.log('   🎯 VERIFICATION MESSAGE FOUND! ✅');
          }
        }
      });
    }
  } else {
    console.log('skill_execution_logs table does not exist ❌');
    console.log('(Table will be created when first skill is executed)\n');
  }
} catch (err) {
  console.log('⚠️  Error checking skill_execution_logs:', err.message, '\n');
}

// Check function_calls table for schedule_appointment usage
try {
  const functionCalls = db.prepare(`
    SELECT conversation_id, function_name,
           substr(arguments, 1, 100) as args_preview,
           substr(result, 1, 300) as result_preview,
           execution_time_ms, created_at
    FROM function_calls
    WHERE function_name = 'schedule_appointment'
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  console.log('\nRecent schedule_appointment function calls:');
  if (functionCalls.length === 0) {
    console.log('   ❌ No schedule_appointment calls found');
  } else {
    functionCalls.forEach((call, i) => {
      console.log(`\n${i + 1}. Conversation: ${call.conversation_id}`);
      console.log(`   Time: ${call.created_at}`);
      console.log(`   Execution: ${call.execution_time_ms}ms`);
      console.log(`   Args: ${call.args_preview}...`);
      if (call.result_preview) {
        console.log(`   Result: ${call.result_preview}...`);
        // Check for verification message
        if (call.result_preview.includes('MD-FILE-LOADED')) {
          console.log('   🎯 VERIFICATION MESSAGE FOUND IN RESULT! ✅');
        }
      }
    });
  }
  console.log();
} catch (err) {
  console.log('   ⚠️  function_calls query error:', err.message, '\n');
}

db.close();
