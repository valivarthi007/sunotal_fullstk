import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import { metricsMiddleware, metricsHandler } from './lib/metrics.js';
import { initDatabase } from './lib/db.js';

export const app = express();
const PORT = Number(process.env.PORT ?? 5001);

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware('auth-service'));

app.use('/api', authRouter);

app.get('/metrics', metricsHandler);

app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: "ok", service: "auth" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth Service listening on port ${PORT}`);
});

initDatabase().catch((err) => {
  console.error('❌ Database initialization error:', err);
});
