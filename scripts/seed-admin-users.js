const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';
const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: isRds ? { rejectUnauthorized: false } : undefined,
});

const seedUsers = [
  { name: 'System Admin', email: 'admin@sunotal.com', pass: 'admin123', role: 'admin', phone: '9063636167', city: 'Vijayawada' },
  { name: 'System Admin (Cloud)', email: 'admin@automateuniverse.space', pass: 'admin123', role: 'admin', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Support Specialist', email: 'support@sunotal.com', pass: 'support123', role: 'admin', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Support Specialist (Cloud)', email: 'support@automateuniverse.space', pass: 'support123', role: 'admin', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Monitoring Specialist', email: 'monitoring@sunotal.com', pass: 'monitoring123', role: 'admin', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Monitoring Specialist (Cloud)', email: 'monitoring@automateuniverse.space', pass: 'monitoring123', role: 'admin', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Customer Account', email: 'user@sunotal.com', pass: 'user123', role: 'customer', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Fresh Produce Vendor', email: 'vendor@sunotal.com', pass: 'vendor123', role: 'vendor', phone: '9063636167', city: 'Vijayawada' },
  { name: 'Delivery Partner', email: 'rider@sunotal.com', pass: 'rider123', role: 'rider', phone: '9063636167', city: 'Vijayawada' },
];

async function seed() {
  console.log(`🌱 Connecting to PostgreSQL at ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}...`);
  let client;
  try {
    client = await pool.connect();

    // Ensure users table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        active BOOLEAN DEFAULT TRUE,
        phone VARCHAR(50),
        city VARCHAR(100),
        wallet_balance NUMERIC(12, 2) DEFAULT 500.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('🔑 Seeding user credentials with Phone: 9063636167 & Location: Vijayawada...');
    for (const u of seedUsers) {
      const hash = await bcrypt.hash(u.pass, 10);
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
         VALUES ($1, $2, $3, $4, true, $5, $6, 1000.00)
         ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, phone = EXCLUDED.phone, city = EXCLUDED.city, active = true
         RETURNING id, name, email, role, phone, city;`,
        [u.name, u.email.toLowerCase(), hash, u.role, u.phone, u.city]
      );
      const row = res.rows[0];
      console.log(`  ✅ User Seeded: ID #${row.id} | ${row.email} | Phone: ${row.phone} | City: ${row.city} | Role: ${row.role} | Pass: ${u.pass}`);
    }

    console.log('\n🎉 Database admin & service credential seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('⚠️ DB Seed Notice:', err.message || err);
    process.exit(0);
  } finally {
    if (client) client.release();
    pool.end();
  }
}

seed();
