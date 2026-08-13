import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter    from './routes/auth.js';
import adminRouter   from './routes/admin.js';
import productsRouter from './routes/products.js';
import vendorsRouter from './routes/vendors.js';
import usersRouter   from './routes/users.js';
import inventoryRouter from './routes/inventory.js';
import categoriesRouter from './routes/categories.js';
import { uploadRouter } from './routes/upload.js';
import { bannersRouter } from './routes/banners.js';
import ordersRouter from './routes/orders.js';
import productDefinitionsRouter from './routes/productDefinitions.js';
import { db } from './lib/db.js';
import { usersTable } from './schema/users.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();
const PORT = Number(process.env.PORT ?? 5000);

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production.');
}

// ── Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// ── API routes ─────────────────────────────────────────────────────────
app.use('/api', authRouter);
app.use('/api', adminRouter);
app.use('/api', productsRouter);
app.use('/api', vendorsRouter);
app.use('/api', usersRouter);
app.use('/api', inventoryRouter);
app.use('/api', categoriesRouter);
app.use('/api', uploadRouter);
app.use('/api/banners', bannersRouter);
app.use('/api', ordersRouter);
app.use('/api', productDefinitionsRouter);
app.get('/api/healthz', (_req, res) => res.json({ status: 'ok' }));

// ── Serve built frontend in production ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function autoSeedAdmin() {
  try {
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, 'admin')).limit(1);
    if (admins.length === 0) {
      console.log('🌱 No admin user found in database. Auto-seeding default admin...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.insert(usersTable).values({
        name: 'Admin User',
        email: 'admin@sunotal.com',
        passwordHash,
        role: 'admin',
        active: true,
        phone: '+91 98765 00001',
        city: 'Hyderabad'
      });
      console.log('✅ Default admin account seeded: admin@sunotal.com / admin123');
    }
  } catch (err) {
    console.error('⚠️ Failed to check/seed admin user:', err);
  }
}

autoSeedAdmin().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅  Sunotal API running → http://localhost:${PORT}`);
  });
});
