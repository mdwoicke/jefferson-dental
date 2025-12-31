/**
 * Check SMS Delivery Status
 * Query Twilio to see the actual status of sent messages
 */

require('dotenv').config();
const twilio = require('twilio');

async function checkMessageStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const client = twilio(accountSid, authToken);

  const messageSids = [
    'SM4b868b85677d4927b218a9ac51f7c36c',
    'SM16827da0029e77766c17d94e811fb150',
    'SMf49b1c340291c90d2f619d33a25470bf'
  ];

  console.log('📊 Checking SMS Delivery Status...\n');

  for (const sid of messageSids) {
    try {
      const message = await client.messages(sid).fetch();

      console.log(`Message: ${sid}`);
      console.log(`  Status: ${message.status}`);
      console.log(`  To: ${message.to}`);
      console.log(`  From: ${message.from}`);
      console.log(`  Date Sent: ${message.dateSent || 'Not yet sent'}`);
      console.log(`  Error Code: ${message.errorCode || 'None'}`);
      console.log(`  Error Message: ${message.errorMessage || 'None'}`);
      console.log(`  Price: ${message.price || 'N/A'} ${message.priceUnit || ''}`);
      console.log();

      // Status meanings:
      // queued - Twilio has accepted the message
      // sending - Twilio is sending to carrier
      // sent - Carrier has accepted the message
      // delivered - Message successfully delivered to phone
      // undelivered - Failed to deliver
      // failed - Failed to send

    } catch (error) {
      console.error(`❌ Error checking ${sid}:`, error.message);
      console.log();
    }
  }

  console.log('\n📱 Status Guide:');
  console.log('  queued     - Twilio accepted, waiting to send');
  console.log('  sending    - Sending to carrier');
  console.log('  sent       - Carrier accepted');
  console.log('  delivered  - Successfully received on phone ✅');
  console.log('  undelivered - Failed to deliver ❌');
  console.log('  failed     - Failed to send ❌');
}

checkMessageStatus().catch(console.error);
