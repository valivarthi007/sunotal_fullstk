import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import addressesRouter from './routes/addresses.js';
import trackingRouter from './routes/tracking.js';
import { metricsMiddleware, metricsHandler } from './lib/metrics.js';

export const app = express();
const PORT = Number(process.env.PORT ?? 5006);

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware('delivery-service'));

app.use('/api', addressesRouter);
app.use('/api', trackingRouter);

app.get('/metrics', metricsHandler);

app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: "ok", service: "delivery" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Delivery Service listening on port ${PORT}`);
});
