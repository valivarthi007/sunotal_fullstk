import { Pool } from 'pg';

let pool: Pool | null = null;

export interface PgDbConnectOptions {
  connectionString?: string;
  serviceName?: string;
}

export function getPgPool(options: PgDbConnectOptions = {}): Pool {
  const {
    connectionString = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal',
    serviceName = 'Microservice'
  } = options;

  if (!pool) {
    const isRds = connectionString.includes('amazonaws.com') || connectionString.includes('rds') || connectionString.includes('sslmode=');
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isRds ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error(`❌ [${serviceName}] PostgreSQL Pool Error:`, err);
    });

    console.log(`🐘 [${serviceName}] PostgreSQL Connection Pool Initialized (max: 5)`);
  }

  return pool;
}
