import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../../../src/schema/index.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined
});

export const db = drizzle(pool, { schema });
export { schema };
export * from '../../../src/schema/index.js';
