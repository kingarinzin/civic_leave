import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI!;
export const DATABASE_NAME = process.env.MONGODB_DB_NAME || "civic_leave_db";

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

// ---------- Mongoose connection state ----------
let isMongooseConnected = false;

export async function connectToDatabase() {
  try {
    // 1. Native driver connection
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    await db.admin().ping();
    console.log("✅ MongoDB native driver connected");

    // 2. Mongoose connection
    if (!isMongooseConnected) {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri, {
          bufferCommands: true,
          maxPoolSize: 10,
        });
        isMongooseConnected = true;
        console.log("✅ Mongoose connected");
      } else {
        isMongooseConnected = true;
        console.log("✅ Mongoose already connected");
      }
    }

    return { client, db };
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

// ---------- Default export for existing code ----------
export default clientPromise;