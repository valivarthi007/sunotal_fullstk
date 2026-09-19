import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5009);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
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
  { id: "1", name: "Fresh Spinach", category: "Vegetables", price: 40, originalPrice: 50, unit: "1 kg", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", isOrganic: true, stock: 100, rating: 4.8, active: true },
  { id: "2", name: "Organic Tomatoes", category: "Vegetables", price: 35, originalPrice: 45, unit: "1 kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400", isOrganic: true, stock: 150, rating: 4.9, active: true },
  { id: "3", name: "Alphonso Mangoes", category: "Fruits", price: 350, originalPrice: 450, unit: "1 Dozen", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400", isOrganic: true, stock: 50, rating: 5.0, active: true },
  { id: "4", name: "Fresh Milk", category: "Dairy", price: 60, originalPrice: 65, unit: "1 L", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", isOrganic: false, stock: 200, rating: 4.7, active: true },
  { id: "5", name: "Whole Almonds", category: "Dry Fruits", price: 450, originalPrice: 550, unit: "500g", image: "https://images.unsplash.com/photo-1508061252966-173859dbab0b?w=400", isOrganic: true, stock: 80, rating: 4.9, active: true },
  { id: "6", name: "Basmati Rice", category: "Grains", price: 120, originalPrice: 150, unit: "1 kg", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", isOrganic: true, stock: 120, rating: 4.9, active: true },
  { id: "7", name: "Cold Pressed Coconut Oil", category: "Cold Pressed Oils", price: 280, originalPrice: 350, unit: "500ml", image: "https://images.unsplash.com/photo-1612198188258-038202970591?w=400", isOrganic: true, stock: 60, rating: 5.0, active: true },
  { id: "8", name: "Multigrain Bread", category: "Fresh Bakery", price: 50, originalPrice: 60, unit: "400g", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", isOrganic: true, stock: 90, rating: 4.8, active: true }
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

let inMemoryCategories: any[] = [...DEFAULT_CATEGORIES];
let inMemoryProducts: any[] = [...DEFAULT_PRODUCTS];
let inMemoryDefinitions: any[] = [...DEFAULT_PRODUCT_DEFINITIONS];

// Auto-initialize PostgreSQL Database Schema
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
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
         ON CONFLICT (id) DO UPDATE SET active = TRUE`,
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
          [Number(p.id), p.name, p.category, p.price, p.originalPrice, p.unit, p.image, p.isOrganic, p.stock, p.rating, true]
        ).catch(() => null);
      }
      console.log('🐘 [catalog-service] PostgreSQL database initialized with initial seed products.');
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

// Products Listing with Filter/Search/Sort
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
    if (dbRes.rows && dbRes.rows.length > 0) {
      const formatted = dbRes.rows.map((p: any) => ({
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
    }
    return res.json(inMemoryProducts);
  } catch (err: any) {
    return res.json(inMemoryProducts);
  }
});

// Single Product
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
    const mem = inMemoryProducts.find((p) => String(p.id) === String(req.params.id));
    if (!mem) return res.status(404).json({ error: 'Product not found' });
    return res.json(mem);
  } catch (err: any) {
    const mem = inMemoryProducts.find((p) => String(p.id) === String(req.params.id));
    if (!mem) return res.status(404).json({ error: 'Product not found' });
    return res.json(mem);
  }
});

// Create Product (Admin)
app.post('/api/products', async (req, res) => {
  const { name, category, price, originalPrice, unit, image } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, category, and price required' });
  }

  const numPrice = Number(price);
  const numOrigPrice = Number(originalPrice || price);
  const prodUnit = unit || '1 kg';
  const prodImg = image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';

  try {
    const dbRes = await pool.query(
      `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, stock, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, category, numPrice, numOrigPrice, prodUnit, prodImg, true, 100, 5.0]
    );

    const newP = dbRes.rows[0];
    const formatted = {
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
    };
    inMemoryProducts.unshift(formatted);
    return res.status(201).json(formatted);
  } catch (err: any) {
    const newProduct = {
      id: String(Date.now()),
      name,
      category,
      price: numPrice,
      originalPrice: numOrigPrice,
      unit: prodUnit,
      image: prodImg,
      isOrganic: true,
      stock: 100,
      rating: 5.0
    };
    inMemoryProducts.unshift(newProduct);
    return res.status(201).json(newProduct);
  }
});

// Categories List & CRUD
app.get('/api/categories', async (_req, res) => {
  const catMap = new Map();
  inMemoryCategories.forEach((c) => {
    if (c && c.name) {
      catMap.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        icon: c.icon || '📦',
        active: c.active ?? true
      });
    }
  });

  try {
    const dbRes = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    if (dbRes.rows && dbRes.rows.length > 0) {
      dbRes.rows.forEach((c: any) => {
        catMap.set(c.name.toLowerCase(), {
          id: c.id,
          name: c.name,
          icon: c.icon || '📦',
          active: c.active ?? true
        });
      });
    }
  } catch (err: any) {}

  return res.json(Array.from(catMap.values()));
});

