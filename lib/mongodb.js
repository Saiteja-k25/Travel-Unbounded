import mongoose from "mongoose";

// Serverless platforms like Vercel can start many instances of our API route,
// and in development Next.js reloads modules on every save. Without caching we
// would open a brand new database connection each time and quickly exhaust the
// Atlas connection limit.
//
// So we stash the connection (and the in-flight promise) on globalThis, which
// survives module reloads, and reuse it.

const MONGODB_URI = process.env.MONGODB_URI;

let cached = globalThis._mongooseCache;

if (!cached) {
  cached = globalThis._mongooseCache = { connection: null, promise: null };
}

export default async function connectToDatabase() {
  // Checked here rather than at import time so a missing variable surfaces as a
  // handled 500 from the API route instead of crashing the whole build.
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined. Add it to .env.local.");
  }

  // Already connected: reuse it.
  if (cached.connection) {
    return cached.connection;
  }

  // A connection is being established: wait for that same promise instead of
  // starting a second one.
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((mongooseInstance) => mongooseInstance.connection);
  }

  try {
    cached.connection = await cached.promise;
  } catch (error) {
    // Clear the failed promise so the next request can retry.
    cached.promise = null;
    throw error;
  }

  return cached.connection;
}
