import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ticketsRouter from '../../../src/routes/tickets.js';

const app = express();
const PORT = Number(process.env.SUPPORT_SERVICE_PORT || 5006);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api', ticketsRouter);
app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'support-service' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Sunotal Support Microservice running on port ${PORT}`);
});
