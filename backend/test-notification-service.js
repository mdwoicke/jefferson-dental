/**
 * NotificationService Test Script
 * Tests the complete SMS integration through NotificationService
 */

require('dotenv').config();

// Compile TypeScript first
const { execSync } = require('child_process');

console.log('📦 Building TypeScript...\n');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Import the compiled NotificationService
const { NotificationService } = require('./dist/services/notification-service');

async function testNotificationService() {
  console.log('\n📱 Testing NotificationService SMS Integration...\n');

  const notificationService = new NotificationService();

  // Test 1: Send confirmation SMS
  console.log('Test 1: Sending appointment confirmation SMS...');
  const confirmationResult = await notificationService.sendConfirmationSMS({
    phone_number: '+19132209085',
    appointment_details: 'Alex and Sam - Mon, Dec 23, 2:00 PM',
    booking_id: 'APT-TEST-12345'
  });

  console.log('Result:', confirmationResult);

  if (confirmationResult.sent) {
    console.log('✅ Confirmation SMS sent successfully!');
    console.log('   Message SID:', confirmationResult.message_sid);
  } else {
    console.log('❌ Confirmation SMS failed:', confirmationResult.error);
  }

  console.log();

  // Test 2: Send appointment reminder
  console.log('Test 2: Sending appointment reminder SMS...');
  const reminderResult = await notificationService.sendAppointmentReminder({
    phone_number: '+19132209085',
    patient_name: 'Test Parent',
    child_name: 'Alex',
    appointment_time: '2025-12-23T14:00:00.000Z',
    location: 'Jefferson Dental - Main Street'
  });

  console.log('Result:', reminderResult);

  if (reminderResult.sent) {
    console.log('✅ Reminder SMS sent successfully!');
    console.log('   Message SID:', reminderResult.message_sid);
  } else {
    console.log('❌ Reminder SMS failed:', reminderResult.error);
  }

  console.log();
  console.log('🎉 NotificationService SMS integration test complete!');
  console.log('Check your phone (+19132209085) for 2 SMS messages.');
}

testNotificationService().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
