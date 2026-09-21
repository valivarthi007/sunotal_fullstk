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

const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRds ? { rejectUnauthorized: false } : undefined,
});

const INITIAL_ADMIN_USER = {
  name: "Sunotal Admin",
  email: "admin@sunotal.com",
  role: "admin",
  phone: "9876543210",
  city: "Bengaluru",
  walletBalance: 1000,
};

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

    // Indexes for fast queries
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
      `CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)`,
    ];
    for (const idx of indexes) {
      try { await pool.query(idx); } catch {}
    }

    // Inject initial admin credentials into PostgreSQL RDS
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [INITIAL_ADMIN_USER.name, INITIAL_ADMIN_USER.email, adminHash, INITIAL_ADMIN_USER.role, true, INITIAL_ADMIN_USER.phone, INITIAL_ADMIN_USER.city, INITIAL_ADMIN_USER.walletBalance]
    );

    console.log('🐘 [auth-service] PostgreSQL database schema and initial admin account ready.');
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
    const passwordHash = await bcrypt.hash(password, 10);
    const dbRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    let userRow;
    if (dbRes.rows && dbRes.rows.length > 0) {
      const updateRes = await pool.query(
        `UPDATE users SET name = $1, password_hash = $2, role = $3, phone = COALESCE(NULLIF($4, ''), phone), city = COALESCE(NULLIF($5, ''), city), active = TRUE
         WHERE id = $6 RETURNING *`,
        [name, passwordHash, role || 'customer', phone || '', city || '', dbRes.rows[0].id]
      );
      userRow = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, cleanEmail, passwordHash, role || 'customer', true, phone || '', city || '', 100]
      );
      userRow = insertRes.rows[0];
    }

    const newUser = normalizeUserRow(userRow);
    syncUserWithOperations(newUser);

    const token = signToken({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
    return res.status(201).json({ success: true, token, user: newUser });
  } catch (err: any) {
    return res.status(500).json({ error: 'Registration failed. Please try again.', message: err?.message });
  }
});

const OPERATIONS_SERVICE_URL = process.env.OPERATIONS_SERVICE_URL || 'http://127.0.0.1:5002';

async function syncUserWithOperations(user: any, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${OPERATIONS_SERVICE_URL}/api/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (res.ok) return;
    } catch (err: any) {
      if (attempt === retries) {
        console.warn(`⚠️ [auth-service] User sync failed after ${retries} attempts:`, err?.message);
      } else {
        await new Promise((resolve) => setTimeout(resolve, attempt * 200));
      }
    }
  }
}

// Login — DB authentication with resilient demo fallback
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
    console.error('❌ [auth-service login error]:', err?.message || err);
    return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again.', message: err?.message });
  }
});

// Role-based Login Handlers — DB authentication
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
    console.error('❌ [auth-service loginRoleHandler error]:', err?.message || err);
    return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again.', message: err?.message });
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

  const setClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    queryParams.push(name);
  }
  if (role !== undefined) {
    setClauses.push(`role = $${paramIdx++}`);
    queryParams.push(role);
  }
  if (phone !== undefined) {
    setClauses.push(`phone = $${paramIdx++}`);
    queryParams.push(phone);
  }
  if (city !== undefined) {
    setClauses.push(`city = $${paramIdx++}`);
    queryParams.push(city);
  }
  if (newActive !== undefined) {
    setClauses.push(`active = $${paramIdx++}`);
    queryParams.push(newActive);
  }

  if (setClauses.length === 0) {
    try {
      const existing = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
      if (existing.rows && existing.rows.length > 0) {
        return res.json(normalizeUserRow(existing.rows[0]));
      }
      return res.status(404).json({ error: 'User not found' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch user', message: err?.message });
    }
  }

  queryParams.push(targetId);
  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;

  try {
    const dbRes = await pool.query(sql, queryParams);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const updated = normalizeUserRow(dbRes.rows[0]);
      syncUserWithOperations(updated);
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

// POST /api/auth/wallet/deduct — Atomic balance deduction to prevent race conditions & double-spending
app.post('/api/auth/wallet/deduct', async (req, res) => {
  const { userId, email, amount } = req.body;
  const numAmt = Number(amount || 0);

  if (isNaN(numAmt) || numAmt <= 0) {
    return res.status(400).json({ error: 'Valid positive amount required for deduction' });
  }

  try {
    const dbRes = await pool.query(
      `UPDATE users 
       SET wallet_balance = wallet_balance - $1 
       WHERE (id = $2 OR LOWER(email) = $3) AND wallet_balance >= $1 
       RETURNING id, name, email, wallet_balance`,
      [numAmt, isNaN(Number(userId)) ? -1 : Number(userId), String(email || '').toLowerCase()]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      const u = dbRes.rows[0];
      return res.json({
        success: true,
        message: 'Wallet balance deducted successfully',
        newBalance: Number(u.wallet_balance),
      });
    }

    return res.status(400).json({ error: 'Insufficient wallet balance or user not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Wallet transaction failed', message: err?.message });
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
      const userRow = dbRes.rows[0];
      if (userRow.active === false) {
        return res.status(401).json({ error: 'Account disabled. Please contact support.' });
      }
      return res.json({ success: true, user: normalizeUserRow(userRow) });
    }
    return res.json({ success: true, user: decoded });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 auth-service running on port ${PORT}`);
});
