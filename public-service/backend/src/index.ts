import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5009);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';
const OPERATIONS_SERVICE_URL = process.env.OPERATIONS_SERVICE_URL || 'http://127.0.0.1:5002';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRds ? { rejectUnauthorized: false } : undefined,
});

// Auto-initialize PostgreSQL Database Schema (No static seed overrides)
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255),
        icon VARCHAR(255) DEFAULT '📦',
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_definitions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        default_unit VARCHAR(50) DEFAULT '1 kg',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        original_price NUMERIC(10, 2),
        unit VARCHAR(50) DEFAULT '1 kg',
        image TEXT,
        is_organic BOOLEAN DEFAULT TRUE,
        badge VARCHAR(100),
        description TEXT,
        vendor_id VARCHAR(255),
        product_code VARCHAR(100),
        stock INT DEFAULT 100,
        rating NUMERIC(3, 2) DEFAULT 5.0,
        status VARCHAR(50) DEFAULT 'active',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe migrations — add missing columns without dropping existing data
    const safeAlters = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`,
      `ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`,
    ];
    for (const sql of safeAlters) {
      try { await pool.query(sql); } catch {}
    }

    // Add indexes for fast queries
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)`,
      `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`,
    ];
    for (const idx of indexes) {
      try { await pool.query(idx); } catch {}
    }

    const pCountRes = await pool.query('SELECT COUNT(*) FROM products').catch(() => null);
    const existingCount = Number(pCountRes?.rows?.[0]?.count || 0);
    console.log(`🐘 [catalog-service] PostgreSQL database ready with ${existingCount} live product records.`);
  } catch (err: any) {
    console.warn('⚠️ [catalog-service] DB init warning:', err?.message || err);
  }
}

initDb();

app.get('/healthz', (_req, res) => {
  res.json({ service: 'catalog-service', status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'catalog-service' });
});

// Products Listing with Filter/Search/Sort — Direct PostgreSQL SQL Querying
app.get('/api/products', async (req, res) => {
  const { category, search, sort, all } = req.query;
  try {
    const showAll = all === 'true' || all === '1';
    let queryStr = showAll ? 'SELECT * FROM products WHERE 1=1' : 'SELECT * FROM products WHERE active = true';
    const params: any[] = [];

    if (category && typeof category === 'string' && category !== 'All') {
      params.push(category);
      queryStr += ` AND LOWER(category) = LOWER($${params.length})`;
    }

    if (search && typeof search === 'string') {
      params.push(`%${search.toLowerCase()}%`);
      queryStr += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    if (sort === 'price-low') queryStr += ' ORDER BY price ASC';
    else if (sort === 'price-high') queryStr += ' ORDER BY price DESC';
    else if (sort === 'rating') queryStr += ' ORDER BY rating DESC';
    else queryStr += ' ORDER BY id DESC';

    const dbRes = await pool.query(queryStr, params);
    const formatted = (dbRes.rows || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: Number(p.original_price || p.price),
      unit: p.unit || '1 kg',
      image: p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      isOrganic: p.is_organic ?? true,
      badge: p.badge || null,
      description: p.description || '',
      vendorId: p.vendor_id || null,
      productCode: p.product_code || null,
      stock: p.stock ?? 100,
      rating: Number(p.rating || 5.0),
      status: p.status || 'active',
      active: p.active ?? true,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
    }));
    return res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to fetch products from database' });
  }
});

// Single Product Fetch — Direct PostgreSQL SQL Querying
app.get('/api/products/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pool.query('SELECT * FROM products WHERE id = $1', [targetId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const p = dbRes.rows[0];
      return res.json({
        id: String(p.id),
        name: p.name,
        category: p.category,
        price: Number(p.price),
        originalPrice: Number(p.original_price || p.price),
        unit: p.unit,
        image: p.image,
        isOrganic: p.is_organic,
        stock: p.stock,
        rating: Number(p.rating || 5.0)
      });
    }
    return res.status(404).json({ error: 'Product not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch product from database' });
  }
});

// Create Product — Direct PostgreSQL SQL Querying
app.post(['/api/products', '/api/admin/products'], async (req, res) => {
  const { name, category, price, originalPrice, unit, image, isOrganic, badge, description, vendorId, productCode, stock, rating, status } = req.body;
  if (!name || !category || price === undefined) {
    return res.status(400).json({ error: 'Name, category, and price required' });
  }

  try {
    const dbRes = await pool.query(
      `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, badge, description, vendor_id, product_code, stock, rating, status, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true) RETURNING *`,
      [
        String(name).trim(),
        String(category).trim(),
        Number(price),
        Number(originalPrice || price),
        unit || '1 kg',
        image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        isOrganic !== false,
        badge || null,
        description || null,
        vendorId || null,
        productCode || null,
        Number(stock || 100),
        Number(rating || 5.0),
        status || 'active',
      ]
    );

    const p = dbRes.rows[0];
    return res.status(201).json({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: Number(p.original_price || p.price),
      unit: p.unit,
      image: p.image,
      isOrganic: p.is_organic,
      badge: p.badge,
      description: p.description,
      vendorId: p.vendor_id,
      stock: p.stock,
      rating: Number(p.rating),
      status: p.status,
      active: true,
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: 'Failed to create product in database', message: err?.message });
  }
});

