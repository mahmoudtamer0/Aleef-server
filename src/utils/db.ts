import mongoose from "mongoose";

const DB_URL = process.env["DB_URL"] as string;

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = {
        conn: null,
        promise: null,
    };
}

export const connectDB = async () => {
    if (cached.conn) {
        console.log("♻️ Using cached MongoDB connection");
        return cached.conn;
    }

    console.log("🚀 Creating NEW MongoDB connection");

    if (!cached.promise) {
        cached.promise = mongoose.connect(DB_URL).then((mongoose) => mongoose);
    }

    cached.conn = await cached.promise;
    return cached.conn;
};