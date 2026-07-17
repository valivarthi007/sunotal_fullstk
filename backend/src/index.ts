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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
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
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── API routes ─────────────────────────────────────────────────────────
app.use('/api', authRouter);
app.use('/api', adminRouter);
app.use('/api', productsRouter);
app.use('/api', vendorsRouter);
app.use('/api', usersRouter);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  Sunotal API running → http://localhost:${PORT}`);
});
