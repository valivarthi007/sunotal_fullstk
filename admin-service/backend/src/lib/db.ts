import pg from 'pg';

const { Pool } = pg;
let pool: any = null;

export interface PgDbConnectOptions {
  connectionString?: string;
  serviceName?: string;
}

export function getPgPool(options: PgDbConnectOptions = {}): any {
  const {
    connectionString = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal',
    serviceName = 'Microservice'
  } = options;

  if (!pool) {
    try {
      const isRds = connectionString.includes('amazonaws.com') || connectionString.includes('rds') || connectionString.includes('sslmode=');
      pool = new Pool({
        connectionString,
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: isRds ? { rejectUnauthorized: false } : undefined,
      });
      pool.on('error', (err: any) => {
        console.error(`❌ [${serviceName}] PostgreSQL Pool Error:`, err);
      });
    } catch (err: any) {
      console.error(`❌ [${serviceName}] PostgreSQL Connection Initialization Failed:`, err);
      pool = { query: async () => ({ rows: [] }), on: () => {} };
    }
    console.log(`🐘 [${serviceName}] PostgreSQL Connection Pool Initialized (max: 50)`);
  }

  return pool;
}
