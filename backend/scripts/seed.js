// Seed script (L1-13): one command creates realistic data; re-running is safe (upserts).
//   npm run seed        -> upsert demo data
//   npm run seed:reset  -> wipe ALL collections in this database, then seed
// It only ever touches the database named in MONGO_DB_NAME (never production data).
const db = require('../src/config/db');
const { seedDemoData, resetDatabase } = require('../src/seed/demoSeed');
const logger = require('../src/utils/logger');

async function main() {
  const reset = process.argv.includes('--reset');
  await db.connect();

  if (reset) {
    logger.warn('Resetting: dropping ALL collections in the configured database...');
    await resetDatabase();
    logger.info('Reset complete.');
  }

  const counts = await seedDemoData();
  logger.info(`Seed OK: ${counts.categories} categories, ${counts.products} products, ${counts.coupons} coupons, ${counts.slots} pickup slots`);
  logger.info('Demo accounts -> admin: admin@spc.edu / Admin#1234 | verified student: juan@spc.edu / Juan#1234 | customer: maria@spc.edu / Maria#1234');
  await db.disconnect();
}

main().catch((e) => {
  logger.error('Seed failed:', e);
  process.exit(1);
});
