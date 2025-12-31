/**
 * Check Twilio Phone Number Capabilities
 */

require('dotenv').config();
const twilio = require('twilio');

async function checkNumberCapabilities() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  const client = twilio(accountSid, authToken);

  console.log('📞 Checking Twilio Number Capabilities...\n');
  console.log(`Number: ${phoneNumber}\n`);

  try {
    const incomingNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    });

    if (incomingNumbers.length === 0) {
      console.log('❌ Phone number not found in your Twilio account!');
      console.log('This number may not be owned by your account.');
      return;
    }

    const number = incomingNumbers[0];

    console.log('Number Details:');
    console.log('  Friendly Name:', number.friendlyName);
    console.log('  Phone Number:', number.phoneNumber);
    console.log();

    console.log('Capabilities:');
    console.log('  Voice:', number.capabilities.voice ? '✅ Enabled' : '❌ Disabled');
    console.log('  SMS:', number.capabilities.sms ? '✅ Enabled' : '❌ Disabled');
    console.log('  MMS:', number.capabilities.mms ? '✅ Enabled' : '❌ Disabled');
    console.log('  Fax:', number.capabilities.fax ? '✅ Enabled' : '❌ Disabled');
    console.log();

    if (!number.capabilities.sms) {
      console.log('⚠️  SMS is NOT enabled on this number!');
      console.log('This is why messages are failing.');
      console.log();
      console.log('Solutions:');
      console.log('1. Enable SMS on this number in Twilio Console');
      console.log('2. Or purchase a new number with SMS capability');
    } else {
      console.log('✅ SMS is enabled on this number.');
      console.log();
      console.log('The delivery issue may be due to:');
      console.log('1. Recipient phone number is invalid/landline');
      console.log('2. Carrier blocking messages');
      console.log('3. Phone is out of service');
      console.log();
      console.log('Try testing with a different phone number.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkNumberCapabilities().catch(console.error);
