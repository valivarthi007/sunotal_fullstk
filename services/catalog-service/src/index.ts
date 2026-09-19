import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5009);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';
const OPERATIONS_SERVICE_URL = process.env.OPERATIONS_SERVICE_URL || 'http://127.0.0.1:5002';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Vegetables", icon: "🥦", active: true },
  { id: 2, name: "Fruits", icon: "🍎", active: true },
  { id: 3, name: "Dairy", icon: "🥛", active: true },
  { id: 4, name: "Dry Fruits", icon: "🥜", active: true },
  { id: 5, name: "Grains", icon: "🌾", active: true },
  { id: 6, name: "Organic Herbs", icon: "🌿", active: true },
  { id: 7, name: "Cold Pressed Oils", icon: "🫒", active: true },
  { id: 8, name: "Fresh Bakery", icon: "🍞", active: true }
];

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Fresh Spinach", category: "Vegetables", price: 40, originalPrice: 50, unit: "1 kg", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", isOrganic: true, stock: 100, rating: 4.8, active: true },
  { id: 2, name: "Organic Tomatoes", category: "Vegetables", price: 35, originalPrice: 45, unit: "1 kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400", isOrganic: true, stock: 150, rating: 4.9, active: true },
  { id: 3, name: "Alphonso Mangoes", category: "Fruits", price: 350, originalPrice: 450, unit: "1 Dozen", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400", isOrganic: true, stock: 50, rating: 5.0, active: true },
  { id: 4, name: "Fresh Milk", category: "Dairy", price: 60, originalPrice: 65, unit: "1 L", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", isOrganic: false, stock: 200, rating: 4.7, active: true },
  { id: 5, name: "Whole Almonds", category: "Dry Fruits", price: 450, originalPrice: 550, unit: "500g", image: "https://images.unsplash.com/photo-1508061252966-173859dbab0b?w=400", isOrganic: true, stock: 80, rating: 4.9, active: true },
  { id: 6, name: "Basmati Rice", category: "Grains", price: 120, originalPrice: 150, unit: "1 kg", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", isOrganic: true, stock: 120, rating: 4.9, active: true },
  { id: 7, name: "Cold Pressed Coconut Oil", category: "Cold Pressed Oils", price: 280, originalPrice: 350, unit: "500ml", image: "https://images.unsplash.com/photo-1612198188258-038202970591?w=400", isOrganic: true, stock: 60, rating: 5.0, active: true },
  { id: 8, name: "Multigrain Bread", category: "Fresh Bakery", price: 50, originalPrice: 60, unit: "400g", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", isOrganic: true, stock: 90, rating: 4.8, active: true }
];

const DEFAULT_PRODUCT_DEFINITIONS = [
  { id: 1, name: "Fresh Spinach", category: "Vegetables", defaultUnit: "1 kg" },
  { id: 2, name: "Organic Tomatoes", category: "Vegetables", defaultUnit: "1 kg" },
  { id: 3, name: "Alphonso Mangoes", category: "Fruits", defaultUnit: "1 Dozen" },
  { id: 4, name: "Fresh Milk", category: "Dairy", defaultUnit: "1 L" },
  { id: 5, name: "Whole Almonds", category: "Dry Fruits", defaultUnit: "500g" },
  { id: 6, name: "Basmati Rice", category: "Grains", defaultUnit: "1 kg" },
  { id: 7, name: "Cold Pressed Coconut Oil", category: "Cold Pressed Oils", defaultUnit: "500ml" },
  { id: 8, name: "Multigrain Bread", category: "Fresh Bakery", defaultUnit: "400g" }
];

// Auto-initialize PostgreSQL Database Schema
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255),
        icon VARCHAR(255),
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
        price NUMERIC(10, 2) NOT NULL,
        original_price NUMERIC(10, 2),
        unit VARCHAR(50) DEFAULT '1 kg',
        image TEXT,
        is_organic BOOLEAN DEFAULT TRUE,
        stock INT DEFAULT 100,
        rating NUMERIC(3, 2) DEFAULT 5.0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const cat of DEFAULT_CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (id, name, icon, active) VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [cat.id, cat.name, cat.icon, true]
      ).catch(() => null);
    }

    for (const def of DEFAULT_PRODUCT_DEFINITIONS) {
      await pool.query(
        `INSERT INTO product_definitions (id, name, category, default_unit) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [def.id, def.name, def.category, def.defaultUnit]
      ).catch(() => null);
    }

    const pCountRes = await pool.query('SELECT COUNT(*) FROM products').catch(() => null);
    const existingCount = Number(pCountRes?.rows?.[0]?.count || 0);

    if (existingCount === 0) {
      for (const p of DEFAULT_PRODUCTS) {
        await pool.query(
          `INSERT INTO products (id, name, category, price, original_price, unit, image, is_organic, stock, rating, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.name, p.category, p.price, p.originalPrice, p.unit, p.image, p.isOrganic, p.stock, p.rating, true]
        ).catch(() => null);
      }
      console.log('🐘 [catalog-service] PostgreSQL database initialized with seed products.');
    } else {
      console.log(`🐘 [catalog-service] PostgreSQL database connected with ${existingCount} live product records.`);
    }
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
  const { category, search, sort } = req.query;
  try {
    let queryStr = 'SELECT * FROM products WHERE active = true';
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
      unit: p.unit,
      image: p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      isOrganic: p.is_organic,
      stock: p.stock,
      rating: Number(p.rating || 5.0)
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
app.post('/api/products', async (req, res) => {
  const { name, category, price, originalPrice, unit, image } = req.body;
  if (!name || !category || price === undefined) {
    return res.status(400).json({ error: 'Name, category, and price required' });
  }

  const numPrice = Number(price);
  const numOrigPrice = Number(originalPrice || price);
  const prodUnit = unit || '1 kg';
  const prodImg = image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';

  try {
    const dbRes = await pool.query(
      `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, stock, rating, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, category, numPrice, numOrigPrice, prodUnit, prodImg, true, 100, 5.0, true]
    );

    const newP = dbRes.rows[0];
    return res.status(201).json({
      id: String(newP.id),
      name: newP.name,
      category: newP.category,
      price: Number(newP.price),
      originalPrice: Number(newP.original_price),
      unit: newP.unit,
      image: newP.image,
      isOrganic: true,
      stock: 100,
      rating: 5.0
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
  const { name, category, price, originalPrice, unit, image, active } = req.body;

  try {
    const dbRes = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        price = COALESCE($3, price),
        original_price = COALESCE($4, original_price),
        unit = COALESCE($5, unit),
        image = COALESCE($6, image),
        active = COALESCE($7, active)
       WHERE id = $8 RETURNING *`,
      [name, category, price !== undefined ? Number(price) : null, originalPrice !== undefined ? Number(originalPrice) : null, unit, image, active, targetId]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const p = dbRes.rows[0];
    return res.json({ id: String(p.id), name: p.name, category: p.category, price: Number(p.price), active: p.active });
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
