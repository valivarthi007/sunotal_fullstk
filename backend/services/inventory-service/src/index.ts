import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import inventoryRouter from './routes/inventory.js';
import ordersRouter from './routes/orders.js';

export const app = express();
const PORT = Number(process.env.PORT ?? 5003);

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', inventoryRouter);
app.use('/api', ordersRouter);

app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory Service listening on port ${PORT}`);
});
