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

// ── Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  Sunotal API running → http://localhost:${PORT}`);
});
