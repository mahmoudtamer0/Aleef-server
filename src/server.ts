import app from "./app";
import 'dotenv/config';
import http from "http";
import { initSocket } from "./sockets/socket";
import pool from "./db";
const server = http.createServer(app);

initSocket(server);

const PORT = process.env["PORT"] || 3000;

pool.connect()
    .then(client => {
        client.release();
        if (process.env["NODE_ENV"] === "production") {
            pool.query("SELECT 1").then(() => {
                console.log("✅ PostgreSQL warmed up");
            });
        }

        console.log("✅ PostgreSQL Connected");
    })
    .catch(err => {
        console.error("❌ PostgreSQL connection failed:", err);
        process.exit(1);
    });

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


setInterval(async () => {
    pool.query("SELECT 1").then(() => {
        console.log("✅ PostgreSQL warmed up");
    });
}, 4 * 60 * 1000);
