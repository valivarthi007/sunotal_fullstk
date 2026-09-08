import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool } from './lib/db.js';
import { usersTable } from './schema/users.js';

async function seed() {
  console.log('🌱 Initializing Sunotal database with admin superuser...');

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Initial Super Admin Account Only
    console.log('Seeding initial admin account (admin@sunotal.com)...');
    await db.insert(usersTable).values([
      { name: 'Admin User', email: 'admin@sunotal.com', passwordHash, role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' }
    ]).onConflictDoUpdate({ target: usersTable.email, set: { passwordHash } });

    console.log('✅ Admin user database seed completed successfully!');
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
  } finally {
    await pool.end();
  }
}

seed();

