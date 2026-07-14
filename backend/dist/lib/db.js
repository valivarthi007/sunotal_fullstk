import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../schema/index.js';
const { Pool } = pg;
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
}
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
// Re-export schema tables so routes can import from one place
export { schema };
export * from '../schema/index.js';
