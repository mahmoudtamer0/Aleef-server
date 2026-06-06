import { Pool } from "pg";
import 'dotenv/config';

const dbUrl = process.env["DATABASE_URL"];
if (!dbUrl) throw new Error("SQL_DB_URL is not defined");

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 15,
    min: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000,
});



pool.on("error", (err: any) => {
    console.error("Unexpected DB error", err);
});

export default pool;