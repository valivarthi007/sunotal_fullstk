import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT ?? 5005);

app.use(cors());
app.use(express.json());

const vendors: any[] = [];


const quotations: any[] = [];

app.get('/healthz', (_req, res) => {
  res.json({ service: 'vendor-service', status: 'OK', vendorsCount: vendors.length, timestamp: new Date().toISOString() });
});

// Canonical healthz path used by Docker and nginx health checks
app.get('/api/healthz', (_req, res) => {
  res.json({ service: 'vendor-service', status: 'ok', vendorsCount: vendors.length, timestamp: new Date().toISOString() });
});

// List Vendors (Admin)
app.get('/api/vendors', (_req, res) => {
  res.json(vendors);
});

// Farmer Produce Quotation Submission
app.post('/api/procurement/quotations', (req, res) => {
  const { vendorId, produceName, quantityKg, pricePerKg } = req.body;
  if (!produceName || quantityKg === undefined || pricePerKg === undefined) {
    return res.status(400).json({ error: 'Produce name, quantity, and price per kg required' });
  }
  const newQuotation = {
    id: `QUOTE-${Math.floor(1000 + Math.random() * 9000)}`,
    vendorId: vendorId || '',
    produceName,
    quantityKg: Number(quantityKg),
    pricePerKg: Number(pricePerKg),
    totalValuation: Number(quantityKg) * Number(pricePerKg),
    status: 'PENDING',
    submittedAt: new Date().toISOString()
  };
  quotations.push(newQuotation);
  res.status(201).json({ success: true, quotation: newQuotation });
});

// List Quotations
app.get('/api/procurement/quotations', (_req, res) => {
  res.json(quotations);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌾 vendor-service running on port ${PORT}`);
});
