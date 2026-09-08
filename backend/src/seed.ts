import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool } from './lib/db.js';
import { usersTable } from './schema/users.js';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Truncating all existing data and initializing Sunotal superadmin...');

  try {
    // 1. Truncate/Clear all table data
    await db.execute(sql`
      TRUNCATE TABLE order_items, orders, invoices, inventory, vendor_quotations, vendors, products, categories, users CASCADE;
    `).catch(async () => {
      // Fallback if TRUNCATE fails on foreign keys
      await db.execute(sql`DELETE FROM order_items;`);
      await db.execute(sql`DELETE FROM orders;`);
      await db.execute(sql`DELETE FROM invoices;`);
      await db.execute(sql`DELETE FROM inventory;`);
      await db.execute(sql`DELETE FROM vendor_quotations;`);
      await db.execute(sql`DELETE FROM vendors;`);
      await db.execute(sql`DELETE FROM products;`);
      await db.execute(sql`DELETE FROM categories;`);
      await db.execute(sql`DELETE FROM users;`);
    });

    const passwordHash = await bcrypt.hash('admin123', 10);

    // Initial Super Admin Account Only
    console.log('Seeding initial admin account (admin@sunotal.com)...');
    await db.insert(usersTable).values([
      { name: 'Admin User', email: 'admin@sunotal.com', passwordHash, role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' }
    ]);

    console.log('✅ Database truncated. Admin superuser seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
  } finally {
    await pool.end();
  }
}

seed();


