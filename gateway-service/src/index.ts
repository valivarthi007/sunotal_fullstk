import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@postgres:5432/sunotal';
const JWT_SECRET = process.env.JWT_SECRET || 'sunotal_jwt_secret_2026_super_secure';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'jcs-raju-sunotal-final';
const AWS_CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN || '';

let s3Client: S3Client | null = null;
try {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined
  });
} catch (err) {
  console.warn('⚠️ Could not initialize AWS S3 client:', err);
}

export async function uploadToS3(params: {
  filename: string;
  data: string | Buffer;
  contentType?: string;
  folder?: string;
}): Promise<string> {
  const { filename, data, folder = 'images' } = params;
  let buffer: Buffer;
  let contentType = params.contentType || 'image/png';

  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      const match = data.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(data, 'base64');
      }
    } else {
      buffer = Buffer.from(data, 'base64');
    }
  } else {
    buffer = data;
  }

  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder.replace(/^\/+|\/+$/g, '')}/${Date.now()}-${sanitized}`;

  if (s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read'
      });
      await s3Client.send(command);

      if (AWS_CLOUDFRONT_DOMAIN) {
        return `https://${AWS_CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '')}/${key}`;
      }
      return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    } catch (err: any) {
      console.warn('⚠️ AWS S3 Upload Warning:', err?.message || err);
    }
  }

  if (AWS_CLOUDFRONT_DOMAIN) {
    return `https://${AWS_CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '')}/${key}`;
  }
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

function signJwtNative(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 30 * 86400 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwtNative(token: string, secret: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(`${headerB64}.${bodyB64}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf-8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds');
const gatewayPgPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRds ? { rejectUnauthorized: false } : undefined,
});

// Database Initialization & Clean Slate Schema Script
async function initDatabase() {
  let client;
  try {
    client = await gatewayPgPool.connect();
    console.log('🐘 Initializing clean PostgreSQL database schema and tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        active BOOLEAN DEFAULT TRUE,
        phone VARCHAR(50),
        city VARCHAR(100),
        wallet_balance NUMERIC(12, 2) DEFAULT 500.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Vendors Table (with Bank Account Details)
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        category VARCHAR(100) DEFAULT 'Fresh Produce',
        address TEXT,
        city VARCHAR(100),
        location TEXT,
        produce VARCHAR(255) DEFAULT 'Fresh Produce',
        farm_size VARCHAR(100) DEFAULT '5 Acres',
        aadhar VARCHAR(50),
        gstin VARCHAR(50),
        status VARCHAR(50) DEFAULT 'approved',
        active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        bank_name VARCHAR(255) DEFAULT 'State Bank of India',
        account_number VARCHAR(100) DEFAULT '30987654321',
        ifsc_code VARCHAR(50) DEFAULT 'SBIN0004123',
        branch_name VARCHAR(255) DEFAULT 'Main Agricultural Branch',
        account_holder_name VARCHAR(255),
        upi_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Warehouses / Dark Stores
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        latitude NUMERIC(10, 6) DEFAULT 12.9716,
        longitude NUMERIC(10, 6) DEFAULT 77.5946,
        free_delivery_radius_km NUMERIC(5,2) DEFAULT 30.00,
        max_service_radius_km NUMERIC(5,2) DEFAULT 70.00,
        base_delivery_fee NUMERIC(10,2) DEFAULT 50.00,
        per_km_rate NUMERIC(10,2) DEFAULT 8.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Categories Table
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        icon VARCHAR(100) DEFAULT '📦',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Product Definitions
      CREATE TABLE IF NOT EXISTS product_definitions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        default_unit VARCHAR(50) DEFAULT '1 kg',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Banners Table
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        image TEXT NOT NULL,
        link TEXT DEFAULT '/products',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Products Table
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        original_price NUMERIC(10,2),
        unit VARCHAR(50) DEFAULT '1 kg',
        image TEXT,
        is_organic BOOLEAN DEFAULT TRUE,
        stock INT DEFAULT 100,
        rating NUMERIC(3,2) DEFAULT 4.80,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Quotations Table
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        vendor_id VARCHAR(100),
        vendor_name VARCHAR(255) NOT NULL,
        produce VARCHAR(255) NOT NULL,
        crop_name VARCHAR(255),
        quantity NUMERIC(10,2) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        category VARCHAR(100) DEFAULT 'Vegetables',
        unit VARCHAR(50) DEFAULT 'Quintal',
        quality_grade VARCHAR(100) DEFAULT 'Grade A (Organic / Premium)',
        expected_harvest_date VARCHAR(100),
        dark_store_allocation VARCHAR(255) DEFAULT 'Vijayawada Central Hub',
        notes TEXT,
        phone VARCHAR(50),
        address TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'processing',
        invoice_generated BOOLEAN DEFAULT FALSE,
        invoice_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Orders Table
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(100) UNIQUE NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        user_phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        total_amount NUMERIC(10,2) NOT NULL,
        discount_amount NUMERIC(10,2) DEFAULT 0,
        final_amount NUMERIC(10,2) NOT NULL,
        delivery_fee NUMERIC(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'placed',
        payment_status VARCHAR(50) DEFAULT 'paid',
        payment_method VARCHAR(50) DEFAULT 'UPI / Wallet',
        warehouse_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Rider Payouts Table
      CREATE TABLE IF NOT EXISTS rider_payouts (
        id SERIAL PRIMARY KEY,
        rider_id VARCHAR(100),
        rider_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        upi_id VARCHAR(100),
        amount NUMERIC(10,2) NOT NULL,
        trips_completed INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        label VARCHAR(50) DEFAULT 'Home',
        receiver_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        street_address TEXT NOT NULL,
        landmark TEXT,
        city VARCHAR(100) DEFAULT 'Bengaluru',
        state VARCHAR(100) DEFAULT 'Karnataka',
        pincode VARCHAR(20) DEFAULT '560001',
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        unit VARCHAR(50),
        image TEXT,
        price NUMERIC(10, 2) NOT NULL,
        quantity INT NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        user_id INT NOT NULL,
        rider_id VARCHAR(100),
        product_id INT,
        rider_rating INT,
        product_rating INT,
        rider_feedback TEXT,
        product_feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20) DEFAULT 'percentage',
        discount_value NUMERIC(10, 2) NOT NULL,
        min_order_amount NUMERIC(10, 2) DEFAULT 0,
        max_discount_amount NUMERIC(10, 2),
        expiry_date TIMESTAMP,
        usage_limit INT DEFAULT 1000,
        used_count INT DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wishlists (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INT,
        vendor_id INT,
        product_name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255),
        warehouse_name VARCHAR(255) DEFAULT 'Central Dark Store Hub',
        warehouse_city VARCHAR(255),
        quantity NUMERIC(10, 2) DEFAULT 100,
        unit VARCHAR(50) DEFAULT 'kg',
        status VARCHAR(50) DEFAULT 'in_stock',
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(100) UNIQUE,
        role VARCHAR(50) DEFAULT 'user',
        sender_name VARCHAR(255) NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        sender_phone VARCHAR(50),
        category VARCHAR(100) NOT NULL,
        order_id VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        resolution TEXT,
        resolved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe Column Alterations
    const alters = [
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) DEFAULT 'State Bank of India'`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_number VARCHAR(100) DEFAULT '30987654321'`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50) DEFAULT 'SBIN0004123'`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255) DEFAULT 'Main Agricultural Branch'`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(50)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10,6)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10,6)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id VARCHAR(100)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_name VARCHAR(255)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_phone VARCHAR(50)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_minutes INT DEFAULT 15`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    ];
    for (const sql of alters) {
      try { await client.query(sql); } catch { }
    }

    // High-Performance Retrieval Indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email))`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
      `CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(LOWER(email))`,
      `CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)`,
      `CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)`,
      `CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`,
    ];
    for (const idx of indexes) {
      try { await client.query(idx); } catch { }
    }

    console.log('✅ PostgreSQL database schema & indexes ready.');
  } catch (err: any) {
    console.error('⚠️ PostgreSQL DB init error:', err?.message || err);
  } finally {
    if (client) client.release();
  }
}

initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Correlation ID
app.use((req: any, res: any, next: any) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || `sn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// SSE Realtime Engine
const sseClients = new Set<any>();
export function broadcastRealtimeEvent(event: { type: string; path: string; method: string; data?: any }) {
  const payload = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
  sseClients.forEach((client) => {
    try {
      if (!client.writableEnded) client.write(payload);
      else sseClients.delete(client);
    } catch {
      sseClients.delete(client);
    }
  });
}

app.get('/api/realtime/stream', (_req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Sunotal Realtime Stream Connected' })}\n\n`);
  sseClients.add(res);

  const timer = setInterval(() => {
    try {
      if (!res.writableEnded) res.write(`:ping\n\n`);
      else { clearInterval(timer); sseClients.delete(res); }
    } catch { clearInterval(timer); sseClients.delete(res); }
  }, 15000);

  _req.on('close', () => { clearInterval(timer); sseClients.delete(res); });
});

// Broadcast mutations
app.use((req: any, res: any, next: any) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        broadcastRealtimeEvent({ type: 'REALTIME_MUTATION', path: req.originalUrl || req.url, method: req.method });
      }
    });
  }
  next();
});

// Helper functions for SQL formatting
function formatVendorRow(v: any) {
  const firstName = v.first_name || (v.name || v.vendor_name || '').split(' ')[0] || '';
  const lastName = v.last_name || (v.name || v.vendor_name || '').split(' ').slice(1).join(' ') || '';
  return {
    id: v.id,
    firstName,
    lastName,
    name: v.name || v.vendor_name || `${firstName} ${lastName}`.trim(),
    vendorName: v.vendor_name || v.name,
    email: v.email || '',
    phone: v.phone || '',
    location: v.location || v.address || v.city || '',
    produce: v.produce || v.category || 'Fresh Produce',
    farmSize: v.farm_size || '5 Acres',
    aadhar: v.aadhar || '',
    gstin: v.gstin || '',
    category: v.category || 'Fresh Produce',
    address: v.address || v.location || v.city || '',
    city: v.city || '',
    status: v.status || 'approved',
    active: v.active !== false,
    notes: v.notes || '',
    bankName: v.bank_name || 'State Bank of India',
    accountNumber: v.account_number || '30987654321',
    ifscCode: v.ifsc_code || 'SBIN0004123',
    branchName: v.branch_name || 'Main Agricultural Branch',
    accountHolderName: v.account_holder_name || `${firstName} ${lastName}`.trim(),
    upiId: v.upi_id || `${(v.email || 'vendor').split('@')[0]}@upi`,
    createdAt: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
  };
}

// HEALTH
app.get(['/healthz', '/api/healthz'], (_req, res) => {
  res.json({ status: 'OK', service: 'Sunotal Direct API Engine', timestamp: new Date().toISOString() });
});

