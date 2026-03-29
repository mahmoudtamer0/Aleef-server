// api/index.ts
import app from "../app";
import { connectDB } from "../utils/db";

export default async function handler(req: any, res: any) {
    await connectDB(); // ← الـ caching هيشتغل هنا
    return app(req, res);
}