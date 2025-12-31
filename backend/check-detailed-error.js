/**
 * Get Detailed Error Information
 */

require('dotenv').config();
const twilio = require('twilio');

async function getDetailedErrorInfo() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  console.log('🔍 Detailed Error Analysis for Error Code 30034\n');

  // Get the most recent message
  const sid = 'SM4b868b85677d4927b218a9ac51f7c36c';

  try {
    const message = await client.messages(sid).fetch();

    console.log('Message Details:');
    console.log('  SID:', message.sid);
    console.log('  Status:', message.status);
    console.log('  Error Code:', message.errorCode);
    console.log('  To:', message.to);
    console.log('  From:', message.from);
    console.log('  Direction:', message.direction);
    console.log('  Price:', message.price, message.priceUnit);
    console.log();

    console.log('📋 Error Code 30034 - Common Causes:\n');
    console.log('1. **Carrier Filtering (Most Likely)**');
    console.log('   - US carriers require A2P 10DLC registration for business messaging');
    console.log('   - Your number may not be registered for A2P messaging');
    console.log('   - Messages from unregistered numbers often get blocked');
    console.log();

    console.log('2. **Messaging Service Configuration**');
    console.log('   - You may need to create a Messaging Service in Twilio');
    console.log('   - Register your brand and campaign for A2P 10DLC');
    console.log();

    console.log('3. **Phone Number Type**');
    console.log('   - Standard local numbers have limitations for A2P messaging');
    console.log('   - Consider using a Toll-Free number or Short Code');
    console.log();

    console.log('📊 Check Twilio Console for more details:');
    console.log(`   https://console.twilio.com/us1/monitor/logs/sms/${message.sid}`);
    console.log();

    console.log('🔧 SOLUTIONS:\n');
    console.log('Option 1: Register for A2P 10DLC (Recommended for Production)');
    console.log('   - Go to: https://console.twilio.com/us1/develop/sms/a2p-registration');
    console.log('   - Register your business');
    console.log('   - Register your messaging campaign');
    console.log('   - Takes 1-2 weeks for approval');
    console.log();

    console.log('Option 2: Use Toll-Free Number (Quick Fix)');
    console.log('   - Purchase a toll-free number (starts with 800, 888, etc.)');
    console.log('   - Toll-free numbers have better deliverability');
    console.log('   - Still requires verification but faster than 10DLC');
    console.log();

    console.log('Option 3: Test with Twilio Verify Service (For Testing)');
    console.log('   - Use Twilio Verify for OTP/verification messages');
    console.log('   - Has built-in carrier agreements');
    console.log();

    console.log('Option 4: Add Number to Messaging Service');
    console.log('   - Create a Messaging Service in Twilio Console');
    console.log('   - Add your number to the service');
    console.log('   - Configure sender pool');
    console.log();

    console.log('⚡ IMMEDIATE TEST - Try sending from Twilio Console:');
    console.log('   1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/send-an-sms');
    console.log('   2. Send a test message to +19132209085');
    console.log('   3. See if it delivers from the console');
    console.log('   4. If console works but API doesn\'t, it\'s an A2P registration issue');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getDetailedErrorInfo().catch(console.error);