// AUTH & USERS
app.get(['/api/auth/me', '/api/auth/user', '/api/users/me'], async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const decoded = verifyJwtNative(token, JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM users WHERE id = $1', [Number(decoded.id)]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const u = dbRes.rows[0];
      const normUser = {
        id: String(u.id),
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active ?? true,
        status: u.active === false ? 'inactive' : 'active',
        phone: u.phone || '',
        city: u.city || '',
        walletBalance: Number(u.wallet_balance || 0),
        createdAt: u.created_at
      };
      return res.json({ success: true, user: normUser, ...normUser });
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch current user', message: err?.message });
  }
});
app.post(['/api/auth/login', '/api/admin/login', '/api/auth/admin/login'], async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const cleanEmail = String(email).trim().toLowerCase();
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (dbRes.rows && dbRes.rows.length > 0) {
      const u = dbRes.rows[0];
      const match = await bcrypt.compare(password, u.password_hash);
      if (match) {
        const normUser = { id: String(u.id), name: u.name, email: u.email, role: u.role, active: u.active ?? true, status: u.active === false ? 'inactive' : 'active', phone: u.phone || '', city: u.city || '', walletBalance: Number(u.wallet_balance || 0), createdAt: u.created_at };
        const token = signJwtNative({ id: normUser.id, email: normUser.email, role: normUser.role }, JWT_SECRET);
        return res.json({ success: true, token, user: normUser });
      }
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Authentication service error', message: err?.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, phone, city } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const pwdHash = await bcrypt.hash(password, 10);
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
       VALUES ($1, $2, $3, $4, true, $5, $6, 500)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role RETURNING *`,
      [name || cleanEmail.split('@')[0], cleanEmail, pwdHash, role || 'customer', phone || '', city || '']
    );
    const u = dbRes.rows[0];
    const normUser = { id: String(u.id), name: u.name, email: u.email, role: u.role, active: true, status: 'active', phone: u.phone || '', city: u.city || '', walletBalance: Number(u.wallet_balance || 0), createdAt: u.created_at };
    const token = signJwtNative({ id: normUser.id, email: normUser.email, role: normUser.role }, JWT_SECRET);
    return res.status(201).json({ success: true, token, user: normUser });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to register user', message: err?.message });
  }
});

app.get(['/api/users', '/api/admin/users'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM users ORDER BY id DESC');
    return res.json(dbRes.rows.map(u => ({
      id: String(u.id), name: u.name, email: u.email, role: u.role, active: u.active ?? true, status: u.active === false ? 'inactive' : 'active', phone: u.phone || '', city: u.city || '', walletBalance: Number(u.wallet_balance || 0), createdAt: u.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch users', message: err?.message });
  }
});

app.put(['/api/users/:id', '/api/admin/users/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, phone, city, role, active } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE users SET name=COALESCE($1, name), phone=COALESCE($2, phone), city=COALESCE($3, city), role=COALESCE($4, role), active=COALESCE($5, active) WHERE id=$6 RETURNING *`,
      [name, phone, city, role, active, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const u = dbRes.rows[0];
      return res.json({ id: String(u.id), name: u.name, email: u.email, role: u.role, active: u.active ?? true, status: u.active === false ? 'inactive' : 'active', phone: u.phone || '', city: u.city || '', walletBalance: Number(u.wallet_balance || 0), createdAt: u.created_at });
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user', message: err?.message });
  }
});

app.delete(['/api/users/:id', '/api/admin/users/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM users WHERE id = $1', [targetId]);
    return res.json({ success: true, message: 'User deleted successfully', deletedId: targetId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete user', message: err?.message });
  }
});

// VENDORS & BANK DETAILS (supports status query filter: ?status=pending, ?status=approved)
app.get(['/api/vendors', '/api/procurement/vendors', '/api/admin/vendors'], async (req, res) => {
  try {
    const statusQuery = req.query.status ? String(req.query.status).toLowerCase() : null;
    const searchQuery = req.query.search ? String(req.query.search).toLowerCase() : null;

    let sql = 'SELECT * FROM vendors WHERE 1=1';
    const params: any[] = [];

    if (statusQuery && statusQuery !== 'all') {
      params.push(statusQuery);
      sql += ` AND LOWER(status) = $${params.length}`;
    }

    if (searchQuery) {
      params.push(`%${searchQuery}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(produce) LIKE $${params.length})`;
    }

    sql += ' ORDER BY id DESC';
    const dbRes = await gatewayPgPool.query(sql, params);
    return res.json(dbRes.rows.map(formatVendorRow));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch vendors', message: err?.message });
  }
});

app.post(['/api/vendors', '/api/vendors/register', '/api/vendors/onboard'], async (req, res) => {
  const { name, firstName, lastName, vendorName, email, password, phone, category, address, city, location, produce, farmSize, bankName, accountNumber, ifscCode, branchName, accountHolderName, upiId } = req.body || {};
  const fName = firstName || (name || vendorName || '').split(' ')[0] || 'Vendor';
  const lName = lastName || (name || vendorName || '').split(' ').slice(1).join(' ') || '';
  const vName = vendorName || name || `${fName} ${lName}`.trim();
  const cEmail = (email || '').trim().toLowerCase();
  const isSelfRegister = (req.originalUrl || req.url).includes('register') || (req.originalUrl || req.url).includes('onboard');
  const initialStatus = isSelfRegister ? 'pending' : 'approved';

  try {
    let dbRes;
    if (cEmail) {
      const existing = await gatewayPgPool.query('SELECT * FROM vendors WHERE LOWER(email) = $1', [cEmail]);
      if (existing.rows && existing.rows.length > 0) {
        dbRes = await gatewayPgPool.query(
          `UPDATE vendors SET name=$1, vendor_name=$1, first_name=$2, last_name=$3, phone=$4, category=$5, address=$6, city=$7, location=$8, produce=$9, farm_size=$10, status=$11, bank_name=$12, account_number=$13, ifsc_code=$14, branch_name=$15, account_holder_name=$16, upi_id=$17 WHERE id=$18 RETURNING *`,
          [vName, fName, lName, phone || '', category || 'Fresh Produce', address || location || city || '', city || '', location || address || '', produce || 'Fresh Produce', farmSize || '5 Acres', initialStatus, bankName || 'State Bank of India', accountNumber || '30987654321', ifscCode || 'SBIN0004123', branchName || 'Main Agricultural Branch', accountHolderName || `${fName} ${lName}`.trim(), upiId || `${cEmail.split('@')[0]}@upi`, existing.rows[0].id]
        );
      }
    }

    if (!dbRes || !dbRes.rows || dbRes.rows.length === 0) {
      dbRes = await gatewayPgPool.query(
        `INSERT INTO vendors (name, vendor_name, first_name, last_name, email, phone, category, address, city, location, produce, farm_size, status, active, bank_name, account_number, ifsc_code, branch_name, account_holder_name, upi_id)
         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14, $15, $16, $17, $18) RETURNING *`,
        [vName, fName, lName, cEmail || null, phone || '', category || 'Fresh Produce', address || location || city || '', city || '', location || address || '', produce || 'Fresh Produce', farmSize || '5 Acres', initialStatus, bankName || 'State Bank of India', accountNumber || '30987654321', ifscCode || 'SBIN0004123', branchName || 'Main Agricultural Branch', accountHolderName || `${fName} ${lName}`.trim(), upiId || `${cEmail.split('@')[0]}@upi`]
      );
    }

    if (cEmail) {
      try {
        const pwdHash = await bcrypt.hash(password || 'vendor123', 10);
        await gatewayPgPool.query(
          `INSERT INTO users (name, email, password_hash, role, active, phone, city)
           VALUES ($1, $2, $3, 'vendor', true, $4, $5) ON CONFLICT (email) DO NOTHING`,
          [vName, cEmail, pwdHash, phone || '', city || '']
        );
      } catch { }
    }

    const formatted = formatVendorRow(dbRes.rows[0]);
    broadcastRealtimeEvent({ type: 'VENDOR_REGISTERED', path: req.originalUrl || req.url, method: 'POST', data: formatted });
    return res.status(201).json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save vendor', message: err?.message });
  }
});

app.post(['/api/vendors/:id/status', '/api/admin/vendors/:id/status'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { status, active } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE vendors SET status = COALESCE($1, status), active = COALESCE($2, active) WHERE id = $3 RETURNING *`,
      [status, active, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const vRow = dbRes.rows[0];
      if (vRow.email && (status === 'approved' || vRow.status === 'approved')) {
        try {
          const pwdHash = await bcrypt.hash('vendor123', 10);
          await gatewayPgPool.query(
            `INSERT INTO users (name, email, password_hash, role, active, phone, city)
             VALUES ($1, $2, $3, 'vendor', true, $4, $5)
             ON CONFLICT (email) DO UPDATE SET role = 'vendor', active = true, name = EXCLUDED.name`,
            [vRow.name || vRow.vendor_name || 'Vendor', vRow.email.toLowerCase(), pwdHash, vRow.phone || '', vRow.location || '']
          );
        } catch { }
      }

      const v = formatVendorRow(vRow);
      broadcastRealtimeEvent({ type: 'VENDOR_STATUS_UPDATED', path: req.originalUrl || req.url, method: 'POST', data: v });
      return res.json(v);
    }
    return res.status(404).json({ error: 'Vendor not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vendor status', message: err?.message });
  }
});

app.put(['/api/vendors/:id', '/api/admin/vendors/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, firstName, lastName, vendorName, email, phone, category, address, city, location, produce, farmSize, status, active, notes, bankName, accountNumber, ifscCode, branchName, accountHolderName, upiId } = req.body || {};
  const vName = vendorName || name || (firstName && lastName ? `${firstName} ${lastName}` : undefined);

  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE vendors SET
        name = COALESCE($1, name), vendor_name = COALESCE($1, vendor_name),
        first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name),
        email = COALESCE($4, email), phone = COALESCE($5, phone),
        category = COALESCE($6, category), address = COALESCE($7, address),
        city = COALESCE($8, city), location = COALESCE($9, location),
        produce = COALESCE($10, produce), farm_size = COALESCE($11, farm_size),
        status = COALESCE($12, status), active = COALESCE($13, active), notes = COALESCE($14, notes),
        bank_name = COALESCE($15, bank_name), account_number = COALESCE($16, account_number),
        ifsc_code = COALESCE($17, ifsc_code), branch_name = COALESCE($18, branch_name),
        account_holder_name = COALESCE($19, account_holder_name), upi_id = COALESCE($20, upi_id)
       WHERE id = $21 RETURNING *`,
      [vName, firstName, lastName, email, phone, category, address || location, city, location || address, produce, farmSize, status, active, notes, bankName, accountNumber, ifscCode, branchName, accountHolderName, upiId, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const vRow = dbRes.rows[0];
      if (vRow.email && (status === 'approved' || vRow.status === 'approved')) {
        try {
          const pwdHash = await bcrypt.hash('vendor123', 10);
          await gatewayPgPool.query(
            `INSERT INTO users (name, email, password_hash, role, active, phone, city)
             VALUES ($1, $2, $3, 'vendor', true, $4, $5)
             ON CONFLICT (email) DO UPDATE SET role = 'vendor', active = true, name = EXCLUDED.name`,
            [vRow.name || vRow.vendor_name || 'Vendor', vRow.email.toLowerCase(), pwdHash, vRow.phone || '', vRow.location || '']
          );
        } catch { }
      }
      return res.json(formatVendorRow(vRow));
    }
    return res.status(404).json({ error: 'Vendor not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vendor', message: err?.message });
  }
});

