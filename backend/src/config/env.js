import 'dotenv/config';

const requiredVars = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'PAYMENT_PROVIDER',
  'ABACATEPAY_API_KEY',
  'ABACATEPAY_WEBHOOK_SECRET',
  'ALLOWED_DOMAINS',
  'PLATFORM_FEE_PERCENT'
];

const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0 && process.env.NODE_ENV !== 'development') {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

export default {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/morpheus-pay',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'abacatepay',
    abacatePay: {
      apiKey: process.env.ABACATEPAY_API_KEY || '',
      webhookSecret: process.env.ABACATEPAY_WEBHOOK_SECRET || ''
    }
  },
  allowedDomains: (process.env.ALLOWED_DOMAINS || 'localhost').split(','),
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT || '10', 10)
};
