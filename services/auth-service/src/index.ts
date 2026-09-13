import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'sunotal_jwt_secret_2026_super_secure';

app.use(cors());
app.use(express.json());

// Stateful In-Memory User Store
const users: any[] = [];

async function seedDefaultUsers() {
  if (users.length > 0) return;
  const adminHash = await bcrypt.hash('admin123', 10);
  const riderHash = await bcrypt.hash('rider123', 10);
  users.push(
    { id: '1', name: 'Admin User', email: 'admin@sunotal.com', passwordHash: adminHash, role: 'admin', status: 'active', walletBalance: 1000, createdAt: new Date() },
    { id: '2', name: 'Rider Vikram', email: 'rider@sunotal.com', passwordHash: riderHash, role: 'driver', status: 'active', phone: '9000000001', walletBalance: 500, createdAt: new Date() }
  );
}
seedDefaultUsers();

function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function normalizeUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    phone: u.phone,
    walletBalance: u.walletBalance || 0,
    createdAt: u.createdAt,
  };
}

// Health endpoint
app.get('/healthz', (_req, res) => {
  res.json({ service: 'auth-service', status: 'OK', usersCount: users.length, timestamp: new Date().toISOString() });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }
    const existing = users.find((u) => u.email === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: String(Date.now()),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      status: 'active',
      phone: phone || '',
      walletBalance: 100,
      createdAt: new Date(),
    };
    users.push(newUser);
    const token = signToken({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
    return res.status(201).json({ success: true, token, user: normalizeUser(newUser) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = users.find((u) => u.email === email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    return res.json({ success: true, token, user: normalizeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Vendor / Delivery Login
const loginRoleHandler = (roles: string[]) => async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = users.find((u) => u.email === email.toLowerCase() && (roles.includes(u.role) || u.role === 'admin'));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // Demo fallback for vendor/rider
      const demoUser = { id: `DEMO-${Date.now()}`, name: `${roles[0]} User`, email: email.toLowerCase(), role: roles[0], walletBalance: 500, createdAt: new Date() };
      const token = signToken({ id: demoUser.id, email: demoUser.email, role: demoUser.role });
      return res.json({ success: true, token, user: normalizeUser(demoUser) });
    }
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    return res.json({ success: true, token, user: normalizeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.post('/api/auth/login/vendor', loginRoleHandler(['vendor']));
app.post('/api/auth/login/delivery', loginRoleHandler(['driver']));

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === decoded.id) || decoded;
    return res.json({ success: true, user: normalizeUser(user) });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 auth-service running on port ${PORT}`);
});
