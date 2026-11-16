// Central configuration (reads .env once). Keep secrets only in .env / host env vars.
require('dotenv').config();

const int = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : fallback);

module.exports = {
  port: int(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || null,
  dbName: process.env.MONGO_DB_NAME || 'spcbookstore',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  tokenTtlHours: int(process.env.TOKEN_TTL_HOURS, 2),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),

  paymentProvider: process.env.PAYMENT_PROVIDER || 'paymongo',
  paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY || '',
  paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || '',

  mayaPublicKey: process.env.MAYA_PUBLIC_KEY || '',
  mayaSecretKey: process.env.MAYA_SECRET_KEY || '',
  mayaBaseUrl: process.env.MAYA_BASE_URL || 'https://pg-sandbox.paymaya.com',
  // Optional pipe-separated PEM overrides for Maya's webhook signing keys.
  mayaWebhookPublicKeys: (process.env.MAYA_WEBHOOK_PUBLIC_KEYS || '')
    .split('|')
    .map((key) => key.replace(/\\n/g, '\n').trim())
    .filter(Boolean),
  mayaWebhookSecret: process.env.MAYA_WEBHOOK_SECRET || '',

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  aiTimeoutMs: int(process.env.AI_TIMEOUT_MS, 15000),

  shippingFeeCentavos: int(process.env.SHIPPING_FEE_CENTAVOS, 5000),
  studentDiscountPercent: int(process.env.STUDENT_DISCOUNT_PERCENT, 5),
  orderExpiryMinutes: int(process.env.ORDER_EXPIRY_MINUTES, 60),
};
