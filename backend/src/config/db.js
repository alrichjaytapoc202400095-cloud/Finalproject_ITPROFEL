// SINGLETON: one shared MongoDB connection for the whole process.
// Every service imports this module instead of creating its own connection.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const env = require('./env');

let connectionPromise = null; // module-level cache = single instance
let memoryServer = null;

async function connect(uriOverride) {
  if (connectionPromise) return connectionPromise;
  mongoose.set('strictQuery', true);

  const uri = uriOverride || env.mongoUri;
  if (!uri) {
    try {
      memoryServer = await MongoMemoryServer.create();
    } catch (error) {
      throw new Error(
        'MONGO_URI is not configured and MongoDB is not available locally. Set MONGO_URI or start MongoDB.'
      );
    }
  }

  connectionPromise = mongoose.connect((uriOverride || uri || memoryServer.getUri()), {
    dbName: env.dbName,
    serverSelectionTimeoutMS: 8000,
  });
  return connectionPromise;
}

async function disconnect() {
  connectionPromise = null;
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

// True when connect() started a temporary in-memory database (MONGO_URI unset).
// The server uses this to seed demo data automatically on each cold start.
function isMemoryServer() {
  return Boolean(memoryServer);
}

module.exports = { connect, disconnect, isMemoryServer, mongoose };
