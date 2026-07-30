import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool } from './lib/db.js';
import { usersTable } from './schema/users.js';
import { vendorsTable } from './schema/vendors.js';

async function seed() {
  console.log('🌱 Seeding database with clean initial configuration...');

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Initial Admin Account
    console.log('Seeding initial admin account...');
    await db.insert(usersTable).values([
      { name: 'Admin User', email: 'admin@sunotal.com', passwordHash, role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' }
    ]).onConflictDoUpdate({ target: usersTable.email, set: { passwordHash } });

    console.log('✅ Clean database seeding completed! (Products & Grievances left empty for user dynamic entry)');
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
  } finally {
    await pool.end();
  }
}

seed();
