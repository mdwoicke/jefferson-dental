const Database = require('better-sqlite3');
const db = new Database('./data/jefferson_dental.db');

console.log('\n📊 Recent Skill Executions:');
const logs = db.prepare(`
  SELECT skill_name, step_name, execution_status,
         substr(output_result, 1, 200) as output_preview,
         created_at
  FROM skill_execution_logs
  ORDER BY created_at DESC
  LIMIT 5
`).all();

if (logs.length === 0) {
  console.log('   No skill executions found');
} else {
  logs.forEach((log, i) => {
    console.log(`\n${i + 1}. ${log.skill_name} - ${log.step_name}`);
    console.log(`   Status: ${log.execution_status}`);
    console.log(`   Time: ${log.created_at}`);
    if (log.output_preview) {
      console.log(`   Output: ${log.output_preview}...`);
    }
  });
}

db.close();
