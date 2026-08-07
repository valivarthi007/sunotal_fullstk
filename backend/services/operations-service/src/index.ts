import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import { uploadRouter } from './routes/upload.js';
import { bannersRouter } from './routes/banners.js';
import productDefinitionsRouter from './routes/productDefinitions.js';

export const app = express();
const PORT = Number(process.env.PORT ?? 5002);

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', productsRouter);
app.use('/api', categoriesRouter);
app.use('/api', uploadRouter);
app.use('/api', bannersRouter);
app.use('/api', productDefinitionsRouter);

app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Operations Service listening on port ${PORT}`);
});
