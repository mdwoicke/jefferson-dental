/**
 * Quick script to add children to PAT-003
 * Run from backend directory: node add-children-quick.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/jefferson-dental.db');

console.log('📂 Database path:', dbPath);
console.log('🔧 Adding children to PAT-003...\n');

const db = new Database(dbPath);

try {
  // Check if PAT-003 exists
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get('PAT-003');

  if (!patient) {
    console.error('❌ Patient PAT-003 not found!');
    process.exit(1);
  }

  console.log(`✅ Found patient: ${patient.parent_name} (${patient.phone_number})\n`);

  // Check existing children
  const existingChildren = db.prepare('SELECT * FROM children WHERE patient_id = ?').all('PAT-003');
  console.log(`📊 Current children count: ${existingChildren.length}`);

  if (existingChildren.length > 0) {
    console.log('\nExisting children:');
    existingChildren.forEach(child => {
      console.log(`  - ${child.name}, age ${child.age}, Medicaid: ${child.medicaid_id}`);
    });
    console.log('\n✅ Children already exist!');
    process.exit(0);
  }

  // Add children
  console.log('\n➕ Adding children...');

  const insertChild = db.prepare(`
    INSERT INTO children (patient_id, name, age, medicaid_id, date_of_birth, special_needs)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const child1 = insertChild.run('PAT-003', 'Tony', 8, 'MCD-003-A', '2017-03-15', null);
  console.log(`✅ Added Tony (age 8) - ID: ${child1.lastInsertRowid}`);

  const child2 = insertChild.run('PAT-003', 'Paula', 6, 'MCD-003-B', '2019-07-22', null);
  console.log(`✅ Added Paula (age 6) - ID: ${child2.lastInsertRowid}`);

  // Verify
  const newChildren = db.prepare('SELECT * FROM children WHERE patient_id = ? ORDER BY age DESC').all('PAT-003');

  console.log(`\n✅ SUCCESS! Total children: ${newChildren.length}`);
  newChildren.forEach(child => {
    console.log(`  ✓ ${child.name}, age ${child.age}, Medicaid: ${child.medicaid_id}`);
  });

  console.log('\n🎉 The AI agent will now say: "Tony and Paula" during calls!\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}
