import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5005);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let inMemoryVendors: any[] = [];
let inMemoryQuotations: any[] = [];

// Initialize PostgreSQL database schema
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        category VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        status VARCHAR(50) DEFAULT 'approved',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farmer_quotations (
        id VARCHAR(255) PRIMARY KEY,
        vendor_id VARCHAR(255),
        produce_name VARCHAR(255) NOT NULL,
        quantity_kg NUMERIC(10, 2) NOT NULL,
        price_per_kg NUMERIC(10, 2) NOT NULL,
        total_valuation NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('🐘 [vendor-service] PostgreSQL database tables ready.');
  } catch (err: any) {
    console.warn('⚠️ [vendor-service] DB init warning:', err?.message || err);
  }
}

initDb();

app.get('/healthz', (_req, res) => {
  res.json({ service: 'vendor-service', status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ service: 'vendor-service', status: 'ok', timestamp: new Date().toISOString() });
});

// List Vendors (Admin)
app.get('/api/vendors', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM vendors ORDER BY id DESC');
    if (dbRes.rows && dbRes.rows.length > 0) {
      const formatted = dbRes.rows.map((row: any) => ({
        id: row.id,
        name: row.name || row.vendor_name,
        vendorName: row.vendor_name || row.name,
        email: row.email,
        phone: row.phone,
        category: row.category,
        address: row.address,
        city: row.city,
        status: row.status,
        active: row.active,
        createdAt: row.created_at
      }));
      return res.json(formatted);
    }
    return res.json(inMemoryVendors);
  } catch (err: any) {
    return res.json(inMemoryVendors);
  }
});

// Create / Register Vendor
app.post(['/api/vendors', '/api/vendors/register', '/api/vendors/onboard'], async (req, res) => {
  const { name, vendorName, email, phone, category, address, city, location } = req.body;
  const vName = vendorName || name || 'New Vendor';
  const cEmail = (email || '').toLowerCase();
  const cPhone = phone || '';
  const cCategory = category || 'Fresh Produce';
  const cAddress = address || location || city || '';
  const cCity = city || location || '';

  try {
    const dbRes = await pool.query(
      `INSERT INTO vendors (name, vendor_name, email, phone, category, address, city, status, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [vName, vName, cEmail, cPhone, cCategory, cAddress, cCity, 'approved', true]
    );
    const newVendor = dbRes.rows[0];
    const formatted = {
      id: newVendor.id,
      name: newVendor.name,
      vendorName: newVendor.vendor_name,
      email: newVendor.email,
      phone: newVendor.phone,
      category: newVendor.category,
      address: newVendor.address,
      city: newVendor.city,
      status: newVendor.status,
      active: newVendor.active,
      createdAt: newVendor.created_at
    };

    inMemoryVendors.unshift(formatted);

    // Sync to operations service in background
    fetch('http://127.0.0.1:5002/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatted)
    }).catch(() => null);

    return res.status(201).json(formatted);
  } catch (err: any) {
    const newVendor = {
      id: inMemoryVendors.length + 1,
      name: vName,
      vendorName: vName,
      email: cEmail,
      phone: cPhone,
      category: cCategory,
      address: cAddress,
      city: cCity,
      status: 'approved',
      active: true,
      createdAt: new Date().toISOString()
    };
    inMemoryVendors.unshift(newVendor);
    return res.status(201).json(newVendor);
  }
});

// Update Vendor
app.put(['/api/vendors/:id', '/api/vendors/:id/update'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, vendorName, email, phone, category, address, city, status, active } = req.body;

  try {
    await pool.query(
      `UPDATE vendors SET name = COALESCE($1, name), vendor_name = COALESCE($2, vendor_name), email = COALESCE($3, email), phone = COALESCE($4, phone), category = COALESCE($5, category), address = COALESCE($6, address), city = COALESCE($7, city), status = COALESCE($8, status), active = COALESCE($9, active) WHERE id = $10`,
      [name, vendorName || name, email, phone, category, address, city, status, active, targetId]
    );

    const mem = inMemoryVendors.find((v) => v.id === targetId);
    if (mem) Object.assign(mem, req.body);

    return res.json({ id: targetId, ...req.body });
  } catch (err: any) {
    const mem = inMemoryVendors.find((v) => v.id === targetId);
    if (mem) Object.assign(mem, req.body);
    return res.json(mem || { id: targetId, ...req.body });
  }
});

// Vendor Status Update
app.post('/api/vendors/:id/status', async (req, res) => {
  const targetId = Number(req.params.id);
  const { status, active } = req.body;

  try {
    await pool.query(
      `UPDATE vendors SET status = COALESCE($1, status), active = COALESCE($2, active) WHERE id = $3`,
      [status, active, targetId]
    );
    return res.json({ id: targetId, status: status || 'approved', active: active ?? true });
  } catch (err: any) {
    return res.json({ id: targetId, status: status || 'approved', active: active ?? true });
  }
});

// Delete Vendor
app.delete('/api/vendors/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await pool.query('DELETE FROM vendors WHERE id = $1', [targetId]);
    inMemoryVendors = inMemoryVendors.filter((v) => v.id !== targetId);
    return res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (err: any) {
    inMemoryVendors = inMemoryVendors.filter((v) => v.id !== targetId);
    return res.json({ success: true, message: 'Vendor deleted successfully' });
  }
});

// Farmer Produce Quotation Submission
app.post('/api/procurement/quotations', async (req, res) => {
  const { vendorId, produceName, quantityKg, pricePerKg } = req.body;
  if (!produceName || quantityKg === undefined || pricePerKg === undefined) {
    return res.status(400).json({ error: 'Produce name, quantity, and price per kg required' });
  }
  const quoteId = `QUOTE-${Math.floor(1000 + Math.random() * 9000)}`;
  const qty = Number(quantityKg);
  const price = Number(pricePerKg);
  const valuation = qty * price;

  try {
    await pool.query(
      `INSERT INTO farmer_quotations (id, vendor_id, produce_name, quantity_kg, price_per_kg, total_valuation, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [quoteId, String(vendorId || ''), produceName, qty, price, valuation, 'PENDING']
    );

    const newQuotation = {
      id: quoteId,
      vendorId: vendorId || '',
      produceName,
      quantityKg: qty,
      pricePerKg: price,
      totalValuation: valuation,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    };
    inMemoryQuotations.unshift(newQuotation);
    return res.status(201).json({ success: true, quotation: newQuotation });
  } catch (err: any) {
    const newQuotation = {
      id: quoteId,
      vendorId: vendorId || '',
      produceName,
      quantityKg: qty,
      pricePerKg: price,
      totalValuation: valuation,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    };
    inMemoryQuotations.unshift(newQuotation);
    return res.status(201).json({ success: true, quotation: newQuotation });
  }
});

// List Quotations
app.get('/api/procurement/quotations', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM farmer_quotations ORDER BY submitted_at DESC');
    if (dbRes.rows && dbRes.rows.length > 0) {
      const formatted = dbRes.rows.map((r: any) => ({
        id: r.id,
        vendorId: r.vendor_id,
        produceName: r.produce_name,
        quantityKg: Number(r.quantity_kg),
        pricePerKg: Number(r.price_per_kg),
        totalValuation: Number(r.total_valuation),
        status: r.status,
        submittedAt: r.submitted_at
      }));
      return res.json(formatted);
    }
    return res.json(inMemoryQuotations);
  } catch (err: any) {
    return res.json(inMemoryQuotations);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌾 vendor-service running on port ${PORT}`);
});
