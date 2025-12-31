/**
 * SMS Test Script
 * Quick test to verify Twilio SMS functionality
 */

require('dotenv').config();
const twilio = require('twilio');

async function sendTestSMS() {
  console.log('📱 SMS Test Script Starting...\n');

  // Check environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const toNumber = process.env.SMS_TEST_PHONE_NUMBER;

  console.log('Configuration:');
  console.log('  Account SID:', accountSid ? `${accountSid.substring(0, 8)}...` : 'MISSING');
  console.log('  Auth Token:', authToken ? '***configured***' : 'MISSING');
  console.log('  From Number:', fromNumber);
  console.log('  To Number:', toNumber);
  console.log();

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.error('❌ Missing required environment variables!');
    console.error('Please ensure .env file has:');
    console.error('  - TWILIO_ACCOUNT_SID');
    console.error('  - TWILIO_AUTH_TOKEN');
    console.error('  - TWILIO_PHONE_NUMBER');
    console.error('  - SMS_TEST_PHONE_NUMBER');
    process.exit(1);
  }

  try {
    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Test message
    const testMessage = `Jefferson Dental Test SMS

This is a test message from your AI voice agent system.

✅ SMS integration is working correctly!

Time: ${new Date().toLocaleString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})}

Reply STOP to opt out.`;

    console.log('📤 Sending test SMS...');
    console.log('Message preview:');
    console.log('---');
    console.log(testMessage);
    console.log('---\n');

    // Send the message
    const message = await client.messages.create({
      to: toNumber,
      from: fromNumber,
      body: testMessage
    });

    console.log('✅ SUCCESS! SMS sent successfully!\n');
    console.log('Message Details:');
    console.log('  Message SID:', message.sid);
    console.log('  Status:', message.status);
    console.log('  To:', message.to);
    console.log('  From:', message.from);
    console.log('  Date Created:', message.dateCreated);
    console.log();
    console.log('🎉 SMS functionality is working! Check your phone.');
    console.log();
    console.log('📊 View in Twilio Console:');
    console.log(`   https://console.twilio.com/us1/monitor/logs/sms/${message.sid}`);

  } catch (error) {
    console.error('❌ ERROR sending SMS:');
    console.error('  Error Code:', error.code);
    console.error('  Error Message:', error.message);
    console.error();

    if (error.code === 21211) {
      console.error('💡 Tip: Invalid phone number format. Use E.164 format (+1234567890)');
    } else if (error.code === 21408) {
      console.error('💡 Tip: Permission denied. Check Twilio account status.');
    } else if (error.code === 20003) {
      console.error('💡 Tip: Authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    process.exit(1);
  }
}

// Run the test
sendTestSMS();
