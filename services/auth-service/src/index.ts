import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5001);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';
const JWT_SECRET = process.env.JWT_SECRET || 'sunotal_jwt_secret_2026_super_secure';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const DEFAULT_DEMO_USERS = [
  { id: "1", name: "Sunotal Admin", email: "admin@sunotal.com", role: "admin", status: "active", active: true, phone: "9876543210", city: "Bengaluru", walletBalance: 1000, createdAt: new Date().toISOString() },
  { id: "2", name: "Sunotal Customer", email: "user@sunotal.com", role: "customer", status: "active", active: true, phone: "9876543211", city: "Bengaluru", walletBalance: 500, createdAt: new Date().toISOString() },
  { id: "3", name: "Green Farms Vendor", email: "vendor@sunotal.com", role: "vendor", status: "active", active: true, phone: "9876543212", city: "Mysuru", walletBalance: 2500, createdAt: new Date().toISOString() },
  { id: "4", name: "Express Rider", email: "rider@sunotal.com", role: "rider", status: "active", active: true, phone: "9876543213", city: "Bengaluru", walletBalance: 300, createdAt: new Date().toISOString() }
];

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        active BOOLEAN DEFAULT TRUE,
        phone VARCHAR(50),
        city VARCHAR(100),
        wallet_balance NUMERIC(10, 2) DEFAULT 100.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure default users exist
    const adminHash = await bcrypt.hash('admin123', 10);
    const passHash = await bcrypt.hash('password123', 10);

    for (const u of DEFAULT_DEMO_USERS) {
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING`,
        [u.name, u.email, u.role === 'admin' ? adminHash : passHash, u.role, true, u.phone, u.city, u.walletBalance]
      );
    }

    console.log('🐘 [auth-service] PostgreSQL database tables and demo users ready.');
  } catch (err: any) {
    console.warn('⚠️ [auth-service] DB init warning:', err?.message || err);
  }
}

initDb();

function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function normalizeUserRow(u: any) {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.active === false ? 'inactive' : 'active',
    active: u.active ?? true,
    phone: u.phone || '',
    city: u.city || '',
    walletBalance: Number(u.wallet_balance || u.walletBalance || 0),
    createdAt: u.created_at || u.createdAt || new Date().toISOString(),
  };
}

app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth-service', status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role = 'customer', phone, city } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const dbRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, cleanEmail, passwordHash, role || 'customer', true, phone || '', city || '', 100]
    );

    const newUser = normalizeUserRow(insertRes.rows[0]);

    fetch('http://127.0.0.1:5002/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(() => null);

    const token = signToken({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
    return res.status(201).json({ success: true, token, user: newUser });
  } catch (err: any) {
    return res.status(500).json({ error: 'Registration failed. Please try again.', message: err?.message });
  }
});

// Login — DB-only authentication (no password bypass)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const dbRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const userRow = dbRes.rows[0];
      const match = await bcrypt.compare(password, userRow.password_hash);
      if (match) {
        const normUser = normalizeUserRow(userRow);
        const token = signToken({ id: normUser.id, email: normUser.email, name: normUser.name, role: normUser.role });
        return res.json({ success: true, token, user: normUser });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (err: any) {
    return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again.' });
  }
});

// Role-based Login Handlers — DB-only authentication
const loginRoleHandler = (roles: string[]) => async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const dbRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const userRow = dbRes.rows[0];
      const match = await bcrypt.compare(password, userRow.password_hash);
      if (match) {
        if (!roles.includes(userRow.role) && userRow.role !== 'admin') {
          return res.status(403).json({ error: 'Unauthorized role access' });
        }
        const normUser = normalizeUserRow(userRow);
        const token = signToken({ id: normUser.id, email: normUser.email, name: normUser.name, role: normUser.role });
        return res.json({ success: true, token, user: normUser });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (err: any) {
    return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again.' });
  }
};

app.post('/api/auth/login/vendor', loginRoleHandler(['vendor']));
app.post('/api/auth/login/delivery', loginRoleHandler(['driver', 'delivery', 'rider']));
app.post('/api/auth/admin/login', loginRoleHandler(['admin']));
app.post('/api/admin/login', loginRoleHandler(['admin']));

// Users management for Admin — DB-only
app.get(['/api/users', '/api/admin/users'], async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM users ORDER BY id ASC');
    return res.json(dbRes.rows.map(normalizeUserRow));
  } catch (err: any) {
    return res.status(503).json({ error: 'Could not fetch users. Database unavailable.' });
  }
});

// Sync user from another service
app.post('/api/users/sync', async (req, res) => {
  const { id, name, email, role, phone, city, active } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required for sync' });

  const cleanEmail = email.trim().toLowerCase();
  try {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, users.name),
         role = COALESCE(EXCLUDED.role, users.role),
         phone = COALESCE(EXCLUDED.phone, users.phone),
         city = COALESCE(EXCLUDED.city, users.city),
         active = COALESCE(EXCLUDED.active, users.active)`,
      [name || 'User', cleanEmail, 'synced_no_password', role || 'customer', active ?? true, phone || '', city || '', 100]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: false, message: err?.message });
  }
});

// Update User (Admin)
app.put('/api/users/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  const { name, role, phone, city, status, active } = req.body;
  const newActive = active !== undefined ? Boolean(active) : (status ? status === 'active' : undefined);

  try {
    const dbRes = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), phone = COALESCE($3, phone), city = COALESCE($4, city)${newActive !== undefined ? ', active = $5' : ''} WHERE id = ${newActive !== undefined ? '$6' : '$5'} RETURNING *`,
      newActive !== undefined ? [name, role, phone, city, newActive, targetId] : [name, role, phone, city, targetId]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      const updated = normalizeUserRow(dbRes.rows[0]);
      fetch('http://127.0.0.1:5002/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => null);
      return res.json(updated);
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user', message: err?.message });
  }
});

// Toggle User Status (Admin)
app.put(['/api/users/:id/status', '/api/users/:id/toggle-status'], async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pool.query('UPDATE users SET active = NOT active WHERE id = $1 RETURNING *', [targetId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const updated = normalizeUserRow(dbRes.rows[0]);
      return res.json(updated);
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle user status', message: err?.message });
  }
});

// Delete User (Admin)
app.delete('/api/users/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, message: 'User deleted successfully' });
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete user', message: err?.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const dbRes = await pool.query('SELECT * FROM users WHERE id = $1 OR LOWER(email) = $2', [isNaN(Number(decoded.id)) ? -1 : Number(decoded.id), String(decoded.email || '').toLowerCase()]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, user: normalizeUserRow(dbRes.rows[0]) });
    }
    return res.json({ success: true, user: decoded });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 auth-service running on port ${PORT}`);
});
