import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

const orders: any[] = [
  {
    id: 'ORD-9912',
    orderNumber: 'ORD-9912',
    numericId: 9912,
    userId: '1',
    customerName: 'Rahul Sharma',
    customerPhone: '9876543210',
    shippingAddress: 'Flat 402, Green Acres, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    lat: 12.9716,
    lng: 77.5946,
    items: [
      { id: '1', name: 'Fresh Organic Tomatoes', quantity: 2, price: 40, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400' },
      { id: '2', name: 'Farm Fresh Milk', quantity: 1, price: 65, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400' }
    ],
    totalAmount: 145,
    finalAmount: 145,
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    riderName: 'Vikram Singh',
    createdAt: new Date().toISOString()
  }
];

app.get('/healthz', (_req, res) => {
  res.json({ service: 'order-service', status: 'OK', ordersCount: orders.length, timestamp: new Date().toISOString() });
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
  const { items, address, paymentMethod = 'upi', subtotal = 0 } = req.body;
  const num = Math.floor(1000 + Math.random() * 9000);
  const id = `ORD-${num}`;

  const newOrder = {
    id,
    orderNumber: id,
    numericId: num,
    userId: '1',
    customerName: address?.name || 'Valued Customer',
    customerPhone: address?.phone || '9876543210',
    shippingAddress: address?.street || 'Central Bengaluru',
    city: address?.city || 'Bengaluru',
    state: address?.state || 'Karnataka',
    pincode: address?.pincode || '560001',
    lat: address?.lat || 12.9716,
    lng: address?.lng || 77.5946,
    items: items || [],
    totalAmount: subtotal,
    finalAmount: subtotal + 25, // Distance fee
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod,
    riderName: 'Rider Vikram',
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
  res.json({
    success: true,
    orderId: req.params.id,
    items: [
      { skuId: 'SKU-MILK-01', name: 'Farm Fresh Milk', aisle: 'A1', shelf: 'S2', bin: 'B04', quantity: 1, barcode: '8901262010015' },
      { skuId: 'SKU-TOMATO-01', name: 'Organic Tomatoes', aisle: 'A2', shelf: 'S1', bin: 'B12', quantity: 2, barcode: '8901262010016' }
    ]
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
