import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as schema from '../schema/index.js';

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

// Re-export schema tables so routes can import from one place
export { schema };
export * from '../schema/index.js';

export async function initDatabase() {
  try {
    console.log('🔄 Initializing database tables and default data...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        phone TEXT,
        city TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_definitions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        original_price REAL NOT NULL,
        discount_percentage INTEGER NOT NULL DEFAULT 0,
        image TEXT NOT NULL,
        badge TEXT,
        organic BOOLEAN NOT NULL DEFAULT FALSE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        location TEXT NOT NULL,
        produce TEXT NOT NULL,
        email TEXT,
        farm_size TEXT,
        aadhar TEXT,
        gstin TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendor_quotations (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        aadhar TEXT NOT NULL,
        gstin TEXT,
        category TEXT NOT NULL,
        produce TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        quotation_id INTEGER NOT NULL REFERENCES vendor_quotations(id) ON DELETE CASCADE,
        invoice_number TEXT NOT NULL,
        s3_url TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'out_of_stock',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT NOT NULL,
        link_url TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_name TEXT;

      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_number TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS branch_name TEXT;
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

      ALTER TABLE vendor_quotations ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Quintal';

      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_id TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        sender_phone TEXT,
        category TEXT NOT NULL,
        order_id TEXT,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        resolution TEXT,
        resolved_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default admin user ONLY (password: admin123 or admin)
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, active, phone, city)
      VALUES ('Admin User', 'admin@sunotal.com', $1, 'admin', true, '+91 98765 00001', 'Hyderabad')
      ON CONFLICT (email) DO UPDATE SET active = true, role = 'admin';
    `, [adminHash]);

    // Seed categories if empty
    const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO categories (name, icon) VALUES
        ('Vegetables', '🥕'),
        ('Fruits', '🍎'),
        ('Grains', '🌾'),
        ('Dairy', '🥛'),
        ('Herbs & Spices', '🌿')
        ON CONFLICT (name) DO NOTHING;
      `);
    }

    // Seed product definitions if empty
    const defCheck = await pool.query('SELECT COUNT(*) FROM product_definitions');
    if (parseInt(defCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO product_definitions (name, category) VALUES
        ('Desi Tomato', 'Vegetables'),
        ('Hybrid Tomato', 'Vegetables'),
        ('Red Onion', 'Vegetables'),
        ('White Potato', 'Vegetables'),
        ('Shimla Apple', 'Fruits'),
        ('Robusta Banana', 'Fruits'),
        ('Alphonso Mango', 'Fruits'),
        ('Sharbati Wheat', 'Grains'),
        ('Sona Masoori Rice', 'Grains'),
        ('Organic A2 Milk', 'Dairy'),
        ('Fresh Farm Paneer', 'Dairy'),
        ('Organic Turmeric', 'Herbs & Spices')
        ON CONFLICT (name) DO NOTHING;
      `);
    }

    // Seed banners if empty
    const bannerCheck = await pool.query('SELECT COUNT(*) FROM banners');
    if (parseInt(bannerCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO banners (title, subtitle, image_url, link_url, active) VALUES
        ('Direct from Indian Farmers', '100% Organic & Naturally Grown Produce', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', '/products', true),
        ('Fresh Harvest of the Season', 'Delivered within 24 hours of plucking', 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80', '/products', true);
      `);
    }

    console.log('✅ Database initialized successfully with all tables and seed records.');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}
