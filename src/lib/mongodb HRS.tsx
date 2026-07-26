import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
export const DATABASE_NAME = process.env.MONGODB_DB_NAME || "civic_leave_db";

// ============================================
// NATIVE DRIVER CLIENT (for existing code)
// ============================================
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// ============================================
// MONGOOSE CONNECTION (for Mongoose models)
// ============================================
let mongooseConnection: typeof mongoose | null = null;
let isMongooseConnected = false;

export async function connectToDatabase() {
  try {
    // 1. Connect native driver (for existing code)
    const nativeClient = await clientPromise;
    const db = nativeClient.db(DATABASE_NAME);
    await db.admin().ping();
    console.log("✅ MongoDB native driver connected");

    // 2. Connect Mongoose (if not already connected)
    if (!isMongooseConnected) {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri, {
          bufferCommands: true,
          maxPoolSize: 10,
        });
        isMongooseConnected = true;
        console.log("✅ Mongoose connected to civic_leave_db");
      } else {
        isMongooseConnected = true;
        console.log("✅ Mongoose already connected");
      }
    }

    return { client: nativeClient, db };
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

export default clientPromise;