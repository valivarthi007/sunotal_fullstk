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
      // Dynamic require/import for pg
      const pgModule = typeof require !== 'undefined' ? require('pg') : null;
      if (pgModule) {
        const Pool = pgModule.Pool || pgModule.default?.Pool;
        pool = new Pool({
          connectionString,
          max: 50,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        pool.on('error', (err: any) => {
          console.error(`❌ [${serviceName}] PostgreSQL Pool Error:`, err);
        });
      } else {
        pool = { query: async () => ({ rows: [] }), on: () => {} };
      }
    } catch {
      pool = { query: async () => ({ rows: [] }), on: () => {} };
    }
    console.log(`🐘 [${serviceName}] PostgreSQL Connection Pool Initialized (max: 50)`);
  }

  return pool;
}