app.post('/api/categories', async (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const cleanName = name.trim();
  const catIcon = icon || '📦';

  try {
    const dbRes = await pool.query(
      `INSERT INTO categories (name, icon, active) VALUES ($1, $2, $3) RETURNING *`,
      [cleanName, catIcon, true]
    );
    const newCat = { id: dbRes.rows[0].id, name: dbRes.rows[0].name, icon: dbRes.rows[0].icon, active: true };
    inMemoryCategories.push(newCat);

    fetch('http://127.0.0.1:5002/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat),
    }).catch(() => null);

    return res.status(201).json(newCat);
  } catch (err: any) {
    const newCategory = { id: Date.now(), name: cleanName, icon: catIcon, active: true };
    inMemoryCategories.push(newCategory);

    fetch('http://127.0.0.1:5002/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    }).catch(() => null);

    return res.status(201).json(newCategory);
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    inMemoryCategories = inMemoryCategories.filter((c) => Number(c.id) !== id);
    return res.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    inMemoryCategories = inMemoryCategories.filter((c) => Number(c.id) !== id);
    return res.json({ success: true, message: 'Category deleted' });
  }
});

// Product Definitions List & CRUD
app.get('/api/product-definitions', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM product_definitions ORDER BY id ASC');
    if (dbRes.rows && dbRes.rows.length > 0) {
      const formatted = dbRes.rows.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        defaultUnit: d.default_unit,
        createdAt: d.created_at
      }));
      return res.json(formatted);
    }
    return res.json(inMemoryDefinitions);
  } catch (err: any) {
    return res.json(inMemoryDefinitions);
  }
});

app.post('/api/product-definitions', async (req, res) => {
  const { name, category, defaultUnit } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Product name and category are required' });
  }

  const defName = name.trim();
  const defCat = category.trim();
  const defUnit = defaultUnit || '1 kg';

  try {
    const dbRes = await pool.query(
      `INSERT INTO product_definitions (name, category, default_unit) VALUES ($1, $2, $3) RETURNING *`,
      [defName, defCat, defUnit]
    );
    const d = dbRes.rows[0];
    const newDef = { id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit, createdAt: d.created_at };
    inMemoryDefinitions.push(newDef);

    fetch('http://127.0.0.1:5002/api/product-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDef),
    }).catch(() => null);

    return res.status(201).json(newDef);
  } catch (err: any) {
    const newDef = { id: inMemoryDefinitions.length + 1, name: defName, category: defCat, defaultUnit: defUnit, createdAt: new Date().toISOString() };
    inMemoryDefinitions.push(newDef);
    return res.status(201).json(newDef);
  }
});

app.delete('/api/product-definitions/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await pool.query('DELETE FROM product_definitions WHERE id = $1', [id]);
    inMemoryDefinitions = inMemoryDefinitions.filter((d) => d.id !== id);
    return res.json({ success: true, message: 'Product definition deleted' });
  } catch (err: any) {
    inMemoryDefinitions = inMemoryDefinitions.filter((d) => d.id !== id);
    return res.json({ success: true, message: 'Product definition deleted' });
  }
});

// Update Product
app.put(['/api/products/:id', '/api/admin/products/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, category, price, originalPrice, unit, image } = req.body;

  try {
    await pool.query(
      `UPDATE products SET name = COALESCE($1, name), category = COALESCE($2, category), price = COALESCE($3, price), original_price = COALESCE($4, original_price), unit = COALESCE($5, unit), image = COALESCE($6, image) WHERE id = $7`,
      [name, category, price !== undefined ? Number(price) : null, originalPrice !== undefined ? Number(originalPrice) : null, unit, image, targetId]
    );

    inMemoryProducts = inMemoryProducts.map((p) => (String(p.id) === String(targetId) ? { ...p, ...req.body } : p));
    return res.json({ id: String(targetId), ...req.body });
  } catch (err: any) {
    inMemoryProducts = inMemoryProducts.map((p) => (String(p.id) === String(targetId) ? { ...p, ...req.body } : p));
    return res.json({ id: String(targetId), ...req.body });
  }
});

// Delete Product
app.delete(['/api/products/:id', '/api/admin/products/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [targetId]);
    inMemoryProducts = inMemoryProducts.filter((p) => String(p.id) !== String(targetId));
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    inMemoryProducts = inMemoryProducts.filter((p) => String(p.id) !== String(targetId));
    return res.json({ success: true, message: 'Product deleted successfully' });
  }
});

// Storefront Search API
app.get('/api/storefront/search', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  try {
    const dbRes = await pool.query('SELECT * FROM products WHERE LOWER(name) LIKE $1 OR LOWER(category) LIKE $1', [`%${q}%`]);
    if (dbRes.rows) {
      const matched = dbRes.rows.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        price: Number(p.price),
        image: p.image
      }));
      return res.json({ success: true, products: matched });
    }
  } catch (err: any) {}

  const matched = inMemoryProducts.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  res.json({ success: true, products: matched });
});

app.listen(PORT, () => {
  console.log(`📦 catalog-service running on port ${PORT}`);
});