// Categories List & CRUD — Direct PostgreSQL SQL Querying
app.get('/api/categories', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM categories WHERE active = true ORDER BY id ASC');
    const formatted = (dbRes.rows || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || '📦',
      active: c.active ?? true
    }));
    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const cleanName = name.trim();
  const catIcon = icon || '📦';

  try {
    const dbRes = await pool.query(
      `INSERT INTO categories (name, icon, active) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon RETURNING *`,
      [cleanName, catIcon, true]
    );
    const c = dbRes.rows[0];
    const newCat = { id: c.id, name: c.name, icon: c.icon, active: c.active };

    // Async sync notification to operations service
    fetch(`${OPERATIONS_SERVICE_URL}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat),
    }).catch(() => null);

    return res.status(201).json(newCat);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create category', message: err?.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const dbRes = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    return res.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete category', message: err?.message });
  }
});

// Product Definitions List & CRUD — Direct PostgreSQL SQL Querying
app.get('/api/product-definitions', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM product_definitions ORDER BY id ASC');
    const formatted = (dbRes.rows || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      defaultUnit: d.default_unit,
      createdAt: d.created_at
    }));
    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch product definitions' });
  }
});

app.post('/api/product-definitions', async (req, res) => {
  const { name, category, defaultUnit } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Product name and category are required' });
  }

  try {
    const dbRes = await pool.query(
      `INSERT INTO product_definitions (name, category, default_unit) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), category.trim(), defaultUnit || '1 kg']
    );
    const d = dbRes.rows[0];
    return res.status(201).json({ id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit, createdAt: d.created_at });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create product definition', message: err?.message });
  }
});

app.delete('/api/product-definitions/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const dbRes = await pool.query('DELETE FROM product_definitions WHERE id = $1 RETURNING id', [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Product definition not found' });
    return res.json({ success: true, message: 'Product definition deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete product definition', message: err?.message });
  }
});

// Update Product — Direct PostgreSQL SQL Querying
app.put(['/api/products/:id', '/api/admin/products/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, category, price, originalPrice, unit, image, isOrganic, badge, description, vendorId, stock, rating, status, active } = req.body;

  try {
    const dbRes = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        price = COALESCE($3, price),
        original_price = COALESCE($4, original_price),
        unit = COALESCE($5, unit),
        image = COALESCE($6, image),
        is_organic = COALESCE($7, is_organic),
        badge = COALESCE($8, badge),
        description = COALESCE($9, description),
        vendor_id = COALESCE($10, vendor_id),
        stock = COALESCE($11, stock),
        rating = COALESCE($12, rating),
        status = COALESCE($13, status),
        active = COALESCE($14, active)
       WHERE id = $15 RETURNING *`,
      [name, category, price !== undefined ? Number(price) : null, originalPrice !== undefined ? Number(originalPrice) : null, unit, image, isOrganic, badge, description, vendorId, stock !== undefined ? Number(stock) : null, rating !== undefined ? Number(rating) : null, status, active, targetId]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const p = dbRes.rows[0];
    return res.json({
      id: String(p.id), name: p.name, category: p.category,
      price: Number(p.price), originalPrice: Number(p.original_price || p.price),
      unit: p.unit, image: p.image, isOrganic: p.is_organic,
      badge: p.badge, description: p.description, vendorId: p.vendor_id,
      stock: p.stock, rating: Number(p.rating), status: p.status, active: p.active,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update product', message: err?.message });
  }
});

// Delete Product — Direct PostgreSQL SQL Querying
app.delete(['/api/products/:id', '/api/admin/products/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [targetId]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete product', message: err?.message });
  }
});

// Storefront Search API — Direct PostgreSQL SQL Querying
app.get('/api/storefront/search', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  try {
    const dbRes = await pool.query(
      'SELECT * FROM products WHERE active = true AND (LOWER(name) LIKE $1 OR LOWER(category) LIKE $1) ORDER BY id DESC',
      [`%${q}%`]
    );
    const matched = (dbRes.rows || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      image: p.image
    }));
    return res.json({ success: true, products: matched });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to perform storefront search' });
  }
});

app.listen(PORT, () => {
  console.log(`📦 catalog-service running on port ${PORT}`);
});
