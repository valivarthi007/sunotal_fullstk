import pg from 'pg';
let pool = null;
export function getPgPool(options = {}) {
    const { connectionString = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal', serviceName = 'Microservice' } = options;
    if (!pool) {
        try {
            const { Pool } = pg;
            const isRds = connectionString.includes('amazonaws.com') || connectionString.includes('rds') || connectionString.includes('sslmode=');
            pool = new Pool({
                connectionString,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
                ssl: isRds ? { rejectUnauthorized: false } : undefined,
            });
            pool.on('error', (err) => {
                console.error(`❌ [${serviceName}] PostgreSQL Pool Error:`, err);
            });
            console.log(`🐘 [${serviceName}] PostgreSQL Connection Pool Initialized (max: 20)`);
        }
        catch (err) {
            console.error(`⚠️ [${serviceName}] PostgreSQL Pool Init Failed:`, err?.message || err);
            pool = { query: async () => ({ rows: [] }), on: () => { } };
        }
    }
    return pool;
}
