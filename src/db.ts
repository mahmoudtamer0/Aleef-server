import { Pool } from "pg";
import 'dotenv/config';

const dbUrl = process.env["SQL_DB_URL"];
if (!dbUrl) throw new Error("SQL_DB_URL is not defined");

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 30,
    min: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000,
});

setInterval(async () => {
    await pool.query("SELECT 1");
}, 1 * 60 * 1000);

pool.on("error", (err: any) => {
    console.error("Unexpected DB error", err);
});

export default pool;