#!/usr/bin/env node
/**
 * Query and update backend database
 * Usage: node scripts/query-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/jefferson-dental.db');

console.log('📦 Opening database:', DB_PATH);
const db = new Database(DB_PATH);

console.log('\n📋 All patients in BACKEND database:\n');
const patients = db.prepare('SELECT id, phone_number, parent_name FROM patients ORDER BY id').all();
patients.forEach(p => {
  console.log(`  ${p.id}: ${p.parent_name.padEnd(20)} - ${p.phone_number}`);
});

console.log('\n👶 Children by patient:\n');
patients.forEach(p => {
  const children = db.prepare('SELECT name, age FROM children WHERE patient_id = ? ORDER BY name').all(p.id);
  if (children.length > 0) {
    console.log(`  ${p.parent_name}:`);
    children.forEach(c => console.log(`    - ${c.name} (${c.age})`));
  }
});

console.log('\n');
db.close();