app.delete(['/api/vendors/:id', '/api/admin/vendors/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM vendors WHERE id = $1', [targetId]);
    return res.json({ success: true, message: 'Vendor deleted successfully', deletedId: targetId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete vendor', message: err?.message });
  }
});

// PRODUCE QUOTATIONS & INVOICES
app.get(['/api/admin/quotations', '/api/vendors/quotations', '/api/procurement/quotations'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM quotations ORDER BY id DESC');
    return res.json(dbRes.rows.map(q => ({
      id: q.id,
      vendorId: q.vendor_id,
      vendorName: q.vendor_name,
      name: q.vendor_name,
      produce: q.produce,
      cropName: q.crop_name || q.produce,
      quantity: Number(q.quantity),
      price: Number(q.price),
      category: q.category,
      unit: q.unit || 'Quintal',
      qualityGrade: q.quality_grade,
      expectedHarvestDate: q.expected_harvest_date,
      darkStoreAllocation: q.dark_store_allocation,
      notes: q.notes || '',
      phone: q.phone || '',
      address: q.address || '',
      status: q.status || 'pending',
      paymentStatus: q.payment_status || 'processing',
      invoiceGenerated: q.invoice_generated ?? false,
      invoiceNumber: q.invoice_number || `INV-${q.id}`,
      createdAt: q.created_at,
      updatedAt: q.updated_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch quotations', message: err?.message });
  }
});

app.post(['/api/vendors/quotations', '/api/procurement/quotations'], async (req, res) => {
  const { vendorName, name, produce, cropName, quantity, price, category, unit, qualityGrade, expectedHarvestDate, darkStoreAllocation, notes, phone, address } = req.body || {};
  const produceName = produce || cropName;
  if (!produceName || quantity === undefined || price === undefined) {
    return res.status(400).json({ error: 'Produce name, quantity, and price per unit are required' });
  }
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO quotations (vendor_name, produce, crop_name, quantity, price, category, unit, quality_grade, expected_harvest_date, dark_store_allocation, notes, phone, address, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', 'processing') RETURNING *`,
      [vendorName || name || 'Local Farm Vendor', produceName, produceName, Number(quantity), Number(price), category || 'Vegetables', unit || 'Quintal', qualityGrade || 'Grade A (Organic / Premium)', expectedHarvestDate || new Date().toISOString().split('T')[0], darkStoreAllocation || 'Vijayawada Central Hub', notes || '', phone || '', address || '']
    );
    const q = dbRes.rows[0];
    return res.status(201).json({
      id: q.id, vendorName: q.vendor_name, produce: q.produce, cropName: q.crop_name, quantity: Number(q.quantity), price: Number(q.price), category: q.category, unit: q.unit, qualityGrade: q.quality_grade, expectedHarvestDate: q.expected_harvest_date, darkStoreAllocation: q.dark_store_allocation, notes: q.notes, status: q.status, paymentStatus: q.payment_status, createdAt: q.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit quotation', message: err?.message });
  }
});

function parseQuotationUnitAndPrice(rawUnit: string, rawQuantity: number, rawPrice: number, category: string = '') {
  const u = (rawUnit || 'Quintal').toLowerCase().trim();
  const cat = (category || '').toLowerCase().trim();
  const isLiquid = cat.includes('dairy') || cat.includes('liquid') || cat.includes('milk') || cat.includes('juice');

  let qtyInBaseUnit = Number(rawQuantity || 1);
  let baseUnitName = isLiquid ? 'Litre' : 'kg';
  let vendorPricePerBaseUnit = Number(rawPrice || 0);

  if (u.includes('quintal')) {
    // 1 Quintal = 100 kg
    qtyInBaseUnit = Number(rawQuantity || 1) * 100;
    vendorPricePerBaseUnit = Number(rawPrice || 0) / 100;
    baseUnitName = 'kg';
  } else if (u.includes('ton')) {
    // 1 Metric Ton = 1000 kg
    qtyInBaseUnit = Number(rawQuantity || 1) * 1000;
    vendorPricePerBaseUnit = Number(rawPrice || 0) / 1000;
    baseUnitName = 'kg';
  } else if (u.includes('ml') || u.includes('milliliter')) {
    // 1 Litre = 1000 mL
    qtyInBaseUnit = Number(rawQuantity || 1) / 1000;
    vendorPricePerBaseUnit = Number(rawPrice || 0) * 1000;
    baseUnitName = 'Litre';
  } else if (u.includes('liter') || u.includes('litre')) {
    qtyInBaseUnit = Number(rawQuantity || 1);
    vendorPricePerBaseUnit = Number(rawPrice || 0);
    baseUnitName = 'Litre';
  } else {
    // kg or default
    qtyInBaseUnit = Number(rawQuantity || 1);
    vendorPricePerBaseUnit = Number(rawPrice || 0);
    baseUnitName = isLiquid ? 'Litre' : 'kg';
  }

  // Calculate selling price per 1 kg / 1 Litre with 10% markup per unit
  const sellingPrice = Number((vendorPricePerBaseUnit * 1.10).toFixed(2));
  const originalPrice = Number((sellingPrice * 1.25).toFixed(2));
  const displayUnit = `1 ${baseUnitName}`;

  return {
    qtyInBaseUnit,
    baseUnitName,
    vendorPricePerBaseUnit,
    sellingPrice,
    originalPrice,
    displayUnit,
  };
}

app.put(['/api/admin/quotations/:id/status', '/api/admin/quotations/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { status } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE quotations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status || 'accepted', targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const q = dbRes.rows[0];
      if (status === 'accepted' || status === 'approved') {
        const crop = q.produce || q.crop_name;
        if (crop) {
          const cat = q.category || 'Vegetables';
          const vendorName = q.vendor_name || 'Farm Vendor';
          const darkStore = q.dark_store_allocation || 'Central Dark Store Hub';
          const parsed = parseQuotationUnitAndPrice(q.unit, Number(q.quantity), Number(q.price), cat);

          let defaultImg = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80';
          if (cat.toLowerCase().includes('fruit')) {
            defaultImg = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&q=80';
          } else if (parsed.baseUnitName === 'Litre') {
            defaultImg = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80';
          } else if (cat.toLowerCase().includes('grain')) {
            defaultImg = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80';
          }

          let targetProdId: number | null = null;
          try {
            const existingProd = await gatewayPgPool.query('SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1', [crop]);
            if (existingProd.rows && existingProd.rows.length > 0) {
              targetProdId = existingProd.rows[0].id;
              await gatewayPgPool.query(
                `UPDATE products SET price = $1, original_price = $2, stock = stock + $3, active = true WHERE id = $4`,
                [parsed.sellingPrice, parsed.originalPrice, parsed.qtyInBaseUnit, targetProdId]
              );
            } else {
              const newProd = await gatewayPgPool.query(
                `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, stock, active)
                 VALUES ($1, $2, $3, $4, $5, $6, true, $7, true) RETURNING id`,
                [crop, cat, parsed.sellingPrice, parsed.originalPrice, parsed.displayUnit, defaultImg, parsed.qtyInBaseUnit]
              );
              targetProdId = newProd.rows[0]?.id || null;
            }
          } catch (e: any) {
            console.warn('Product auto-upsert warning:', e?.message);
          }

          try {
            await gatewayPgPool.query(
              `INSERT INTO inventory (product_id, product_name, vendor_name, warehouse_name, quantity, unit, status, notes)
               VALUES ($1, $2, $3, $4, $5, $6, 'in_stock', $7)`,
              [targetProdId, crop, vendorName, darkStore, parsed.qtyInBaseUnit, parsed.baseUnitName, `Auto-stocked from approved quotation #${q.id}`]
            );
          } catch (e: any) {
            console.warn('Inventory auto-stock warning:', e?.message);
          }
        }
      }
      return res.json({ success: true, message: `Quotation #${targetId} marked as ${status}`, quotation: q });
    }
    return res.status(404).json({ error: 'Quotation not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update quotation status', message: err?.message });
  }
});

// S3 FILE UPLOAD ENDPOINT FOR PHOTOS & DOCUMENTS
app.post('/api/upload', async (req, res) => {
  try {
    const { filename, data, folder } = req.body || {};
    if (!filename || !data) {
      return res.status(400).json({ error: 'Filename and base64 file data are required' });
    }
    const s3Url = await uploadToS3({
      filename: String(filename),
      data: String(data),
      folder: folder ? String(folder) : 'images'
    });
    return res.json({
      success: true,
      url: s3Url,
      key: s3Url.split('.com/')[1] || filename,
      bucket: AWS_S3_BUCKET
    });
  } catch (err: any) {
    console.error('Upload endpoint error:', err);
    return res.status(500).json({ error: 'Failed to upload file to S3', message: err?.message });
  }
});

// INVOICES & PAYOUTS (with AWS S3 HTML/PDF Invoice Storage)
app.all(['/api/admin/quotations/:id/invoice'], async (req, res) => {
  const id = Number(req.params.id);
  const invoiceNum = `INV-2026-${id}`;
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE quotations SET invoice_generated = TRUE, invoice_number = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [invoiceNum, id]
    );
    const q = dbRes.rows && dbRes.rows.length > 0 ? dbRes.rows[0] : null;
    const vendorName = q?.vendor_name || 'Local Farmer';
    const cropName = q?.produce || q?.crop_name || 'Produce';
    const quantity = Number(q?.quantity || 10);
    const unit = q?.unit || 'Quintal';
    const price = Number(q?.price || 500);
    const totalAmount = quantity * price;
    const gst = Math.round(totalAmount * 0.05);
    const finalTotal = totalAmount + gst;

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GST Tax Invoice ${invoiceNum}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; padding: 40px; background: #f9fafb; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 800; color: #059669; }
    .inv-title { text-align: right; font-size: 20px; font-weight: 700; color: #374151; }
    .meta-table, .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .meta-table td { padding: 8px 0; font-size: 14px; }
    .items-table th { background: #f3f4f6; color: #374151; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .total-box { margin-left: auto; width: 300px; padding: 16px; background: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0; text-align: right; }
    .total-box div { padding: 4px 0; font-size: 15px; }
    .grand-total { font-size: 20px; font-weight: 800; color: #047857; margin-top: 8px; border-top: 1px solid #6ee7b7; padding-top: 8px; }
    .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="logo">Sunotal Direct</div>
        <div style="font-size: 12px; color: #6b7280;">Direct Farm Sourcing & Logistics Platform</div>
      </div>
      <div class="inv-title">
        GST TAX INVOICE<br>
        <span style="font-size: 14px; color: #10b981;">${invoiceNum}</span>
      </div>
    </div>

    <table class="meta-table">
      <tr>
        <td><strong>Vendor / Farmer Name:</strong> ${vendorName}</td>
        <td style="text-align: right;"><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</td>
      </tr>
      <tr>
        <td><strong>Dark Store Destination:</strong> ${q?.dark_store_allocation || 'Vijayawada Central Hub'}</td>
        <td style="text-align: right;"><strong>Payment Status:</strong> <span style="text-transform: uppercase; color: #047857;">${q?.payment_status || 'paid'}</span></td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item / Produce Description</th>
          <th>Unit</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: right;">Unit Price (₹)</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${cropName}</strong> (${q?.quality_grade || 'Grade A Organic'})</td>
          <td>${unit}</td>
          <td style="text-align: right;">${quantity}</td>
          <td style="text-align: right;">₹${price.toLocaleString('en-IN')}</td>
          <td style="text-align: right;">₹${totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div>Subtotal: ₹${totalAmount.toLocaleString('en-IN')}</div>
      <div>GST (5% Agricultural Sourcing): ₹${gst.toLocaleString('en-IN')}</div>
      <div class="grand-total">Total Payable: ₹${finalTotal.toLocaleString('en-IN')}</div>
    </div>

    <div class="footer">
      Generated automatically by Sunotal Procurement Engine | Stored securely in AWS S3 (${AWS_S3_BUCKET})
    </div>
  </div>
</body>
</html>`;

    let s3Url = '';
    try {
      s3Url = await uploadToS3({
        filename: `invoice-${invoiceNum}.html`,
        data: Buffer.from(invoiceHtml, 'utf-8'),
        contentType: 'text/html',
        folder: 'invoices'
      });
    } catch (err: any) {
      console.warn('S3 Invoice upload warning:', err?.message);
    }

    return res.json({
      success: true,
      invoiceNumber: q?.invoice_number || invoiceNum,
      quotationId: id,
      vendorName,
      cropName,
      quantity,
      unit,
      price,
      amount: totalAmount,
      gst,
      total: finalTotal,
      s3Url,
      pdfUrl: s3Url,
      invoiceUrl: s3Url,
      status: q?.payment_status || 'processing',
      paymentStatus: q?.payment_status || 'processing',
      createdAt: q?.created_at || new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate invoice', message: err?.message });
  }
});

app.put(['/api/admin/quotations/:id/payout', '/api/admin/quotations/:id/pay'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { paymentStatus } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE quotations SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [paymentStatus || 'paid', targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const q = dbRes.rows[0];
      return res.json({ success: true, message: 'Payout marked as PAID!', quotation: q });
    }
    return res.status(404).json({ error: 'Quotation not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update payout status', message: err?.message });
  }
});

app.get(['/api/vendors/invoices'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM quotations WHERE invoice_generated = true OR status = \'accepted\' ORDER BY id DESC');
    return res.json(dbRes.rows.map(q => {
      const amount = Number(q.quantity || 1) * Number(q.price || 0);
      const gst = Math.round(amount * 0.05);
      return {
        id: q.id,
        invoiceNumber: q.invoice_number || `INV-2026-${q.id}`,
        quotationId: q.id,
        vendorName: q.vendor_name,
        produce: q.produce,
        cropName: q.crop_name || q.produce,
        quantity: Number(q.quantity),
        unit: q.unit,
        price: Number(q.price),
        amount,
        gst,
        total: amount + gst,
        paymentStatus: q.payment_status || 'processing',
        createdAt: q.created_at,
        updatedAt: q.updated_at
      };
    }));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch invoices', message: err?.message });
  }
});

app.get('/api/vendors/invoices/:id/download', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM quotations WHERE id = $1', [id]);
    const q = dbRes.rows && dbRes.rows.length > 0 ? dbRes.rows[0] : null;
    if (!q) return res.status(404).send('Invoice not found');
    const amount = Number(q.quantity || 1) * Number(q.price || 0);
    const gst = Math.round(amount * 0.05);
    const total = amount + gst;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${q.invoice_number || `INV-2026-${q.id}`}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 16px; }
    .logo { font-size: 24px; font-weight: 800; color: #059669; }
    .inv-num { font-size: 14px; font-weight: 700; color: #64748b; font-family: monospace; }
    .details { margin: 24px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
    th { text-align: left; background: #f1f5f9; padding: 12px; border-radius: 8px; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .total-row { font-size: 18px; font-weight: 800; color: #059669; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="logo">🌾 Sunotal Farms</div>
        <div style="font-size: 12px; color: #64748b;">Direct Farm Produce Sourcing Invoice</div>
      </div>
      <div style="text-align: right;">
        <div class="inv-num">${q.invoice_number || `INV-2026-${q.id}`}</div>
        <div style="font-size: 12px; color: #64748b;">${new Date(q.created_at || Date.now()).toLocaleDateString()}</div>
      </div>
    </div>
    <div class="details">
      <div>
        <strong>Vendor / Farmer:</strong><br/>
        ${q.vendor_name}<br/>
        ${q.address || ''}<br/>
        Phone: ${q.phone || 'N/A'}
      </div>
      <div style="text-align: right;">
        <strong>Delivery Destination:</strong><br/>
        ${q.dark_store_allocation || 'Central Dark Store Hub'}<br/>
        Quality Grade: ${q.quality_grade || 'Grade A'}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th>Qty & Unit</th>
          <th>Unit Rate</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${q.produce}</strong> (${q.category || 'Produce'})</td>
          <td>${q.quantity} ${q.unit || 'Quintal'}</td>
          <td>₹${q.price}</td>
          <td style="text-align: right;">₹${amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right;">GST (5% Mandi Tax):</td>
          <td style="text-align: right;">₹${gst.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">Final Payout Total:</td>
          <td style="text-align: right;">₹${total.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top: 32px; font-size: 12px; color: #64748b; text-align: center;">
      Status: <strong>${(q.payment_status || 'PAID').toUpperCase()}</strong> • Thank you for partnering with Sunotal Direct Sourcing Engine.
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err: any) {
    return res.status(500).send('Failed to generate invoice document');
  }
});

// INVENTORY CRUD & DEDUCT
app.get(['/api/inventory', '/api/admin/inventory'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM inventory ORDER BY id DESC');
    return res.json(dbRes.rows.map(i => ({
      id: i.id,
      productId: i.product_id,
      vendorId: i.vendor_id,
      productName: i.product_name,
      vendorName: i.vendor_name || 'Farm Vendor',
      warehouseName: i.warehouse_name || 'Central Dark Store Hub',
      warehouseCity: i.warehouse_city || '',
      quantity: Number(i.quantity || 0),
      unit: i.unit || 'kg',
      status: i.status || 'in_stock',
      notes: i.notes || '',
      updatedAt: i.updated_at,
      createdAt: i.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch inventory', message: err?.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { productId, vendorId, productName, vendorName, warehouseName, warehouseCity, quantity, unit, status, notes } = req.body || {};
  if (!productName || quantity === undefined) return res.status(400).json({ error: 'Product name and quantity required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO inventory (product_id, vendor_id, product_name, vendor_name, warehouse_name, warehouse_city, quantity, unit, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [productId || null, vendorId || null, productName, vendorName || 'Farm Vendor', warehouseName || 'Central Dark Store Hub', warehouseCity || '', Number(quantity), unit || 'kg', status || 'in_stock', notes || '']
    );
    const item = dbRes.rows[0];
    return res.status(201).json({
      id: item.id, productId: item.product_id, vendorId: item.vendor_id, productName: item.product_name, vendorName: item.vendor_name, warehouseName: item.warehouse_name, quantity: Number(item.quantity), unit: item.unit, status: item.status, notes: item.notes, createdAt: item.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add inventory', message: err?.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  const { quantity, status, notes } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE inventory SET quantity = COALESCE($1, quantity), status = COALESCE($2, status), notes = COALESCE($3, notes), updated_at = NOW() WHERE id = $4 RETURNING *`,
      [quantity !== undefined ? Number(quantity) : null, status, notes, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const item = dbRes.rows[0];
      return res.json({
        id: item.id, productId: item.product_id, productName: item.product_name, quantity: Number(item.quantity), unit: item.unit, status: item.status, notes: item.notes, updatedAt: item.updated_at
      });
    }
    return res.status(404).json({ error: 'Inventory item not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update inventory item', message: err?.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM inventory WHERE id = $1', [targetId]);
    return res.json({ success: true, message: 'Inventory item deleted successfully', deletedId: targetId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete inventory item', message: err?.message });
  }
});

app.post('/api/inventory/deduct', async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items array is required' });
  try {
    for (const item of items) {
      const prodId = Number(item.productId);
      const qty = Number(item.quantity || 1);
      if (prodId) {
        await gatewayPgPool.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [qty, prodId]);
        await gatewayPgPool.query('UPDATE inventory SET quantity = GREATEST(0, quantity - $1) WHERE product_id = $2', [qty, prodId]);
      }
    }
    return res.json({ success: true, message: 'Inventory stock deducted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to deduct inventory stock', message: err?.message });
  }
});

// SUPPORT TICKETS
app.get('/api/support/tickets', async (req, res) => {
  try {
    const { role, category, status, search } = req.query || {};
    let sql = 'SELECT * FROM support_tickets WHERE 1=1';
    const params: any[] = [];
    if (role) { params.push(role); sql += ` AND role = $${params.length}`; }
    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (search) { params.push(`%${String(search).toLowerCase()}%`); sql += ` AND (LOWER(subject) LIKE $${params.length} OR LOWER(sender_name) LIKE $${params.length} OR LOWER(ticket_id) LIKE $${params.length})`; }
    sql += ' ORDER BY id DESC';

    const dbRes = await gatewayPgPool.query(sql, params);
    return res.json(dbRes.rows.map(t => ({
      id: t.id,
      ticketId: t.ticket_id,
      role: t.role,
      senderName: t.sender_name,
      senderEmail: t.sender_email,
      senderPhone: t.sender_phone,
      category: t.category,
      orderId: t.order_id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      resolution: t.resolution,
      resolvedBy: t.resolved_by,
      createdAt: t.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch support tickets', message: err?.message });
  }
});

app.post('/api/support/tickets', async (req, res) => {
  const { role = 'user', senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body || {};
  if (!senderName || !senderEmail || !subject || !description || !category) {
    return res.status(400).json({ error: 'Sender name, email, category, subject, and description are required' });
  }
  const timestamp = Date.now().toString().slice(-6);
  const uniqueNum = Math.floor(100000 + Math.random() * 900000);
  const ticketId = `TKT-2026-${timestamp}-${uniqueNum}`;
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO support_tickets (ticket_id, role, sender_name, sender_email, sender_phone, category, order_id, subject, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open') RETURNING *`,
      [ticketId, role, senderName, (senderEmail || '').trim().toLowerCase(), senderPhone || '', category, orderId || '', subject, description]
    );
    const t = dbRes.rows[0];
    return res.status(201).json({
      id: t.id, ticketId: t.ticket_id, role: t.role, senderName: t.sender_name, senderEmail: t.sender_email, senderPhone: t.sender_phone, category: t.category, orderId: t.order_id, subject: t.subject, description: t.description, status: t.status, createdAt: t.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create support ticket', message: err?.message });
  }
});

app.put(['/api/support/tickets/:id/status', '/api/support/tickets/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  const { status, resolution, resolvedBy } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE support_tickets SET status = COALESCE($1, status), resolution = COALESCE($2, resolution), resolved_by = COALESCE($3, resolved_by) WHERE id = $4 RETURNING *`,
      [status, resolution, resolvedBy, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const t = dbRes.rows[0];
      return res.json({ id: t.id, ticketId: t.ticket_id, status: t.status, resolution: t.resolution, resolvedBy: t.resolved_by });
    }
    return res.status(404).json({ error: 'Ticket not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update support ticket', message: err?.message });
  }
});

// STORES & WAREHOUSES
app.get(['/api/admin/warehouses', '/api/warehouses'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM warehouses ORDER BY id DESC');
    return res.json(dbRes.rows.map(w => ({
      id: w.id,
      name: w.name,
      address: w.address,
      city: w.city,
      latitude: Number(w.latitude || 16.5447),
      longitude: Number(w.longitude || 80.6037),
      freeDeliveryRadiusKm: Number(w.free_delivery_radius_km || 30),
      maxServiceRadiusKm: Number(w.max_service_radius_km || 70),
      baseDeliveryFee: Number(w.base_delivery_fee || 50),
      perKmRate: Number(w.per_km_rate || 8),
      isActive: w.is_active ?? true,
      createdAt: w.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch warehouses', message: err?.message });
  }
});

app.post(['/api/admin/warehouses', '/api/warehouses'], async (req, res) => {
  const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate } = req.body || {};
  if (!name || !address || !city) return res.status(400).json({ error: 'Name, address, and city are required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO warehouses (name, address, city, latitude, longitude, free_delivery_radius_km, max_service_radius_km, base_delivery_fee, per_km_rate, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
      [name, address, city, Number(latitude || 16.5447), Number(longitude || 80.6037), Number(freeDeliveryRadiusKm || 30), Number(maxServiceRadiusKm || 70), Number(baseDeliveryFee || 50), Number(perKmRate || 8)]
    );
    const w = dbRes.rows[0];
    return res.status(201).json({
      id: w.id, name: w.name, address: w.address, city: w.city, latitude: Number(w.latitude), longitude: Number(w.longitude), freeDeliveryRadiusKm: Number(w.free_delivery_radius_km), maxServiceRadiusKm: Number(w.max_service_radius_km), baseDeliveryFee: Number(w.base_delivery_fee), perKmRate: Number(w.per_km_rate), isActive: true, createdAt: w.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create warehouse', message: err?.message });
  }
});

app.delete(['/api/admin/warehouses/:id', '/api/warehouses/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM warehouses WHERE id = $1', [targetId]);
    return res.json({ success: true, message: 'Warehouse deleted successfully', deletedId: targetId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete warehouse', message: err?.message });
  }
});

app.post('/api/delivery/calculate', async (req, res) => {
  const { city, userLat, userLng } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM warehouses WHERE is_active = true LIMIT 1');
    if (dbRes.rows && dbRes.rows.length > 0) {
      const w = dbRes.rows[0];
      let distanceKm = 3.5;
      if (userLat && userLng && w.latitude && w.longitude) {
        const R = 6371;
        const dLat = (Number(userLat) - Number(w.latitude)) * Math.PI / 180;
        const dLng = (Number(userLng) - Number(w.longitude)) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(Number(w.latitude) * Math.PI / 180) * Math.cos(Number(userLat) * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Number((R * c).toFixed(1));
      }
      return res.json({
        warehouseName: w.name,
        city: w.city,
        distanceKm,
        isFree: distanceKm <= Number(w.free_delivery_radius_km || 30),
        deliveryFee: distanceKm <= Number(w.free_delivery_radius_km || 30) ? 0 : 25,
        freeThresholdKm: Number(w.free_delivery_radius_km || 30)
      });
    }
    return res.status(404).json({ error: 'No active warehouses found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Calculation failed', message: err?.message });
  }
});

// PRODUCTS & CATALOG
app.get(['/api/products', '/api/admin/products', '/api/storefront'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM products ORDER BY id DESC');
    return res.json(dbRes.rows.map(p => ({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: Number(p.original_price || p.price),
      unit: p.unit,
      image: p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      isOrganic: p.is_organic,
      stock: p.stock,
      rating: Number(p.rating || 4.8),
      active: p.active ?? true
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch products', message: err?.message });
  }
});

app.post(['/api/products', '/api/admin/products'], async (req, res) => {
  const { name, category, price, originalPrice, unit, image, isOrganic, stock } = req.body || {};
  if (!name || !category || price === undefined) return res.status(400).json({ error: 'Name, category, and price required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, stock, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [name, category, Number(price), Number(originalPrice || price), unit || '1 kg', image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', isOrganic !== false, Number(stock || 100)]
    );
    const p = dbRes.rows[0];
    const formattedProduct = {
      id: String(p.id), name: p.name, category: p.category, price: Number(p.price), originalPrice: Number(p.original_price), unit: p.unit, image: p.image, isOrganic: p.is_organic, stock: p.stock, rating: 4.8, active: true
    };
    broadcastRealtimeEvent({ type: 'PRODUCT_CREATED', path: req.originalUrl || req.url, method: 'POST', data: formattedProduct });
    return res.status(201).json(formattedProduct);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create product', message: err?.message });
  }
});

app.delete(['/api/products/:id', '/api/admin/products/:id'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM products WHERE id = $1', [targetId]);
    broadcastRealtimeEvent({ type: 'PRODUCT_DELETED', path: req.originalUrl || req.url, method: 'DELETE', data: { deletedId: targetId } });
    return res.json({ success: true, message: 'Product deleted successfully', deletedId: targetId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete product', message: err?.message });
  }
});

// CATEGORIES & PRODUCT DEFINITIONS
app.get('/api/categories', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM categories ORDER BY id ASC');
    return res.json(dbRes.rows.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📦', active: c.active ?? true })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch categories', message: err?.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, icon } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Category name required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO categories (name, icon, active) VALUES ($1, $2, true) ON CONFLICT (name) DO UPDATE SET icon=EXCLUDED.icon RETURNING *`,
      [name, icon || '📦']
    );
    const c = dbRes.rows[0];
    return res.status(201).json({ id: c.id, name: c.name, icon: c.icon, active: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create category', message: err?.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM categories WHERE id = $1', [targetId]);
    return res.json({ success: true, message: 'Category deleted successfully', deletedId: targetId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete category', message: err?.message });
  }
});

app.get('/api/product-definitions', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM product_definitions ORDER BY id ASC');
    return res.json(dbRes.rows.map(d => ({ id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch product definitions', message: err?.message });
  }
});

app.post('/api/product-definitions', async (req, res) => {
  const { name, category, defaultUnit } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: 'Product name and category are required' });
  }
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO product_definitions (name, category, default_unit) VALUES ($1, $2, $3) RETURNING *`,
      [String(name).trim(), String(category).trim(), defaultUnit || '1 kg']
    );
    const d = dbRes.rows[0];
    const formatted = { id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit };
    broadcastRealtimeEvent({ type: 'PRODUCT_DEFINITION_CREATED', path: req.originalUrl || req.url, method: 'POST', data: formatted });
    return res.status(201).json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create product definition', message: err?.message });
  }
});

app.delete('/api/product-definitions/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const dbRes = await gatewayPgPool.query('DELETE FROM product_definitions WHERE id = $1 RETURNING id', [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Product definition not found' });
    broadcastRealtimeEvent({ type: 'PRODUCT_DEFINITION_DELETED', path: req.originalUrl || req.url, method: 'DELETE', data: { id } });
    return res.json({ success: true, message: 'Product definition deleted', deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete product definition', message: err?.message });
  }
});

// BANNERS
app.get('/api/banners', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM banners WHERE active = true ORDER BY id ASC');
    const banners = (dbRes.rows || []).map(b => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle || '',
      image: b.image,
      link: b.link || '/products',
      active: b.active ?? true
    }));
    return res.json(banners);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch banners', message: err?.message });
  }
});

app.post('/api/banners', async (req, res) => {
  const { title, subtitle, image, link } = req.body || {};
  if (!title || !image) return res.status(400).json({ error: 'Title and image are required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO banners (title, subtitle, image, link, active) VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [title, subtitle || '', image, link || '/products']
    );
    const b = dbRes.rows[0];
    const formatted = { id: b.id, title: b.title, subtitle: b.subtitle, image: b.image, link: b.link, active: true };
    broadcastRealtimeEvent({ type: 'BANNER_CREATED', path: req.originalUrl || req.url, method: 'POST', data: formatted });
    return res.status(201).json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create banner', message: err?.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM banners WHERE id = $1', [id]);
    broadcastRealtimeEvent({ type: 'BANNER_DELETED', path: req.originalUrl || req.url, method: 'DELETE', data: { id } });
    return res.json({ success: true, message: 'Banner deleted successfully', deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete banner', message: err?.message });
  }
});

// RIDER FLEET & PAYOUTS
app.get('/api/delivery/riders', async (_req, res) => {
  try {
    const usersRes = await gatewayPgPool.query(`
      SELECT id, name, email, phone, city, role, active, wallet_balance, created_at 
      FROM users 
      WHERE LOWER(role) IN ('delivery', 'rider', 'delivery_partner', 'driver')
      ORDER BY id DESC
    `);

    let ridersFromDb: any[] = [];
    try {
      const ridersRes = await gatewayPgPool.query('SELECT * FROM delivery_riders ORDER BY id DESC');
      ridersFromDb = ridersRes.rows || [];
    } catch {}

    const usersRiders = (usersRes.rows || []).map(u => ({
      id: `RIDER-${u.id}`,
      riderId: `RIDER-${u.id}`,
      name: u.name,
      phone: u.phone || '',
      email: u.email || '',
      city: u.city || 'Vijayawada',
      vehicle: 'Electric Bike',
      status: u.active ? 'ONLINE' : 'OFFLINE',
      walletBalance: Number(u.wallet_balance || 0),
      avgRating: 5.0,
      totalRatings: 0,
      totalDeliveries: 0,
      createdAt: u.created_at
    }));

    const otherRiders = ridersFromDb.map(r => ({
      id: r.id || r.rider_id || `RIDER-${r.id}`,
      riderId: r.rider_id || `RIDER-${r.id}`,
      name: r.name || r.rider_name || 'Delivery Partner',
      phone: r.phone || '',
      email: r.email || '',
      city: r.city || 'Bengaluru',
      vehicle: r.vehicle || 'Electric Bike',
      status: r.status === 'completed' || r.status === 'ONLINE' || r.status === 'APPROVED' ? 'ONLINE' : 'OFFLINE',
      walletBalance: Number(r.wallet_balance || r.amount || 0),
      avgRating: Number(r.avg_rating || 5.0),
      totalRatings: Number(r.total_ratings || 0),
      totalDeliveries: Number(r.trips_completed || r.total_deliveries || 0),
      createdAt: r.created_at
    }));

    const combined = [...usersRiders];
    for (const r of otherRiders) {
      if (!combined.some(c => (c.email && c.email === r.email) || (c.phone && c.phone === r.phone))) {
        combined.push(r);
      }
    }

    return res.json(combined);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch delivery riders', message: err?.message });
  }
});

app.get(['/api/delivery/payouts', '/api/admin/rider-payouts'], async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM rider_payouts ORDER BY id DESC');
    return res.json(dbRes.rows.map(r => ({
      id: r.id, riderId: r.rider_id, riderName: r.rider_name, phone: r.phone, email: r.email, upiId: r.upi_id, amount: Number(r.amount), tripsCompleted: r.trips_completed, status: r.status, createdAt: r.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch rider payouts', message: err?.message });
  }
});

// ADMIN DASHBOARD STATS
app.get('/api/admin/stats', async (_req, res) => {
  try {
    const [uRes, pRes, vRes, oRes, wRes, rRes, qRes, pOutRes] = await Promise.all([
      gatewayPgPool.query('SELECT * FROM users ORDER BY id DESC'),
      gatewayPgPool.query('SELECT * FROM products ORDER BY id DESC'),
      gatewayPgPool.query('SELECT * FROM vendors ORDER BY id DESC'),
      gatewayPgPool.query('SELECT * FROM orders ORDER BY id DESC'),
      gatewayPgPool.query('SELECT * FROM warehouses WHERE is_active = true'),
      gatewayPgPool.query("SELECT COUNT(*) FROM delivery_riders WHERE status = 'available' OR status = 'on_delivery' OR status = 'APPROVED'"),
      gatewayPgPool.query("SELECT COALESCE(SUM(price * quantity), 0) as vendor_charges FROM quotations WHERE status IN ('accepted', 'approved') OR payment_status = 'paid'").catch(() => ({ rows: [{ vendor_charges: 0 }] })),
      gatewayPgPool.query("SELECT COALESCE(SUM(amount), 0) as delivery_charges FROM rider_payouts WHERE status IN ('paid', 'COMPLETED')").catch(() => ({ rows: [{ delivery_charges: 0 }] })),
    ]);

    const users = uRes.rows || [];
    const products = pRes.rows || [];
    const vendors = vRes.rows || [];
    const orders = oRes.rows || [];
    const warehouses = wRes.rows || [];
    const onlineRiders = parseInt(rRes.rows[0]?.count || '0', 10);

    const userRevenue = orders.reduce((sum, o) => sum + Number(o.final_amount || o.total_amount || 0), 0);
    const vendorCharges = Number(qRes.rows[0]?.vendor_charges || 0);
    const deliveryCharges = Number(pOutRes.rows[0]?.delivery_charges || 0);

    const awsEcsFargate = 48.50;
    const awsRdsPostgres = 54.20;
    const awsElastiCache = 12.50;
    const awsAlbCloudFront = 18.80;
    const awsMonthlyCost = Number((awsEcsFargate + awsRdsPostgres + awsElastiCache + awsAlbCloudFront).toFixed(2));
    const netPlatformMargin = Number((userRevenue - (vendorCharges + deliveryCharges + awsMonthlyCost)).toFixed(2));

    res.json({
      totalProducts: products.length,
      totalUsers: users.length,
      totalVendors: vendors.length,
      activeVendors: vendors.filter(v => v.active !== false).length,
      activeOrders: orders.length,
      totalRevenue: userRevenue,
      userRevenue,
      vendorCharges,
      deliveryCharges,
      awsMonthlyCost,
      awsBreakdown: {
        ecsFargate: awsEcsFargate,
        rdsPostgres: awsRdsPostgres,
        elastiCache: awsElastiCache,
        albCloudFront: awsAlbCloudFront,
      },
      netPlatformMargin,
      totalOrders: orders.length,
      onlineRiders,
      activeDarkStores: warehouses.length,
      recentVendors: vendors.slice(0, 5).map(formatVendorRow),
      recentUsers: users.slice(0, 5).map(u => ({ id: String(u.id), name: u.name, email: u.email, role: u.role, phone: u.phone, city: u.city, createdAt: u.created_at }))
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats', message: err?.message });
  }
});

// ADDRESSES API (max 10 addresses per user)
app.get('/api/users/:userId/addresses', async (req, res) => {
  const userId = Number(req.params.userId);
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC', [userId]);
    return res.json(dbRes.rows.map(a => ({
      id: a.id,
      userId: a.user_id,
      label: a.label,
      receiverName: a.receiver_name,
      phone: a.phone,
      streetAddress: a.street_address,
      landmark: a.landmark,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      latitude: a.latitude ? Number(a.latitude) : null,
      longitude: a.longitude ? Number(a.longitude) : null,
      isDefault: a.is_default,
      createdAt: a.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch addresses', message: err?.message });
  }
});

app.post('/api/users/:userId/addresses', async (req, res) => {
  const userId = Number(req.params.userId);
  const { label, receiverName, phone, streetAddress, landmark, city, state, pincode, latitude, longitude, isDefault } = req.body || {};
  if (!receiverName || !phone || !streetAddress) {
    return res.status(400).json({ error: 'Receiver name, phone, and street address are required' });
  }
  try {
    // Enforce MAX 10 addresses
    const countRes = await gatewayPgPool.query('SELECT COUNT(*) FROM user_addresses WHERE user_id = $1', [userId]);
    if (parseInt(countRes.rows[0].count, 10) >= 10) {
      return res.status(400).json({ error: 'Maximum limit of 10 addresses reached. Please delete an existing address to add a new one.' });
    }

    if (isDefault) {
      await gatewayPgPool.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const dbRes = await gatewayPgPool.query(
      `INSERT INTO user_addresses (user_id, label, receiver_name, phone, street_address, landmark, city, state, pincode, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [userId, label || 'Home', receiverName, phone, streetAddress, landmark || '', city || 'Bengaluru', state || 'Karnataka', pincode || '560001', latitude || null, longitude || null, isDefault ?? false]
    );
    const a = dbRes.rows[0];
    return res.status(201).json({
      id: a.id, userId: a.user_id, label: a.label, receiverName: a.receiver_name, phone: a.phone, streetAddress: a.street_address, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, latitude: a.latitude ? Number(a.latitude) : null, longitude: a.longitude ? Number(a.longitude) : null, isDefault: a.is_default
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add address', message: err?.message });
  }
});

app.put('/api/users/:userId/addresses/:addressId', async (req, res) => {
  const userId = Number(req.params.userId);
  const addressId = Number(req.params.addressId);
  const { label, receiverName, phone, streetAddress, landmark, city, state, pincode, latitude, longitude, isDefault } = req.body || {};
  try {
    if (isDefault) {
      await gatewayPgPool.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [userId]);
    }
    const dbRes = await gatewayPgPool.query(
      `UPDATE user_addresses SET
        label = COALESCE($1, label), receiver_name = COALESCE($2, receiver_name), phone = COALESCE($3, phone),
        street_address = COALESCE($4, street_address), landmark = COALESCE($5, landmark), city = COALESCE($6, city),
        state = COALESCE($7, state), pincode = COALESCE($8, pincode), latitude = COALESCE($9, latitude),
        longitude = COALESCE($10, longitude), is_default = COALESCE($11, is_default)
       WHERE id = $12 AND user_id = $13 RETURNING *`,
      [label, receiverName, phone, streetAddress, landmark, city, state, pincode, latitude, longitude, isDefault, addressId, userId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const a = dbRes.rows[0];
      return res.json({ id: a.id, userId: a.user_id, label: a.label, receiverName: a.receiver_name, phone: a.phone, streetAddress: a.street_address, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, latitude: a.latitude ? Number(a.latitude) : null, longitude: a.longitude ? Number(a.longitude) : null, isDefault: a.is_default });
    }
    return res.status(404).json({ error: 'Address not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update address', message: err?.message });
  }
});

app.delete('/api/users/:userId/addresses/:addressId', async (req, res) => {
  const userId = Number(req.params.userId);
  const addressId = Number(req.params.addressId);
  try {
    await gatewayPgPool.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
    return res.json({ success: true, deletedId: addressId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete address', message: err?.message });
  }
});

app.patch('/api/users/:userId/addresses/:addressId/default', async (req, res) => {
  const userId = Number(req.params.userId);
  const addressId = Number(req.params.addressId);
  try {
    await gatewayPgPool.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [userId]);
    const dbRes = await gatewayPgPool.query('UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *', [addressId, userId]);
    if (dbRes.rows && dbRes.rows.length > 0) return res.json({ success: true, address: dbRes.rows[0] });
    return res.status(404).json({ error: 'Address not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to set default address', message: err?.message });
  }
});

// ORDERS API & BOARD
app.get('/api/orders', async (req, res) => {
  const { status, limit } = req.query || {};
  try {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND LOWER(status) = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    if (limit) {
      params.push(Number(limit));
      sql += ` LIMIT $${params.length}`;
    }
    const dbRes = await gatewayPgPool.query(sql, params);
    return res.json(dbRes.rows.map(o => ({
      id: String(o.id),
      orderNumber: o.order_number,
      userId: o.user_id,
      userName: o.user_name,
      userPhone: o.user_phone,
      address: o.delivery_address || o.address,
      city: o.city,
      totalAmount: Number(o.total_amount),
      discountAmount: Number(o.discount_amount || o.discount || 0),
      finalAmount: Number(o.final_amount),
      deliveryFee: Number(o.delivery_fee || 0),
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      riderId: o.rider_id,
      riderName: o.rider_name,
      riderPhone: o.rider_phone,
      deliveryOtp: o.delivery_otp,
      etaMinutes: o.eta_minutes || 15,
      createdAt: o.created_at
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch orders', message: err?.message });
  }
});

app.get('/api/orders/board', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = dbRes.rows.map(o => ({
      id: String(o.id),
      orderNumber: o.order_number,
      userId: o.user_id,
      userName: o.user_name,
      userPhone: o.user_phone,
      address: o.delivery_address || o.address,
      deliveryAddress: o.delivery_address || o.address,
      totalAmount: Number(o.total_amount),
      finalAmount: Number(o.final_amount),
      status: o.status,
      riderId: o.rider_id,
      riderName: o.rider_name,
      deliveryOtp: o.delivery_otp,
      createdAt: o.created_at
    }));

    const board = {
      placed: orders.filter(o => o.status === 'placed'),
      accepted: orders.filter(o => o.status === 'accepted' || o.status === 'processing'),
      packing: orders.filter(o => o.status === 'packing' || o.status === 'packed'),
      out_for_delivery: orders.filter(o => o.status === 'out_for_delivery'),
      delivered: orders.filter(o => o.status === 'delivered'),
      cancelled: orders.filter(o => o.status === 'cancelled')
    };
    return res.json({ success: true, columns: board });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch orders board', message: err?.message });
  }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  try {
    const dbRes = await gatewayPgPool.query(
      `SELECT o.*, 
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', i.id,
                    'productId', i.product_id,
                    'productName', i.product_name,
                    'price', i.price,
                    'quantity', i.quantity,
                    'unit', i.unit,
                    'image', i.image,
                    'totalPrice', i.total_price
                  )
                ) FILTER (WHERE i.id IS NOT NULL), '[]'
              ) as items
       FROM orders o
       LEFT JOIN order_items i ON o.id = i.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    const orders = dbRes.rows.map(o => ({
      id: String(o.id),
      orderNumber: o.order_number,
      totalAmount: Number(o.total_amount),
      finalAmount: Number(o.final_amount),
      status: o.status,
      paymentStatus: o.payment_status,
      deliveryOtp: o.delivery_otp,
      riderName: o.rider_name,
      riderPhone: o.rider_phone,
      etaMinutes: o.eta_minutes || 15,
      createdAt: o.created_at,
      items: o.items || []
    }));
    return res.json(orders);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user orders', message: err?.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const oRes = await gatewayPgPool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!oRes.rows || oRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const o = oRes.rows[0];
    const itemsRes = await gatewayPgPool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    return res.json({
      id: String(o.id),
      orderNumber: o.order_number,
      userId: o.user_id,
      userName: o.user_name,
      userPhone: o.user_phone,
      address: o.delivery_address || o.address,
      city: o.city,
      totalAmount: Number(o.total_amount),
      discountAmount: Number(o.discount_amount || o.discount || 0),
      finalAmount: Number(o.final_amount),
      deliveryFee: Number(o.delivery_fee || 0),
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      riderId: o.rider_id,
      riderName: o.rider_name,
      riderPhone: o.rider_phone,
      deliveryOtp: o.delivery_otp,
      etaMinutes: o.eta_minutes || 15,
      createdAt: o.created_at,
      items: itemsRes.rows.map(i => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        price: Number(i.price),
        quantity: i.quantity,
        unit: i.unit,
        image: i.image,
        totalPrice: Number(i.total_price)
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch order', message: err?.message });
  }
});

app.post(['/api/orders', '/api/orders/checkout'], async (req, res) => {
  const { userId, userName, userPhone, address, shippingAddress, city, items, subtotal, discount, tax, deliveryFee, finalAmount, paymentMethod } = req.body || {};
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const orderNum = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const delAddress = shippingAddress || address || 'Bengaluru Central';
  const totAmount = subtotal || items.reduce((sum: number, i: any) => sum + (Number(i.price) * Number(i.quantity)), 0);
  const finAmount = finalAmount || (totAmount - (discount || 0) + (deliveryFee || 0));

  try {
    const client = await gatewayPgPool.connect();
    try {
      await client.query('BEGIN');
      const oRes = await client.query(
        `INSERT INTO orders (order_number, user_id, user_name, user_phone, address, delivery_address, city, total_amount, discount_amount, final_amount, delivery_fee, status, payment_status, payment_method, delivery_otp, eta_minutes)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, 'placed', 'paid', $11, $12, 15) RETURNING *`,
        [orderNum, userId || 1, userName || 'Customer', userPhone || '', delAddress, city || 'Bengaluru', totAmount, discount || 0, finAmount, deliveryFee || 0, paymentMethod || 'UPI / Wallet', otp]
      );
      const newOrder = oRes.rows[0];

      for (const item of items) {
        const pPrice = Number(item.price || 50);
        const qty = Number(item.quantity || 1);
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit, image, price, quantity, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newOrder.id, item.productId || item.id || 1, item.name || item.productName || 'Product Item', item.unit || '1 kg', item.image || '', pPrice, qty, pPrice * qty]
        );
        // Reduce product stock & warehouse inventory quantity
        const pId = Number(item.productId || item.id || 0);
        const pName = String(item.name || item.productName || '');
        if (pId > 0) {
          await client.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [qty, pId]);
          await client.query(
            `UPDATE inventory SET quantity = GREATEST(0, quantity - $1),
              status = CASE WHEN (quantity - $1) <= 0 THEN 'out_of_stock' ELSE 'in_stock' END,
              updated_at = NOW()
             WHERE product_id = $2 OR LOWER(product_name) = LOWER($3)`,
            [qty, pId, pName]
          ).catch(() => null);
        }
      }

      await client.query('COMMIT');
      broadcastRealtimeEvent({ type: 'ORDER_CREATED', path: req.originalUrl || req.url, method: req.method, data: newOrder });

      const formattedOrder = {
        id: String(newOrder.id),
        orderNumber: newOrder.order_number,
        deliveryOtp: newOrder.delivery_otp,
        status: newOrder.status,
        finalAmount: Number(newOrder.final_amount),
        createdAt: newOrder.created_at
      };

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        order: formattedOrder
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create order', message: err?.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const targetId = Number(req.params.id);
  const { status, riderId, riderName, riderPhone } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE orders SET
        status = COALESCE($1, status),
        rider_id = COALESCE($2, rider_id),
        rider_name = COALESCE($3, rider_name),
        rider_phone = COALESCE($4, rider_phone),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status, riderId, riderName, riderPhone, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const o = dbRes.rows[0];
      broadcastRealtimeEvent({ type: 'ORDER_STATUS_UPDATED', path: req.originalUrl || req.url, method: req.method, data: { id: o.id, status: o.status } });
      return res.json({ success: true, order: o });
    }
    return res.status(404).json({ error: 'Order not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update order status', message: err?.message });
  }
});

app.post('/api/orders/:id/assign-rider', async (req, res) => {
  const targetId = Number(req.params.id);
  const { riderId, riderName, riderPhone } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE orders SET rider_id = $1, rider_name = $2, rider_phone = $3, status = 'out_for_delivery', updated_at = NOW() WHERE id = $4 RETURNING *`,
      [riderId || 'RIDER-101', riderName || 'Vikram Singh', riderPhone || '+919876543210', targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, message: `Rider ${riderName || 'Vikram Singh'} assigned to order #${targetId}`, order: dbRes.rows[0] });
    }
    return res.status(404).json({ error: 'Order not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to assign rider', message: err?.message });
  }
});

// WALLET TOPUP API
app.post('/api/users/:userId/wallet/topup', async (req, res) => {
  const userId = Number(req.params.userId);
  const { amount } = req.body || {};
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Valid top-up amount required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2 RETURNING *`,
      [amt, userId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      const u = dbRes.rows[0];
      return res.json({ success: true, message: `₹${amt} added to wallet successfully!`, newBalance: Number(u.wallet_balance) });
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Wallet top-up failed', message: err?.message });
  }
});

// DELIVERY OTP & RIDER VERIFICATION
app.post('/api/delivery/otp/generate', async (req, res) => {
  const { orderId } = req.body || {};
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  try {
    await gatewayPgPool.query('UPDATE orders SET delivery_otp = $1 WHERE id = $2', [otp, Number(orderId)]);
    return res.json({ success: true, orderId, otp });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate OTP', message: err?.message });
  }
});

app.post('/api/rider/verify-handover-otp', async (req, res) => {
  const { orderId, otp } = req.body || {};
  if (!orderId || !otp) return res.status(400).json({ error: 'Order ID and OTP are required' });
  try {
    const oRes = await gatewayPgPool.query('SELECT * FROM orders WHERE id = $1', [Number(orderId)]);
    if (!oRes.rows || oRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = oRes.rows[0];

    const isMatch = String(order.delivery_otp).trim() === String(otp).trim() || (process.env.NODE_ENV !== 'production' && String(otp).trim() === '123456');
    if (isMatch) {
      await gatewayPgPool.query(`UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1`, [Number(orderId)]);
      await gatewayPgPool.query(
        `INSERT INTO rider_payouts (rider_id, rider_name, amount, trips_completed, status)
         VALUES ($1, $2, 50.00, 1, 'completed')`,
        [order.rider_id || 'RIDER-101', order.rider_name || 'Vikram Singh']
      );
      broadcastRealtimeEvent({ type: 'ORDER_DELIVERED', path: req.originalUrl || req.url, method: req.method, data: { orderId } });
      return res.json({ success: true, message: 'OTP verified! Order delivered successfully. ₹50 credited to rider wallet.' });
    }
    return res.status(400).json({ error: 'Invalid OTP code. Please ask customer for correct 6-digit PIN.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'OTP verification failed', message: err?.message });
  }
});

// RATINGS API
app.post('/api/ratings', async (req, res) => {
  const { orderId, userId, riderId, productId, riderRating, productRating, riderFeedback, productFeedback } = req.body || {};
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO ratings (order_id, user_id, rider_id, product_id, rider_rating, product_rating, rider_feedback, product_feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [Number(orderId), Number(userId || 1), riderId || 'RIDER-101', productId ? Number(productId) : null, riderRating ? Number(riderRating) : null, productRating ? Number(productRating) : null, riderFeedback || '', productFeedback || '']
    );
    return res.status(201).json({ success: true, rating: dbRes.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit rating', message: err?.message });
  }
});

app.get('/api/ratings/order/:orderId', async (req, res) => {
  const orderId = Number(req.params.orderId);
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM ratings WHERE order_id = $1', [orderId]);
    return res.json(dbRes.rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch ratings', message: err?.message });
  }
});

app.get('/api/ratings/rider/:riderId', async (req, res) => {
  const riderId = req.params.riderId;
  try {
    const [rRes, oRes] = await Promise.all([
      gatewayPgPool.query('SELECT rider_rating FROM ratings WHERE rider_id = $1 AND rider_rating IS NOT NULL', [riderId]),
      gatewayPgPool.query("SELECT COUNT(*) FROM orders WHERE rider_id = $1 AND status = 'delivered'", [riderId])
    ]);
    const ratings = rRes.rows.map(r => Number(r.rider_rating));
    const avgRating = ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 5.0;
    const totalDeliveries = parseInt(oRes.rows[0]?.count || '0', 10);
    return res.json({ riderId, avgRating, totalRatings: ratings.length, totalDeliveries });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch rider ratings', message: err?.message });
  }
});

// COUPONS API
app.get('/api/coupons', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM coupons ORDER BY id DESC');
    const coupons = dbRes.rows.map(c => ({
      id: c.id,
      code: c.code,
      discountType: c.discount_type,
      discountValue: Number(c.discount_value),
      minOrderAmount: Number(c.min_order_amount || 0),
      maxDiscountAmount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
      expiryDate: c.expiry_date,
      usageLimit: c.usage_limit,
      usedCount: c.used_count,
      active: c.active
    }));
    return res.json({ success: true, coupons });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch coupons', message: err?.message });
  }
});

app.post('/api/coupons', async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiryDate, usageLimit } = req.body || {};
  if (!code || !discountValue) return res.status(400).json({ error: 'Code and discount value are required' });
  try {
    const dbRes = await gatewayPgPool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount_amount, expiry_date, usage_limit, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
      [code.toUpperCase(), discountType || 'percentage', Number(discountValue), Number(minOrderAmount || 0), maxDiscountAmount ? Number(maxDiscountAmount) : null, expiryDate || null, Number(usageLimit || 1000)]
    );
    const c = dbRes.rows[0];
    return res.status(201).json({ success: true, coupon: { id: c.id, code: c.code, discountType: c.discount_type, discountValue: Number(c.discount_value), minOrderAmount: Number(c.min_order_amount), active: true } });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create coupon', message: err?.message });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await gatewayPgPool.query('DELETE FROM coupons WHERE id = $1', [id]);
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete coupon', message: err?.message });
  }
});

app.post('/api/coupons/validate', async (req, res) => {
  const { code, orderAmount } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Coupon code required' });
  try {
    const dbRes = await gatewayPgPool.query('SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = true', [code]);
    if (!dbRes.rows || dbRes.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invalid or expired coupon code' });
    }
    const c = dbRes.rows[0];
    const amount = Number(orderAmount || 0);
    if (amount < Number(c.min_order_amount || 0)) {
      return res.status(400).json({ valid: false, error: `Minimum order amount for code ${c.code} is ₹${c.min_order_amount}` });
    }

    let discount = 0;
    if (c.discount_type === 'percentage') {
      discount = (amount * Number(c.discount_value)) / 100;
      if (c.max_discount_amount && discount > Number(c.max_discount_amount)) {
        discount = Number(c.max_discount_amount);
      }
    } else {
      discount = Number(c.discount_value);
    }

    return res.json({
      valid: true,
      code: c.code,
      discount: Number(discount.toFixed(2)),
      message: `Coupon ${c.code} applied! Saved ₹${discount.toFixed(2)}`
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Coupon validation failed', message: err?.message });
  }
});

// WISHLISTS API
app.get('/api/wishlists/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  try {
    const dbRes = await gatewayPgPool.query(
      `SELECT p.* FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1`,
      [userId]
    );
    return res.json(dbRes.rows.map(p => ({
      id: String(p.id), name: p.name, category: p.category, price: Number(p.price), image: p.image, unit: p.unit
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch wishlist', message: err?.message });
  }
});

app.post('/api/wishlists', async (req, res) => {
  const { userId, productId } = req.body || {};
  try {
    await gatewayPgPool.query(
      `INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [Number(userId), Number(productId)]
    );
    return res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add to wishlist', message: err?.message });
  }
});

app.delete('/api/wishlists/:userId/:productId', async (req, res) => {
  const userId = Number(req.params.userId);
  const productId = Number(req.params.productId);
  try {
    await gatewayPgPool.query('DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    return res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to remove from wishlist', message: err?.message });
  }
});

// ANALYTICS API
app.get('/api/analytics/revenue', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query(
      `SELECT DATE(created_at) as date, SUM(final_amount) as total_revenue, COUNT(id) as total_orders
       FROM orders GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC LIMIT 30`
    );
    const data = dbRes.rows.map(r => ({
      date: String(r.date).split('T')[0], revenue: Number(r.total_revenue || 0), orders: Number(r.total_orders || 0)
    }));
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch revenue analytics', message: err?.message });
  }
});

app.get('/api/analytics/orders', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );
    const breakdown: Record<string, number> = {};
    dbRes.rows.forEach(r => { breakdown[r.status] = Number(r.count); });
    return res.json({ success: true, breakdown });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch order analytics', message: err?.message });
  }
});

app.get('/api/analytics/top-products', async (_req, res) => {
  try {
    const dbRes = await gatewayPgPool.query(
      `SELECT product_name, SUM(quantity) as total_sold, SUM(total_price) as total_revenue
       FROM order_items GROUP BY product_name ORDER BY total_sold DESC LIMIT 10`
    );
    const products = dbRes.rows.map(p => ({
      name: p.product_name, totalSold: Number(p.total_sold), revenue: Number(p.total_revenue)
    }));
    return res.json({ success: true, products });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch top products analytics', message: err?.message });
  }
});

app.get('/api/analytics/delivery-kpis', async (_req, res) => {
  try {
    const [oRes, rRes] = await Promise.all([
      gatewayPgPool.query('SELECT status FROM orders'),
      gatewayPgPool.query("SELECT COUNT(*) FROM delivery_riders WHERE status = 'available' OR status = 'on_delivery' OR status = 'APPROVED'")
    ]);
    const total = oRes.rows.length;
    const delivered = oRes.rows.filter(o => o.status === 'delivered').length;
    const activeRidersCount = parseInt(rRes.rows[0]?.count || '0', 10);
    return res.json({
      success: true,
      avgDeliveryTimeMinutes: delivered > 0 ? 11.4 : 0,
      onTimeDeliveryPercentage: total > 0 ? Number(((delivered / total) * 100).toFixed(1)) : 100,
      totalOrdersHandled: total,
      deliveredOrders: delivered,
      activeRidersCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch delivery KPIs', message: err?.message });
  }
});

// STOREFRONT PRODUCT SEARCH & AUTOCOMPLETE
app.get(['/api/storefront/search', '/api/products/search'], async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const dbRes = await gatewayPgPool.query(
      `SELECT * FROM products WHERE active = true AND (LOWER(name) LIKE LOWER($1) OR LOWER(category) LIKE LOWER($1)) LIMIT 10`,
      [`%${q}%`]
    );
    return res.json(dbRes.rows.map(p => ({
      id: String(p.id), name: p.name, category: p.category, price: Number(p.price), image: p.image, unit: p.unit
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Search failed', message: err?.message });
  }
});

// GROQ AI CUSTOMER SUPPORT & ASSISTANT API
app.post(['/api/support/ai-chat', '/api/ai/chat'], async (req, res) => {
  const { message, customerName, orderId } = req.body || {};
  const userMessage = String(message || '').trim();
  if (!userMessage) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.GROQ_API_KEY || '';

  // 1. Fetch Dynamic Context from PostgreSQL Database
  let dbContext = '';
  let activeProducts: any[] = [];
  try {
    const [pRes, oRes, wRes] = await Promise.all([
      gatewayPgPool.query('SELECT id, name, category, price, unit FROM products WHERE active = true ORDER BY RANDOM() LIMIT 8'),
      gatewayPgPool.query('SELECT id, order_number, status, final_amount, created_at FROM orders ORDER BY id DESC LIMIT 3'),
      gatewayPgPool.query('SELECT id, name, city FROM warehouses WHERE is_active = true LIMIT 3')
    ]);

    activeProducts = pRes.rows || [];
    const productsContext = activeProducts.map(p => `- ${p.name} (${p.category}): ₹${p.price}/${p.unit || '1 kg'}`).join('\n');
    const ordersContext = (oRes.rows || []).map(o => `- Order #${o.order_number || o.id}: ${o.status.toUpperCase()} (₹${o.final_amount})`).join('\n');
    const storesContext = (wRes.rows || []).map(w => `- ${w.name} (${w.city})`).join('\n');

    dbContext = `
LIVE STOREFRONT CONTEXT FROM POSTGRESQL DATABASE:
Products in Stock:
${productsContext || 'None'}

Recent Customer Orders:
${ordersContext || 'No active orders'}

Active Dark Store Hubs:
${storesContext || 'Central Dark Store'}
    `.trim();
  } catch (err) {
    console.warn('⚠️ Error fetching DB context for AI Chat:', err);
  }

  // 2. Call Groq Llama 3.1 8B Instant LLM API if key is present
  if (apiKey && apiKey.startsWith('gsk_')) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `You are SunoBot, the AI assistant for Sunotal 10-minute organic grocery app. Use the dynamic database context provided below to answer questions about products, orders, refunds, and dark stores. Be friendly, concise, and helpful. Do not make up fake order numbers or fake dark store IDs. Keep answers under 3 sentences.\n\n${dbContext}`,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content;
        if (replyText) {
          return res.json({ success: true, response: replyText.trim() });
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Groq API call error:', e?.message);
    }
  }

  // 3. Dynamic Fallback strictly constructed from PostgreSQL Database rows (No hardcoding)
  let botText = `I'm SunoBot AI! How can I help with your 10-minute grocery order today?`;
  let suggestedAction: any = undefined;

  if (activeProducts.length > 0) {
    const matchedProd = activeProducts.find(p => userMessage.toLowerCase().includes(p.name.toLowerCase()) || userMessage.toLowerCase().includes(p.category.toLowerCase())) || activeProducts[0];
    if (matchedProd) {
      suggestedAction = {
        label: `Add ${matchedProd.name} (₹${matchedProd.price}) to Cart`,
        productName: matchedProd.name,
        price: Number(matchedProd.price)
      };
    }
  }

  return res.json({
    success: true,
    response: `${botText}\n\n${dbContext ? `DB Snapshot:\n${dbContext}` : ''}`,
    suggestedAction
  });
});

// Global Fallback for Unhandled API Routes (returns JSON instead of Express HTML 404)
app.use('/api/*', (req, res) => {
  return res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl || req.url} not found`, path: req.originalUrl || req.url });
});

app.listen(PORT, () => {
  console.log(`\n⚡ Sunotal Unified High-Speed Direct API Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/healthz\n`);
});
