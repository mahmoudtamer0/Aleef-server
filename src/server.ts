import mongoose from "mongoose";
import app from "./app";
import 'dotenv/config';
import http from "http";
import { initSocket } from "./sockets/socket";
import pool from "./db";
const server = http.createServer(app);

initSocket(server);

const dbUrl = process.env["DB_URL"];
if (!dbUrl) throw new Error("DB_URL is not defined");



const PORT = process.env["PORT"] || 3000;


Promise.all([
    mongoose.connect(dbUrl, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }),
    pool.connect().then(client => { client.release(); })
])
    .then(() => {
        console.log("✅ MongoDB Connected");
        console.log("✅ PostgreSQL Connected");
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => console.log(err));


if (process.env["NODE_ENV"] === "production") {
    setInterval(async () => {
        pool.query("SELECT 1").then(() => {
            console.log("✅ PostgreSQL warmed up");
        });
    }, 5 * 60 * 1000);
}


