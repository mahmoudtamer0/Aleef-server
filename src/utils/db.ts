import mongoose from "mongoose";

const DB_URL = process.env["DB_URL"];

if (!DB_URL) {
    throw new Error("❌ DB_URL is not defined");
}


let cached = (global as any).mongoose || { conn: null, promise: null };
(global as any).mongoose = cached;


export const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(DB_URL, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};