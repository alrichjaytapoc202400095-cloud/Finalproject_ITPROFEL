// SPC Book Store - Express API entry point (layered MVC: routes -> controllers -> services -> models).
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const env = require('./src/config/env');
const db = require('./src/config/db');
const logger = require('./src/utils/logger');
const requestContext = require('./src/middleware/requestContext');
const { general } = require('./src/middleware/rateLimits');
const { notFound, errorHandler } = require('./src/middleware/errors');
const routes = require('./src/routes');
const webhookRouter = require('./src/routes/webhook');
const paymentService = require('./src/services/container').paymentService;
const subscribers = require('./src/patterns/observers/subscribers'); // Observer listeners registered at boot

const app = express();
app.set('trust proxy', 1); // behind Render/Vercel proxies
// Never answer API GETs with 304: our client expects a JSON body, and a cached
// empty 304 previously appeared as "Server unreachable." on the frontend.
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(helmet());

// CORS (S-09): only the origins listed in CORS_ORIGINS are allowed. No wildcard.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Webhook first (needs the raw body), then the JSON parser for everything else.
app.use('/api/v1', webhookRouter);
app.use(express.json({ limit: '100kb' }));

app.use(requestContext);
app.use(general);

// Health probe
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API v1
app.use('/api/v1', routes);

// Swagger UI (T-11) served from openapi.yaml
const specPath = path.join(__dirname, 'openapi.yaml');
const swaggerUi = require('swagger-ui-express');
let swaggerSpec = {};
if (fs.existsSync(specPath)) {
  swaggerSpec = yaml.parse(fs.readFileSync(specPath, 'utf8'));
}
// Raw spec for tooling (Postman/Insomnia). Register it BEFORE the UI so the
// swagger-ui middleware does not shadow it with the HTML index.
app.get('/api-docs/swagger.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'SPC Book Store API' }));

// 404 then central error handler (S-11)
app.use(notFound);
app.use(errorHandler);

// Expiry sweeper: turns stale pending_payment orders into expired + releases stock (L2-03/L2-07).
async function runExpirySweep() {
  try {
    const n = await paymentService.expireStaleOrders();
    if (n > 0) logger.info(`Expiry sweep: ${n} stale order(s) expired`);
  } catch (e) {
    logger.error(`Expiry sweep failed: ${e.message}`);
  }
}

async function start() {
  await db.connect();
  logger.info('MongoDB connected (Singleton db module)');

  // A temporary in-memory database starts empty on every boot. Seed the demo
  // catalog/accounts so the app is usable without a MongoDB install.
  if (db.isMemoryServer()) {
    try {
      const counts = await require('./src/seed/demoSeed').seedDemoData();
      logger.info(
        `In-memory database seeded: ${counts.categories} categories, ${counts.products} products. ` +
          'Demo accounts: admin@spc.edu / Admin#1234, juan@spc.edu / Juan#1234, maria@spc.edu / Maria#1234'
      );
    } catch (e) {
      logger.error(`In-memory auto-seed failed: ${e.message}`);
    }
  }

  await runExpirySweep();
  setInterval(runExpirySweep, 5 * 60 * 1000).unref();

  const server = app.listen(env.port, () => {
    logger.info(`SPC Book Store API listening on http://localhost:${env.port} (Swagger: /api-docs)`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
