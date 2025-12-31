/**
 * Script to add children to PAT-003 (Mike)
 * Run with: node scripts/add-children-pat-003.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data/jefferson-dental.db');
const db = new Database(dbPath);

console.log('🔧 Adding children to PAT-003...\n');

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
  console.log(`📊 Existing children: ${existingChildren.length}\n`);

  if (existingChildren.length > 0) {
    console.log('Children already exist:');
    existingChildren.forEach(child => {
      console.log(`  - ${child.name}, age ${child.age}`);
    });
    console.log('\n⚠️  Skipping - children already exist. Delete them first if you want to recreate.');
    process.exit(0);
  }

  // Add two children to PAT-003
  console.log('➕ Adding children...\n');

  const insertChild = db.prepare(`
    INSERT INTO children (patient_id, name, age, medicaid_id, date_of_birth, special_needs)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const child1 = insertChild.run(
    'PAT-003',
    'Tony',
    8,
    'MCD-003-A',
    '2017-03-15',
    null
  );
  console.log(`✅ Added child 1: Tony (age 8) - ID: ${child1.lastInsertRowid}`);

  const child2 = insertChild.run(
    'PAT-003',
    'Paula',
    6,
    'MCD-003-B',
    '2019-07-22',
    null
  );
  console.log(`✅ Added child 2: Paula (age 6) - ID: ${child2.lastInsertRowid}`);

  // Verify
  const newChildren = db.prepare('SELECT * FROM children WHERE patient_id = ? ORDER BY age DESC').all('PAT-003');
  console.log(`\n📊 Total children for PAT-003: ${newChildren.length}`);
  newChildren.forEach(child => {
    console.log(`  - ${child.name}, age ${child.age}, Medicaid: ${child.medicaid_id}`);
  });

  console.log('\n✅ SUCCESS! Children added to PAT-003.');
  console.log('🎉 The agent will now dynamically read: "Tony and Paula" during calls.\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
