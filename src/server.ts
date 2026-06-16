import app from "./app";
import 'dotenv/config';
import http from "http";
import { initSocket } from "./sockets/socket";
import pool from "./db";
const server = http.createServer(app);

initSocket(server);

const PORT = process.env["PORT"] || 3000;

// server.ts
pool.connect()
    .then(client => {
        client.release();
        console.log("✅ PostgreSQL Connected");

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ PostgreSQL connection failed:", err);
        process.exit(1);
    });

if (process.env["NODE_ENV"] === "production") {
    setInterval(() => {
        pool.query("SELECT 1").catch(console.error);
    }, 3 * 60 * 1000);
}