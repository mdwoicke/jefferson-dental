const Database = require('better-sqlite3');
const db = new Database('./data/jefferson-dental.db');

console.log('\n🔍 Searching for verification message in skill execution logs...\n');

// Get the most recent schedule_appointment execution
const skillExec = db.prepare(`
  SELECT skill_name, step_name, output_result, input_args, created_at
  FROM skill_execution_logs
  WHERE skill_name = 'schedule_appointment'
    AND step_name = 'Execute schedule_appointment'
  ORDER BY created_at DESC
  LIMIT 1
`).get();

if (!skillExec) {
  console.log('❌ No schedule_appointment skill execution found in database\n');
} else {
  console.log('📋 Most Recent schedule_appointment Execution:');
  console.log(`   Time: ${skillExec.created_at}`);
  console.log(`   Step: ${skillExec.step_name}\n`);

  console.log('Input Args:');
  console.log(skillExec.input_args);
  console.log();

  console.log('Full Output Result:');
  console.log(skillExec.output_result);
  console.log();

  // Check for verification message
  if (skillExec.output_result && skillExec.output_result.includes('MD-FILE-LOADED-SUCCESSFULLY')) {
    console.log('✅✅✅ VERIFICATION MESSAGE FOUND! ✅✅✅');
    console.log('The .md file was successfully loaded and used by the skill!\n');

    // Extract and highlight the verification tag
    const match = skillExec.output_result.match(/\[([^\]]*MD-FILE-LOADED[^\]]*)\]/);
    if (match) {
      console.log(`🎯 Verification Tag: ${match[1]}\n`);
    }
  } else {
    console.log('❌ Verification message NOT found in output');
    console.log('This means the skill was executed before the .md file loading was implemented,');
    console.log('or the backend needs to be restarted with the updated code.\n');
  }
}

db.close();
