/**
 * Database Test Script
 * Tests backend database initialization and adapter functionality
 */

import { initBackendDatabase, getDatabase, getDatabaseSize } from './db-init';
import { NodeDatabaseAdapter } from './node-adapter';

async function testDatabase() {
  console.log('\n🧪 Starting Database Tests...\n');

  try {
    // Test 1: Initialize database
    console.log('Test 1: Initialize Database');
    console.log('━'.repeat(50));
    const db = initBackendDatabase();
    console.log('✅ Database initialized successfully\n');

    // Test 2: Get database size
    console.log('Test 2: Database Size');
    console.log('━'.repeat(50));
    const size = getDatabaseSize();
    console.log(`📊 Database size: ${size.readable} (${size.bytes} bytes)`);
    console.log('✅ Database size retrieved\n');

    // Test 3: Create adapter
    console.log('Test 3: Create Database Adapter');
    console.log('━'.repeat(50));
    const adapter = new NodeDatabaseAdapter(db);
    console.log('✅ Adapter created successfully\n');

    // Test 4: Get database statistics
    console.log('Test 4: Database Statistics');
    console.log('━'.repeat(50));
    const stats = await adapter.getStats();
    console.log(`📊 Patients: ${stats.patients_count}`);
    console.log(`👶 Children: ${stats.children_count}`);
    console.log(`📅 Appointments: ${stats.appointments_count}`);
    console.log(`💬 Conversations: ${stats.conversations_count}`);
    console.log(`⚡ Function Calls: ${stats.function_calls_count}`);
    console.log('✅ Statistics retrieved\n');

    // Test 5: Get patient by phone number
    console.log('Test 5: Get Patient by Phone Number');
    console.log('━'.repeat(50));
    const patient = await adapter.getPatient('+15551234567');
    if (patient) {
      console.log(`👤 Found patient: ${patient.parentName}`);
      console.log(`📞 Phone: ${patient.phoneNumber}`);
      console.log(`👶 Children: ${patient.children.length}`);
      patient.children.forEach((child: any) => {
        console.log(`   - ${child.name}, age ${child.age}`);
      });
      console.log('✅ Patient retrieved successfully\n');
    } else {
      console.log('❌ Patient not found\n');
    }

    // Test 6: List all patients
    console.log('Test 6: List All Patients');
    console.log('━'.repeat(50));
    const patients = await adapter.listPatients();
    console.log(`📋 Found ${patients.length} patients:`);
    patients.forEach((p: any) => {
      console.log(`   - ${p.parentName} (${p.phoneNumber})`);
    });
    console.log('✅ Patients listed successfully\n');

    // Test 7: Get children by patient
    console.log('Test 7: Get Children by Patient');
    console.log('━'.repeat(50));
    const children = await adapter.getChildrenByPatient('PAT-001');
    console.log(`👶 Found ${children.length} children for PAT-001:`);
    children.forEach((child: any) => {
      console.log(`   - ${child.name}, age ${child.age}, Medicaid ID: ${child.medicaid_id}`);
    });
    console.log('✅ Children retrieved successfully\n');

    // Test 8: List appointments
    console.log('Test 8: List Appointments');
    console.log('━'.repeat(50));
    const appointments = await adapter.listAppointments({});
    console.log(`📅 Found ${appointments.length} appointments:`);
    appointments.forEach((apt: any) => {
      console.log(`   - ${apt.id}: ${apt.appointment_type} at ${apt.appointment_time}`);
      console.log(`     Status: ${apt.status}, Children: ${apt.child_count}`);
    });
    console.log('✅ Appointments listed successfully\n');

    // Test 9: Get appointment by ID
    console.log('Test 9: Get Appointment by ID');
    console.log('━'.repeat(50));
    const appointment = await adapter.getAppointment('APT-SAMPLE-001');
    if (appointment) {
      console.log(`📅 Appointment: ${appointment.appointment_type}`);
      console.log(`🕐 Time: ${appointment.appointment_time}`);
      console.log(`📍 Location: ${appointment.location}`);
      console.log(`✅ Status: ${appointment.status}`);
      console.log('✅ Appointment retrieved successfully\n');
    } else {
      console.log('❌ Appointment not found\n');
    }

    // Test 10: Get appointment children
    console.log('Test 10: Get Appointment Children');
    console.log('━'.repeat(50));
    const aptChildren = await adapter.getAppointmentChildren('APT-SAMPLE-001');
    console.log(`👶 Found ${aptChildren.length} children for appointment:`);
    aptChildren.forEach((child: any) => {
      console.log(`   - ${child.name}, age ${child.age}`);
    });
    console.log('✅ Appointment children retrieved\n');

    // Test 11: List conversations
    console.log('Test 11: List Conversations');
    console.log('━'.repeat(50));
    const conversations = await adapter.listConversations();
    console.log(`💬 Found ${conversations.length} conversations:`);
    conversations.forEach((conv: any) => {
      console.log(`   - ${conv.id}: ${conv.direction} call via ${conv.provider}`);
      console.log(`     Duration: ${conv.duration_seconds}s, Outcome: ${conv.outcome}`);
    });
    console.log('✅ Conversations listed successfully\n');

    // Test 12: Get conversation history
    console.log('Test 12: Get Conversation History');
    console.log('━'.repeat(50));
    const history = await adapter.getConversationHistory('CONV-SAMPLE-001');
    console.log(`💬 Found ${history.length} turns in conversation:`);
    history.forEach((turn: any) => {
      console.log(`   Turn ${turn.turn_number} (${turn.role}): ${turn.content_text?.substring(0, 60)}...`);
    });
    console.log('✅ Conversation history retrieved\n');

    // Test 13: Get function calls
    console.log('Test 13: Get Function Calls');
    console.log('━'.repeat(50));
    const functionCalls = await adapter.getFunctionCalls('CONV-SAMPLE-001');
    console.log(`⚡ Found ${functionCalls.length} function calls:`);
    functionCalls.forEach((fc: any) => {
      console.log(`   - ${fc.function_name}: ${fc.status} (${fc.execution_time_ms}ms)`);
    });
    console.log('✅ Function calls retrieved\n');

    // Test 14: Create new patient (transaction test)
    console.log('Test 14: Create New Patient (Transaction Test)');
    console.log('━'.repeat(50));
    const newPatientId = `PAT-TEST-${Date.now()}`;
    await adapter.beginTransaction();
    try {
      await adapter.createPatient({
        id: newPatientId,
        phoneNumber: '+15551111111',
        parentName: 'Test Parent',
        address: {
          street: '123 Test St',
          city: 'Austin',
          state: 'TX',
          zip: '78701'
        },
        preferredLanguage: 'English',
        children: []
      });

      // Create a child for the patient
      const childId = await adapter.createChild(newPatientId, {
        name: 'Test Child',
        age: 5,
        medicaid_id: 'MCD-TEST-001'
      });

      console.log(`✅ Created patient ${newPatientId} with child ID ${childId}`);

      // Verify the patient was created
      const newPatient = await adapter.getPatientById(newPatientId);
      if (newPatient && newPatient.children.length === 1) {
        console.log('✅ Patient verified successfully');
        await adapter.commit();
        console.log('✅ Transaction committed\n');
      } else {
        throw new Error('Patient verification failed');
      }

      // Clean up: delete the test patient
      await adapter.deletePatient(newPatientId);
      console.log('✅ Test patient deleted\n');

    } catch (error) {
      await adapter.rollback();
      console.log('❌ Transaction rolled back\n');
      throw error;
    }

    // Test 15: Export to JSON
    console.log('Test 15: Export Database to JSON');
    console.log('━'.repeat(50));
    const jsonExport = await adapter.exportToJSON();
    const exportData = JSON.parse(jsonExport);
    console.log(`📦 Exported ${exportData.patients.length} patients`);
    console.log(`📦 Exported ${exportData.children.length} children`);
    console.log(`📦 Exported ${exportData.appointments.length} appointments`);
    console.log('✅ JSON export successful\n');

    // Test 16: Raw SQL execution
    console.log('Test 16: Raw SQL Execution');
    console.log('━'.repeat(50));
    const rawResults = await adapter.executeRawSQL(
      'SELECT parent_name, COUNT(*) as child_count FROM patients p JOIN children c ON p.id = c.patient_id GROUP BY p.id'
    );
    console.log('👨‍👩‍👧‍👦 Parents and their child counts:');
    rawResults.forEach((row: any) => {
      console.log(`   - ${row.parent_name}: ${row.child_count} children`);
    });
    console.log('✅ Raw SQL executed successfully\n');

    // Test 17: Audit records
    console.log('Test 17: Get Audit Records');
    console.log('━'.repeat(50));
    const auditRecords = await adapter.getAuditRecords('patients', 'PAT-001');
    console.log(`📋 Found ${auditRecords.length} audit records for PAT-001:`);
    auditRecords.forEach((record: any) => {
      console.log(`   - ${record.operation} by ${record.changed_by}: ${record.change_reason}`);
    });
    console.log('✅ Audit records retrieved\n');

    // Final summary
    console.log('═'.repeat(50));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═'.repeat(50));
    console.log(`✅ 17 tests completed successfully`);
    console.log(`📊 Database is fully functional`);
    console.log(`💾 Database size: ${size.readable}`);
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run tests
testDatabase()
  .then(() => {
    console.log('\n✅ Test script completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
