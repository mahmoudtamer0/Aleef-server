import mongoose from "mongoose";

const DB_URL = process.env["DB_URL"];

if (!DB_URL) {
    throw new Error("❌ DB_URL is not defined");
}


let cached = (global as any).mongoose || { conn: null, promise: null };
(global as any).mongoose = cached;


export const connectDB = async () => {
    console.log("👉 connectDB called");

    if (cached.conn) {
        console.log("✅ Connection exists (using cached)");
        return cached.conn;
    }

    console.log("⚡ Creating new connection...");



    if (!cached.promise) {
        cached.promise = mongoose.connect(DB_URL, {
            maxPoolSize: 3,
            serverSelectionTimeoutMS: 5000,
        });
        console.log("mongoose.connect");
    }

    cached.conn = await cached.promise;
    return cached.conn;
};