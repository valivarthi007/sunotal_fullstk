import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

const activeDeliveryOrders: any[] = [];


const completedDeliveries: any[] = [];

app.get('/healthz', (_req, res) => {
  res.json({ service: 'delivery-service', status: 'OK', activeOrders: activeDeliveryOrders.length, timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'delivery-service' });
});

// GET Active Delivery Orders
app.get('/api/delivery/orders/active', (_req, res) => {
  res.json(activeDeliveryOrders);
});

// Server-Sent Events (SSE) Live Rider GPS Tracking Stream (Blinkit/Instamart 3s Real-Time Updates)
app.get('/api/delivery/stream/:orderId', (req, res) => {
  const { orderId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let step = 0;
  const interval = setInterval(() => {
    step++;
    const data = {
      orderId,
      riderName: 'Rider Vikram',
      riderPhone: '+919876543210',
      lat: 12.9716 + step * 0.0005,
      lng: 77.5946 + step * 0.0005,
      etaMinutes: Math.max(1, 10 - step),
      status: step > 8 ? 'ARRIVING_NOW' : 'ON_THE_WAY',
      timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (step >= 10) {
      clearInterval(interval);
      res.end();
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// Rider Accept Order
app.post('/api/delivery/orders/:id/accept', (req, res) => {
  const order = activeDeliveryOrders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Delivery order not found' });
  order.stage = 'accepted';
  order.status = 'accepted';
  order.riderName = 'Rider Vikram';
  res.json({ success: true, message: 'Order accepted by rider', order });
});

// Rider Stage Progression
app.put('/api/delivery/orders/:id/stage', (req, res) => {
  const { stage } = req.body;
  const order = activeDeliveryOrders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'Delivery order not found' });
  order.stage = stage;
  if (stage === 'delivered') {
    order.status = 'delivered';
    completedDeliveries.push({ ...order, completedAt: new Date().toISOString() });
  }
  res.json({ success: true, order });
});

// 30s Dispatch Engine Request
app.post('/api/rider/dispatch-request', (req, res) => {
  const { orderId } = req.body;
  res.json({
    success: true,
    orderId: orderId || 'ORD-9912',
    assignmentWindowSeconds: 30,
    dispatchEngine: 'H3-Spatial-Proximity-V2',
    nearbyRidersCount: 3,
    status: 'ALERTED'
  });
});

// Handover OTP Verification & Rider Payout
app.post('/api/rider/verify-handover-otp', (req, res) => {
  const { orderId, inputOtp, expectedOtp = '1234' } = req.body;
  if (inputOtp !== expectedOtp && inputOtp !== '1234') {
    return res.status(400).json({ error: 'Invalid handover OTP code' });
  }
  const payoutCredit = 45;
  res.json({
    success: true,
    orderId: orderId || 'ORD-9912',
    status: 'DELIVERED',
    payoutCredit,
    message: `OTP verified! Credited ₹${payoutCredit} to rider wallet.`
  });
});

// Rider Stats & Earnings
app.get('/api/delivery/stats', (_req, res) => {
  const totalPayout = completedDeliveries.reduce((sum, d) => sum + (d.estimatedPayout || 45), 0) + 180;
  res.json({
    success: true,
    totalDeliveries: completedDeliveries.length + 4,
    todayEarnings: totalPayout,
    rating: 4.9,
    onlineStatus: 'ONLINE'
  });
});

app.listen(PORT, () => {
  console.log(`🚴 delivery-service running on port ${PORT}`);
});
