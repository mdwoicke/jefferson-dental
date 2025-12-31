import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
  },

  // AI Provider keys
  ai: {
    openaiKey: process.env.OPENAI_API_KEY || '',
    geminiKey: process.env.GEMINI_API_KEY || '',
    inboundProvider: (process.env.INBOUND_AI_PROVIDER || 'openai') as 'openai' | 'gemini'
  },

  // SMS configuration
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    mode: (process.env.SMS_CONFIRMATION_MODE || 'ask') as 'ask' | 'auto' | 'on-demand' | 'hybrid',
    testMode: process.env.SMS_TEST_MODE === 'true',
    testPhoneNumber: process.env.SMS_TEST_PHONE_NUMBER || null
  },

  // Server configuration
  server: {
    port: parseInt(process.env.BACKEND_PORT || '3001', 10),
    host: process.env.BACKEND_HOST || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Validation
export function validateConfig(): void {
  const required = [
    { key: 'TWILIO_ACCOUNT_SID', value: config.twilio.accountSid },
    { key: 'TWILIO_AUTH_TOKEN', value: config.twilio.authToken },
    { key: 'TWILIO_PHONE_NUMBER', value: config.twilio.phoneNumber }
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    console.warn('⚠️  Missing required environment variables:');
    missing.forEach(({ key }) => console.warn(`   - ${key}`));
    console.warn('\nPlease set these in your .env file (see .env.example)');
  }

  if (!config.ai.openaiKey && !config.ai.geminiKey) {
    console.warn('⚠️  No AI provider keys configured. Set at least one:');
    console.warn('   - OPENAI_API_KEY');
    console.warn('   - GEMINI_API_KEY');
  }
}
