import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5005);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';

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

function formatVendor(row: any) {
  return {
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
  };
}

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
    return res.json(dbRes.rows.map(formatVendor));
  } catch (err: any) {
    return res.status(503).json({ error: 'Could not fetch vendors. Database unavailable.' });
  }
});

// Create / Register Vendor
app.post(['/api/vendors', '/api/vendors/register', '/api/vendors/onboard'], async (req, res) => {
  const { name, firstName, lastName, vendorName, email, password, phone, category, address, city, location } = req.body;
  const vName = vendorName || (firstName && lastName ? `${firstName} ${lastName}` : name) || 'New Vendor';
  const cEmail = (email || '').trim().toLowerCase();
  const cPhone = phone || '';
  const cCategory = category || 'Fresh Produce';
  const cAddress = address || location || city || '';
  const cCity = city || location || '';
  const isSelfRegister = req.path.includes('register') || req.path.includes('onboard');
  const initialStatus = isSelfRegister ? 'pending' : 'approved';

  try {
    let dbRes;
    if (cEmail) {
      const existing = await pool.query('SELECT * FROM vendors WHERE LOWER(email) = $1', [cEmail]);
      if (existing.rows && existing.rows.length > 0) {
        dbRes = await pool.query(
          `UPDATE vendors SET name = $1, vendor_name = $2, phone = $3, category = $4, address = $5, city = $6, status = $7, active = $8 WHERE id = $9 RETURNING *`,
          [vName, vName, cPhone, cCategory, cAddress, cCity, initialStatus, true, existing.rows[0].id]
        );
      }
    }

    if (!dbRes || !dbRes.rows || dbRes.rows.length === 0) {
      dbRes = await pool.query(
        `INSERT INTO vendors (name, vendor_name, email, phone, category, address, city, status, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [vName, vName, cEmail, cPhone, cCategory, cAddress, cCity, initialStatus, true]
      );
    }

    const formatted = formatVendor(dbRes.rows[0]);

    // Direct PostgreSQL user creation in RDS users table so vendor appears in /admin/users & can log in
    if (cEmail) {
      try {
        const passwordHash = await bcrypt.hash(password || 'password123', 10);
        await pool.query(
          `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
           VALUES ($1, $2, $3, 'vendor', true, $4, $5, 100)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'vendor',
             phone = EXCLUDED.phone,
             city = EXCLUDED.city,
             active = true`,
          [vName, cEmail, passwordHash, cPhone, cCity]
        );
      } catch (e: any) {
        console.warn('⚠️ Direct PostgreSQL vendor user creation warning:', e?.message);
      }
    }

    // Sync to operations service in background
    const OPERATIONS_SERVICE_URL = process.env.OPERATIONS_SERVICE_URL || 'http://127.0.0.1:5002';
    fetch(`${OPERATIONS_SERVICE_URL}/api/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatted)
    }).catch(() => null);

    return res.status(201).json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to register vendor', message: err?.message });
  }
});

// Update Vendor
app.put(['/api/vendors/:id', '/api/vendors/:id/update'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, vendorName, email, phone, category, address, city, status, active } = req.body;

  try {
    const dbRes = await pool.query(
      `UPDATE vendors SET name = COALESCE($1, name), vendor_name = COALESCE($2, vendor_name), email = COALESCE($3, email), phone = COALESCE($4, phone), category = COALESCE($5, category), address = COALESCE($6, address), city = COALESCE($7, city), status = COALESCE($8, status), active = COALESCE($9, active) WHERE id = $10 RETURNING *`,
      [name, vendorName || name, email, phone, category, address, city, status, active, targetId]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(formatVendor(dbRes.rows[0]));
    }
    return res.status(404).json({ error: 'Vendor not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vendor', message: err?.message });
  }
});

// Vendor Status Update
app.post('/api/vendors/:id/status', async (req, res) => {
  const targetId = Number(req.params.id);
  const { status, active } = req.body;

  try {
    const dbRes = await pool.query(
      `UPDATE vendors SET status = COALESCE($1, status), active = COALESCE($2, active) WHERE id = $3 RETURNING *`,
      [status, active, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(formatVendor(dbRes.rows[0]));
    }
    return res.status(404).json({ error: 'Vendor not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vendor status', message: err?.message });
  }
});

// Delete Vendor
app.delete('/api/vendors/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING id', [targetId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, message: 'Vendor deleted successfully' });
    }
    return res.status(404).json({ error: 'Vendor not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete vendor', message: err?.message });
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

    return res.status(201).json({
      success: true,
      quotation: {
        id: quoteId,
        vendorId: vendorId || '',
        produceName,
        quantityKg: qty,
        pricePerKg: price,
        totalValuation: valuation,
        status: 'PENDING',
        submittedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit quotation', message: err?.message });
  }
});

// List Quotations
app.get('/api/procurement/quotations', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM farmer_quotations ORDER BY submitted_at DESC');
    return res.json(dbRes.rows.map((r: any) => ({
      id: r.id,
      vendorId: r.vendor_id,
      produceName: r.produce_name,
      quantityKg: Number(r.quantity_kg),
      pricePerKg: Number(r.price_per_kg),
      totalValuation: Number(r.total_valuation),
      status: r.status,
      submittedAt: r.submitted_at
    })));
  } catch (err: any) {
    return res.status(503).json({ error: 'Could not fetch quotations. Database unavailable.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌾 vendor-service running on port ${PORT}`);
});
