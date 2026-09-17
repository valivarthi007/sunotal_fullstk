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

// Create / Register Vendor
app.post(['/api/vendors', '/api/vendors/register', '/api/vendors/onboard'], (req, res) => {
  const { name, vendorName, email, phone, category, address, city, location } = req.body;
  const newVendor = {
    id: vendors.length + 1,
    vendorName: vendorName || name || 'New Vendor',
    name: name || vendorName || 'New Vendor',
    email: (email || '').toLowerCase(),
    phone: phone || '',
    category: category || 'Fresh Produce',
    address: address || location || city || '',
    city: city || location || '',
    status: 'approved',
    active: true,
    createdAt: new Date().toISOString()
  };
  vendors.push(newVendor);

  // Sync to operations service in background
  fetch('http://127.0.0.1:5002/api/vendors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newVendor)
  }).catch(() => null);

  res.status(201).json(newVendor);
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
