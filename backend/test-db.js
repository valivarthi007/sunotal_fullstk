import pg from 'pg';
import 'dotenv/config';

console.log("Starting test-db.js...");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Force a 3-second timeout
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000, 
});

async function run() {
  try {
    console.log("Attempting database connection...");
    await client.connect();
    console.log("✅ SUCCESS: Connected!");
    const res = await client.query('SELECT NOW()');
    console.log("Time:", res.rows[0].now);
  } catch (err) {
    console.error("❌ FAILED WITH ERROR:");
    console.error(err.message || err);
  } finally {
    await client.end();
    console.log("Script finished.");
  }
}

run();