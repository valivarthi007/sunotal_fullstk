"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pg_1 = require("pg");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 5005);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');
const pool = new pg_1.Pool({
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
        name VARCHAR(255),
        vendor_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        location TEXT,
        produce VARCHAR(255),
        farm_size VARCHAR(100),
        aadhar VARCHAR(50),
        gstin VARCHAR(50),
        category VARCHAR(100) DEFAULT 'Fresh Produce',
        address TEXT,
        city VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        active BOOLEAN DEFAULT TRUE,
        notes TEXT,
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
        // Safe migrations
        const safeAlters = [
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS first_name VARCHAR(255)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location TEXT`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS produce VARCHAR(255)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS farm_size VARCHAR(100)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS aadhar VARCHAR(50)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gstin VARCHAR(50)`,
            `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT`,
        ];
        for (const sql of safeAlters) {
            try {
                await pool.query(sql);
            }
            catch { }
        }
        // Indexes
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email)`,
            `CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status)`,
        ];
        for (const idx of indexes) {
            try {
                await pool.query(idx);
            }
            catch { }
        }
        console.log('🐘 [vendor-service] PostgreSQL database tables ready.');
    }
    catch (err) {
        console.warn('⚠️ [vendor-service] DB init warning:', err?.message || err);
    }
}
initDb();
function formatVendor(row) {
    const firstName = row.first_name || (row.name || row.vendor_name || '').split(' ')[0] || '';
    const lastName = row.last_name || (row.name || row.vendor_name || '').split(' ').slice(1).join(' ') || '';
    return {
        id: row.id,
        firstName,
        lastName,
        name: row.name || row.vendor_name || `${firstName} ${lastName}`.trim(),
        vendorName: row.vendor_name || row.name,
        email: row.email || '',
        phone: row.phone || '',
        location: row.location || row.address || row.city || '',
        produce: row.produce || row.category || 'Fresh Produce',
        farmSize: row.farm_size || '',
        aadhar: row.aadhar || '',
        gstin: row.gstin || '',
        category: row.category || 'Fresh Produce',
        address: row.address || row.location || '',
        city: row.city || '',
        status: row.status || 'pending',
        active: row.active !== false,
        notes: row.notes || '',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
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
    }
    catch (err) {
        return res.status(503).json({ error: 'Could not fetch vendors. Database unavailable.' });
    }
});
// Create / Register Vendor
app.post(['/api/vendors', '/api/vendors/register', '/api/vendors/onboard'], async (req, res) => {
    const { name, firstName, lastName, vendorName, email, password, phone, category, address, city, location, produce, farmSize, aadhar, gstin, notes } = req.body;
    const fName = firstName || (name || vendorName || '').split(' ')[0] || 'Vendor';
    const lName = lastName || (name || vendorName || '').split(' ').slice(1).join(' ') || '';
    const vName = vendorName || name || `${fName} ${lName}`.trim();
    const cEmail = (email || '').trim().toLowerCase();
    const cPhone = phone || '';
    const cCategory = produce || category || 'Fresh Produce';
    const cLocation = location || address || city || '';
    const cCity = city || (location ? location.split(',')[0].trim() : '');
    const isSelfRegister = req.path.includes('register') || req.path.includes('onboard');
    const initialStatus = isSelfRegister ? 'pending' : 'approved';
    try {
        let dbRes;
        if (cEmail) {
            const existing = await pool.query('SELECT * FROM vendors WHERE LOWER(email) = $1', [cEmail]);
            if (existing.rows && existing.rows.length > 0) {
                dbRes = await pool.query(`UPDATE vendors SET name=$1, vendor_name=$1, first_name=$2, last_name=$3, phone=$4, category=$5, location=$6, produce=$7, farm_size=$8, address=$6, city=$9, status=$10, active=true WHERE id=$11 RETURNING *`, [vName, fName, lName, cPhone, cCategory, cLocation, produce || cCategory, farmSize || '', cCity, initialStatus, existing.rows[0].id]);
            }
        }
        if (!dbRes || !dbRes.rows || dbRes.rows.length === 0) {
            dbRes = await pool.query(`INSERT INTO vendors (name, vendor_name, first_name, last_name, email, phone, category, location, produce, farm_size, aadhar, gstin, address, city, status, active, notes)
         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $7, $12, $13, true, $14) RETURNING *`, [vName, fName, lName, cEmail || null, cPhone, cCategory, cLocation, produce || cCategory, farmSize || '', aadhar || '', gstin || '', cCity, initialStatus, notes || '']);
        }
        const formatted = formatVendor(dbRes.rows[0]);
        // Create user account for login
        if (cEmail) {
            try {
                const passwordHash = await bcryptjs_1.default.hash(password || 'password123', 10);
                await pool.query(`INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
           VALUES ($1, $2, $3, 'vendor', true, $4, $5, 100)
           ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role='vendor', phone=EXCLUDED.phone, city=EXCLUDED.city, active=true`, [vName, cEmail, passwordHash, cPhone, cCity]);
            }
            catch (e) {
                console.warn('⚠️ Vendor user creation warning:', e?.message);
            }
        }
        return res.status(201).json(formatted);
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to register vendor', message: err?.message });
    }
});
// Update Vendor
app.put(['/api/vendors/:id', '/api/vendors/:id/update'], async (req, res) => {
    const targetId = Number(req.params.id);
    const { name, firstName, lastName, vendorName, email, phone, category, address, city, location, produce, farmSize, aadhar, gstin, status, active, notes } = req.body;
    const vName = name || vendorName || (firstName && lastName ? `${firstName} ${lastName}` : undefined);
    try {
        const dbRes = await pool.query(`UPDATE vendors SET
        name = COALESCE($1, name), vendor_name = COALESCE($1, vendor_name),
        first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name),
        email = COALESCE($4, email), phone = COALESCE($5, phone),
        category = COALESCE($6, category), address = COALESCE($7, address),
        city = COALESCE($8, city), location = COALESCE($9, location),
        produce = COALESCE($10, produce), farm_size = COALESCE($11, farm_size),
        status = COALESCE($12, status), active = COALESCE($13, active), notes = COALESCE($14, notes)
       WHERE id = $15 RETURNING *`, [vName, firstName, lastName, email, phone, category, address || location, city, location || address, produce, farmSize, status, active, notes, targetId]);
        if (dbRes.rows && dbRes.rows.length > 0) {
            return res.json(formatVendor(dbRes.rows[0]));
        }
        return res.status(404).json({ error: 'Vendor not found' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to update vendor', message: err?.message });
    }
});
// Vendor Status Update
app.post('/api/vendors/:id/status', async (req, res) => {
    const targetId = Number(req.params.id);
    const { status, active } = req.body;
    try {
        const dbRes = await pool.query(`UPDATE vendors SET status = COALESCE($1, status), active = COALESCE($2, active) WHERE id = $3 RETURNING *`, [status, active, targetId]);
        if (dbRes.rows && dbRes.rows.length > 0) {
            return res.json(formatVendor(dbRes.rows[0]));
        }
        return res.status(404).json({ error: 'Vendor not found' });
    }
    catch (err) {
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
    }
    catch (err) {
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
        await pool.query(`INSERT INTO farmer_quotations (id, vendor_id, produce_name, quantity_kg, price_per_kg, total_valuation, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [quoteId, String(vendorId || ''), produceName, qty, price, valuation, 'PENDING']);
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
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to submit quotation', message: err?.message });
    }
});
// List Quotations
app.get('/api/procurement/quotations', async (_req, res) => {
    try {
        const dbRes = await pool.query('SELECT * FROM farmer_quotations ORDER BY submitted_at DESC');
        return res.json(dbRes.rows.map((r) => ({
            id: r.id,
            vendorId: r.vendor_id,
            produceName: r.produce_name,
            quantityKg: Number(r.quantity_kg),
            pricePerKg: Number(r.price_per_kg),
            totalValuation: Number(r.total_valuation),
            status: r.status,
            submittedAt: r.submitted_at
        })));
    }
    catch (err) {
        return res.status(503).json({ error: 'Could not fetch quotations. Database unavailable.' });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 vendor-service running on port ${PORT}`);
});
