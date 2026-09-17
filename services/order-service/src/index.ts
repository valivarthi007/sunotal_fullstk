import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

const orders: any[] = [];


app.get('/healthz', (_req, res) => {
  res.json({ service: 'order-service', status: 'OK', ordersCount: orders.length, timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

// List Orders
app.get('/api/orders', (_req, res) => {
  res.json(orders);
});

// Single Order
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Checkout Endpoint
app.post('/api/orders/checkout', (req, res) => {
  const { items, address, paymentMethod = 'upi', subtotal = 0, userId } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const num = Math.floor(1000 + Math.random() * 9000);
  const id = `ORD-${num}`;

  const newOrder = {
    id,
    orderNumber: id,
    numericId: num,
    userId: userId || String(Date.now()),
    customerName: address?.name || address?.customerName || '',
    customerPhone: address?.phone || '',
    shippingAddress: address?.street || address?.address || '',
    city: address?.city || '',
    state: address?.state || '',
    pincode: address?.pincode || '',
    lat: address?.lat || 0,
    lng: address?.lng || 0,
    items: items || [],
    totalAmount: Number(subtotal),
    finalAmount: Number(subtotal) + 25, // Distance fee
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod,
    riderName: '',
    createdAt: new Date().toISOString()
  };

  orders.unshift(newOrder);
  res.status(201).json({ success: true, order: newOrder });
});

// Order Cancel
app.post('/api/orders/:id/cancel', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = 'cancelled';
  res.json({ success: true, message: 'Order cancelled', order });
});

// Order Status Update (Admin / Rider)
app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status || order.status;
  res.json({ success: true, order });
});

// WMS Pick List
app.get('/api/wms/pick-list/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  const items = order && Array.isArray(order.items)
    ? order.items.map((it: any, idx: number) => ({
        skuId: `SKU-${it.productId || it.id || idx + 1}`,
        name: it.name || it.productName || 'Order Product',
        aisle: `A${(idx % 4) + 1}`,
        shelf: `S${(idx % 3) + 1}`,
        bin: `B0${idx + 1}`,
        quantity: Number(it.quantity || 1),
        barcode: `8901262${Math.floor(100000 + Math.random() * 900000)}`
      }))
    : [];

  res.json({
    success: true,
    orderId: req.params.id,
    items
  });
});

// WMS Scan Item
app.post('/api/wms/scan-item', (req, res) => {
  const { barcodeScanned } = req.body;
  res.json({ success: true, verified: true, scannedBarcode: barcodeScanned, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🛒 order-service running on port ${PORT}`);
});
