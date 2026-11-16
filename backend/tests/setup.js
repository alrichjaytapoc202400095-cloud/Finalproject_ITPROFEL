// Jest setup (runs before any test module). Test-only secrets; never real ones.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-unit-tests-only';
process.env.TOKEN_TTL_HOURS = '2';
process.env.PAYMENT_PROVIDER = 'paymongo';
process.env.PAYMONGO_SECRET_KEY = 'sk_test_dummy';
process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_test';
process.env.MONGO_DB_NAME = 'spcbookstore_test';
process.env.GEMINI_API_KEY = ''; // forces the documented AI fallback path
process.env.SHIPPING_FEE_CENTAVOS = '5000';
process.env.STUDENT_DISCOUNT_PERCENT = '5';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.FRONTEND_URL = 'http://localhost:5173';
