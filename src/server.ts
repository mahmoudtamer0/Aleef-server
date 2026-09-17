import app from "./app";
import 'dotenv/config';
import http from "http";
import { initSocket } from "./sockets/socket";
import pool from "./db";
const server = http.createServer(app);

process.on("uncaughtException", (err) => {
    console.error("❌ UNCAUGHT EXCEPTION:", err);

    gracefulShutdown();
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ UNHANDLED REJECTION:", reason);

    gracefulShutdown();
});

initSocket(server);

const PORT = process.env["PORT"] || 3000;

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


let isShuttingDown = false;

const gracefulShutdown = () => {
    if (isShuttingDown) return;

    isShuttingDown = true;

    console.error("⚠️ Shutting down server gracefully...");

    server.close(() => {
        console.log("HTTP server closed");

        pool.end()
            .then(() => {
                console.log("PostgreSQL pool closed");
                process.exit(1);
            })
            .catch((err) => {
                console.error("Error closing PostgreSQL pool:", err);
                process.exit(1);
            });
    });

    setTimeout(() => {
        console.error("Forced shutdown");

        process.exit(1);
    }, 10000).unref();
};