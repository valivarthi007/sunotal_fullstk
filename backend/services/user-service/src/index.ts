import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users.js';
import vendorsRouter from './routes/vendors.js';
import adminRouter from './routes/admin.js';
import { metricsMiddleware, metricsHandler } from '../../src/lib/metrics.js';
import { initDatabase } from './lib/db.js';

export const app = express();
const PORT = Number(process.env.PORT ?? 5004);

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(metricsMiddleware('user-service'));

app.use('/api', usersRouter);
app.use('/api', vendorsRouter);
app.use('/api', adminRouter);

app.get('/metrics', metricsHandler);

app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: "ok", service: "user" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`User Service listening on port ${PORT}`);
});

initDatabase().catch((err) => {
  console.error('❌ Database initialization error:', err);
});
