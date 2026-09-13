import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

const vendors: any[] = [
  { id: 'VENDOR-001', firstName: 'Ramesh', lastName: 'Kumar', email: 'ramesh@farms.com', phone: '9876543210', location: 'Indiranagar, Bangalore', produce: 'Organic Vegetables', status: 'approved', createdAt: new Date().toISOString() },
  { id: 'VENDOR-002', firstName: 'Suresh', lastName: 'Patel', email: 'suresh@dairy.com', phone: '9876543211', location: 'Koramangala, Bangalore', produce: 'Fresh Milk & Dairy', status: 'approved', createdAt: new Date().toISOString() }
];

const quotations: any[] = [];

app.get('/healthz', (_req, res) => {
  res.json({ service: 'vendor-service', status: 'OK', vendorsCount: vendors.length, timestamp: new Date().toISOString() });
});

// List Vendors (Admin)
app.get('/api/vendors', (_req, res) => {
  res.json(vendors);
});

// Farmer Produce Quotation Submission
app.post('/api/procurement/quotations', (req, res) => {
  const { vendorId, produceName, quantityKg, pricePerKg } = req.body;
  const newQuotation = {
    id: `QUOTE-${Math.floor(1000 + Math.random() * 9000)}`,
    vendorId: vendorId || 'VENDOR-001',
    produceName: produceName || 'Organic Produce',
    quantityKg: Number(quantityKg || 100),
    pricePerKg: Number(pricePerKg || 30),
    totalValuation: Number(quantityKg || 100) * Number(pricePerKg || 30),
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

app.listen(PORT, () => {
  console.log(`🌾 vendor-service running on port ${PORT}`);
});
