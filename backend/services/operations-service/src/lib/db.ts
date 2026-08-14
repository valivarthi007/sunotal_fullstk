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
    `);

    // Seed default admin user (password: admin123 or admin)
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, active, phone, city)
      VALUES ('Admin User', 'admin@sunotal.com', $1, 'admin', true, '+91 98765 00001', 'Hyderabad')
      ON CONFLICT (email) DO UPDATE SET active = true, role = 'admin';
    `, [adminHash]);

    // Seed default farmer/vendor user (password: farmer123)
    const farmerHash = await bcrypt.hash('farmer123', 10);
    const farmerRes = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, active, phone, city)
      VALUES ('Ramesh Kumar', 'farmer@sunotal.com', $1, 'vendor', true, '+91 98765 43210', 'Telangana')
      ON CONFLICT (email) DO UPDATE SET active = true, role = 'vendor'
      RETURNING id;
    `, [farmerHash]);

    if (farmerRes.rows.length > 0) {
      const farmerUserId = farmerRes.rows[0].id;
      const vCheck = await pool.query('SELECT id FROM vendors WHERE user_id = $1 OR email = $2', [farmerUserId, 'farmer@sunotal.com']);
      if (vCheck.rows.length === 0) {
        await pool.query(`
          INSERT INTO vendors (user_id, first_name, last_name, phone, location, produce, email, farm_size, aadhar, status, notes)
          VALUES ($1, 'Ramesh', 'Kumar', '+91 98765 43210', 'Telangana', 'Vegetables', 'farmer@sunotal.com', '5 Acres', '123456789012', 'approved', 'Verified Organic Farmer');
        `, [farmerUserId]);
      }
    }

    // Seed default customer user (password: user123)
    const userHash = await bcrypt.hash('user123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, active, phone, city)
      VALUES ('John Doe', 'user@sunotal.com', $1, 'user', true, '+91 98765 11111', 'Bangalore')
      ON CONFLICT (email) DO UPDATE SET active = true;
    `, [userHash]);

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

    // Seed sample products if empty
    const prodCheck = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO products (name, category, unit, price, original_price, discount_percentage, image, organic, active, description) VALUES
        ('Organic Desi Tomatoes', 'Vegetables', '1 kg', 40, 50, 20, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', true, true, 'Farm fresh naturally grown tomatoes'),
        ('Fresh Red Onions', 'Vegetables', '1 kg', 35, 45, 22, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80', false, true, 'Crisp farm onions from Maharashtra'),
        ('Royal Gala Apples', 'Fruits', '1 kg', 160, 200, 20, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80', true, true, 'Fresh mountain apples from Himachal Pradesh'),
        ('Organic Farm Milk', 'Dairy', '1 L', 65, 75, 13, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', true, true, 'Pure farm fresh raw milk')
      `);
    }

    // Seed banners if empty
    const bannerCheck = await pool.query('SELECT COUNT(*) FROM banners');
    if (parseInt(bannerCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO banners (title, subtitle, image_url, link_url, active) VALUES
        ('Direct from Indian Farmers', '100% Organic & Naturally Grown Produce', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', '/products', true),
        ('Fresh Harvest of the Season', 'Delivered within 24 hours of plucking', 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80', '/products', true)
    // Clean up any legacy direct S3 URLs that return 403 Forbidden
    await pool.query(`
      UPDATE products SET image = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80' WHERE image LIKE '%tomatoes.jpg%' OR (image LIKE '%s3.us-east-1.amazonaws.com%' AND category = 'Vegetables');
      UPDATE products SET image = 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80' WHERE image LIKE '%mangoes.jpg%' OR image LIKE '%apples.jpg%' OR (image LIKE '%s3.us-east-1.amazonaws.com%' AND category = 'Fruits');
      UPDATE products SET image = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80' WHERE image LIKE '%milk.jpg%' OR (image LIKE '%s3.us-east-1.amazonaws.com%' AND category = 'Dairy');
      UPDATE products SET image = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' WHERE image LIKE '%rice.jpg%' OR image LIKE '%grains.jpg%' OR (image LIKE '%s3.us-east-1.amazonaws.com%' AND category = 'Grains');
      UPDATE products SET image = 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?auto=format&fit=crop&w=600&q=80' WHERE image LIKE '%cashews.jpg%' OR image LIKE '%dry-fruits.jpg%' OR (image LIKE '%s3.us-east-1.amazonaws.com%' AND category = 'Dry Fruits');
      UPDATE products SET image = 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80' WHERE image LIKE '%vegetables.jpg%';
    `);

    console.log('✅ Database initialized successfully with all tables and seed records.');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
}
