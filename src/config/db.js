import mongoose from "mongoose";

let memoryServer = null;

const shouldUseMemoryDb = () =>
  process.env.USE_MEMORY_DB === "true" ||
  (process.env.NODE_ENV === "test" && !process.env.MONGO_URI);

const shouldFallbackToMemoryDb = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.MONGO_FALLBACK_TO_MEMORY !== "false";

const createMemoryMongoUri = async () => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = memoryServer || (await MongoMemoryServer.create());
  return memoryServer.getUri();
};

const getMongoUri = async () => {
  if (shouldUseMemoryDb()) return createMemoryMongoUri();

  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  if (process.env.NODE_ENV === "production") {
    throw new Error("MONGO_URI is required in production.");
  }

  return "mongodb://127.0.0.1:27017/tu-profesor-turnos";
};

const getConnectionOptions = () => ({
  serverSelectionTimeoutMS: Number(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000,
  ),
});

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  try {
    const mongoUri = await getMongoUri();
    const conn = await mongoose.connect(mongoUri, getConnectionOptions());
    console.log(`DATABASE: MongoDB connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`DATABASE ERROR: ${error.message}`);

    if (!shouldUseMemoryDb() && shouldFallbackToMemoryDb()) {
      console.warn(
        "DATABASE: Falling back to in-memory MongoDB for development. Data will reset when the server stops.",
      );

      await mongoose.disconnect().catch(() => {});
      const fallbackUri = await createMemoryMongoUri();
      const conn = await mongoose.connect(fallbackUri, getConnectionOptions());
      console.log(`DATABASE: MongoDB memory connected: ${conn.connection.host}`);
      return conn.connection;
    }

    throw error;
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

export default connectDB;
