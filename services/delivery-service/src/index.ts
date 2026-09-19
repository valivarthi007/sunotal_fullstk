import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5004);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const deliveryEventEmitter = new EventEmitter();
deliveryEventEmitter.setMaxListeners(100);

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  stage: string;
  status: string;
  currentLat: number;
  currentLng: number;
  destLat: number;
  destLng: number;
  updatedAt: string;
}

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_orders (
        id VARCHAR(255) PRIMARY KEY,
        order_number VARCHAR(255),
        rider_id VARCHAR(255),
        rider_name VARCHAR(255),
        rider_phone VARCHAR(50),
        stage VARCHAR(50) DEFAULT 'in_transit',
        status VARCHAR(50) DEFAULT 'ON_THE_WAY',
        current_lat NUMERIC(10, 6),
        current_lng NUMERIC(10, 6),
        dest_lat NUMERIC(10, 6),
        dest_lng NUMERIC(10, 6),
        payout_credit NUMERIC(10, 2) DEFAULT 45.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS delivery_riders (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE,
        city VARCHAR(100),
        vehicle VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ONLINE',
        wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rider_payouts (
        id SERIAL PRIMARY KEY,
        rider_id VARCHAR(255),
        amount NUMERIC(10, 2) NOT NULL,
        transaction_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('🐘 [delivery-service] PostgreSQL database tables ready.');
  } catch (err: any) {
    console.warn('⚠️ [delivery-service] DB init warning:', err?.message || err);
  }
}

initDb();

function calculateEtaMinutes(lat1: number, lon1: number, lat2: number, lon2: number, speedKmh = 25): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const timeHours = distanceKm / Math.max(5, speedKmh);
  return Math.max(1, Math.round(timeHours * 60));
}

app.get('/healthz', (_req, res) => {
  res.json({ service: 'delivery-service', status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'delivery-service' });
});

// GET Active Delivery Orders — Direct PostgreSQL SQL Querying
app.get('/api/delivery/orders/active', async (_req, res) => {
  try {
    const dbRes = await pool.query("SELECT * FROM delivery_orders WHERE status != 'delivered' ORDER BY updated_at DESC");
    const dbOrders = (dbRes.rows || []).map((r: any) => ({
      id: r.id,
      orderNumber: r.order_number || r.id,
      riderId: r.rider_id,
      riderName: r.rider_name,
      riderPhone: r.rider_phone,
      stage: r.stage,
      status: r.status,
      currentLat: Number(r.current_lat),
      currentLng: Number(r.current_lng),
      destLat: Number(r.dest_lat),
      destLng: Number(r.dest_lng),
      updatedAt: r.updated_at
    }));
    return res.json(dbOrders);
  } catch (err: any) {
    return res.json([]);
  }
});

// Dynamic Rider Location Update Endpoint — Direct PostgreSQL SQL Persistence
app.post('/api/delivery/rider/location', async (req, res) => {
  const { orderId, riderId, riderName, riderPhone, lat, lng } = req.body;

  if (!orderId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'orderId, lat, and lng are required' });
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  try {
    const dbRes = await pool.query(
      `INSERT INTO delivery_orders (id, order_number, rider_id, rider_name, rider_phone, stage, status, current_lat, current_lng, dest_lat, dest_lng, updated_at)
       VALUES ($1, $1, $2, $3, $4, 'in_transit', 'ON_THE_WAY', $5, $6, $5 + 0.015, $6 + 0.015, NOW())
       ON CONFLICT (id) DO UPDATE SET
         current_lat = EXCLUDED.current_lat,
         current_lng = EXCLUDED.current_lng,
         rider_name = COALESCE(EXCLUDED.rider_name, delivery_orders.rider_name),
         rider_phone = COALESCE(EXCLUDED.rider_phone, delivery_orders.rider_phone),
         updated_at = NOW()
       RETURNING *`,
      [orderId, riderId || '', riderName || 'Delivery Partner', riderPhone || '', numLat, numLng]
    );

    const r = dbRes.rows[0];
    const updatedOrder: DeliveryOrder = {
      id: r.id,
      orderNumber: r.order_number || r.id,
      riderId: r.rider_id,
      riderName: r.rider_name,
      riderPhone: r.rider_phone,
      stage: r.stage,
      status: r.status,
      currentLat: Number(r.current_lat),
      currentLng: Number(r.current_lng),
      destLat: Number(r.dest_lat),
      destLng: Number(r.dest_lng),
      updatedAt: r.updated_at
    };

    deliveryEventEmitter.emit(`location_update:${orderId}`, updatedOrder);
    return res.json({ success: true, message: 'Rider location updated in PostgreSQL RDS', order: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update rider location in database', message: err?.message });
  }
});

// Real-time SSE Live Tracking Stream — Direct PostgreSQL Telemetry Querying
app.get(['/api/delivery/stream/:orderId', '/api/delivery/tracking/:orderId/stream'], async (req, res) => {
  const { orderId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendOrderUpdate = (order: DeliveryOrder) => {
    const etaMinutes = calculateEtaMinutes(order.currentLat, order.currentLng, order.destLat, order.destLng);
    const data = {
      orderId: order.id,
      riderName: order.riderName,
      riderPhone: order.riderPhone,
      lat: order.currentLat,
      lng: order.currentLng,
      destLat: order.destLat,
      destLng: order.destLng,
      etaMinutes,
      status: etaMinutes <= 2 ? 'ARRIVING_NOW' : 'ON_THE_WAY',
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const dbRes = await pool.query('SELECT * FROM delivery_orders WHERE id = $1 OR order_number = $1', [orderId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const r = dbRes.rows[0];
      const dbOrder: DeliveryOrder = {
        id: r.id,
        orderNumber: r.order_number || r.id,
        riderId: r.rider_id || '',
        riderName: r.rider_name || 'Delivery Partner',
        riderPhone: r.rider_phone || '',
        stage: r.stage || 'in_transit',
        status: r.status || 'ON_THE_WAY',
        currentLat: Number(r.current_lat || 12.9716),
        currentLng: Number(r.current_lng || 77.5946),
        destLat: Number(r.dest_lat || 12.9816),
        destLng: Number(r.dest_lng || 77.6046),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      };
      sendOrderUpdate(dbOrder);
    } else {
      res.write(`data: ${JSON.stringify({ orderId, status: 'PREPARING', message: 'Order is being packed at dark store' })}\n\n`);
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ orderId, status: 'PREPARING', message: 'Connecting to delivery telemetry...' })}\n\n`);
  }

  const listener = (updatedOrder: DeliveryOrder) => {
    sendOrderUpdate(updatedOrder);
  };

  deliveryEventEmitter.on(`location_update:${orderId}`, listener);
  req.on('close', () => {
    deliveryEventEmitter.removeListener(`location_update:${orderId}`, listener);
    res.end();
  });
});

// Rider Accept Order — Direct PostgreSQL SQL Mutation
app.post('/api/delivery/orders/:id/accept', async (req, res) => {
  const { riderName, riderPhone, riderId } = req.body;
  const orderId = req.params.id;

  try {
    const dbRes = await pool.query(
      `INSERT INTO delivery_orders (id, order_number, rider_id, rider_name, rider_phone, stage, status, current_lat, current_lng, dest_lat, dest_lng)
       VALUES ($1, $1, $2, $3, $4, 'accepted', 'accepted', 12.9716, 77.5946, 12.9816, 77.6046)
       ON CONFLICT (id) DO UPDATE SET stage = 'accepted', status = 'accepted', rider_name = COALESCE($3, delivery_orders.rider_name), rider_phone = COALESCE($4, delivery_orders.rider_phone), updated_at = NOW()
       RETURNING *`,
      [orderId, riderId || 'rider_' + Date.now().toString().slice(-4), riderName || 'Delivery Partner', riderPhone || '']
    );

    const r = dbRes.rows[0];
    const order: DeliveryOrder = {
      id: r.id,
      orderNumber: r.order_number || r.id,
      riderId: r.rider_id,
      riderName: r.rider_name,
      riderPhone: r.rider_phone,
      stage: r.stage,
      status: r.status,
      currentLat: Number(r.current_lat),
      currentLng: Number(r.current_lng),
      destLat: Number(r.dest_lat),
      destLng: Number(r.dest_lng),
      updatedAt: r.updated_at
    };

    deliveryEventEmitter.emit(`location_update:${orderId}`, order);
    return res.json({ success: true, message: 'Order accepted in PostgreSQL RDS', order });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to accept order in database' });
  }
});

// Rider Stage Progression — Direct PostgreSQL SQL Mutation
app.put('/api/delivery/orders/:id/stage', async (req, res) => {
  const { stage } = req.body;
  const orderId = req.params.id;

  try {
    const dbRes = await pool.query(
      `UPDATE delivery_orders SET stage = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [stage, stage === 'delivered' ? 'delivered' : 'in_transit', orderId]
    );

    if (!dbRes.rows || dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }

    const r = dbRes.rows[0];
    const order: DeliveryOrder = {
      id: r.id,
      orderNumber: r.order_number || r.id,
      riderId: r.rider_id,
      riderName: r.rider_name,
      riderPhone: r.rider_phone,
      stage: r.stage,
      status: r.status,
      currentLat: Number(r.current_lat),
      currentLng: Number(r.current_lng),
      destLat: Number(r.dest_lat),
      destLng: Number(r.dest_lng),
      updatedAt: r.updated_at
    };

    deliveryEventEmitter.emit(`location_update:${orderId}`, order);
    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update stage in database' });
  }
});

// Delivery Slots Endpoint
app.get('/api/delivery/slots', (_req, res) => {
  res.json([
    { id: 'slot-now', name: 'Ultra-Fast 10 Min Delivery', available: true, fee: 15 },
    { id: 'slot-slot1', name: 'Today Express Delivery', available: true, fee: 0 }
  ]);
});

// Single Order Tracking Telemetry — Direct PostgreSQL SQL Querying
app.get('/api/delivery/track/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const dbRes = await pool.query('SELECT * FROM delivery_orders WHERE id = $1 OR order_number = $1', [orderId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const r = dbRes.rows[0];
      const lat = Number(r.current_lat || 12.9716);
      const lng = Number(r.current_lng || 77.5946);
      const destLat = Number(r.dest_lat || 12.9816);
      const destLng = Number(r.dest_lng || 77.6046);
      const etaMinutes = calculateEtaMinutes(lat, lng, destLat, destLng);
      return res.json({
        orderId,
        status: r.status || 'ON_THE_WAY',
        riderName: r.rider_name || 'Delivery Partner',
        riderPhone: r.rider_phone || '',
        currentLocation: { lat, lng },
        destinationLocation: { lat: destLat, lng: destLng },
        etaMinutes,
        updatedAt: r.updated_at
      });
    }
  } catch (err: any) {}

  return res.status(404).json({ error: 'Delivery tracking not found for specified order' });
});

// Rider Login — Direct PostgreSQL SQL Querying
app.post('/api/delivery/login', async (req, res) => {
  const { phone, email } = req.body;
  const rEmail = (email || '').toLowerCase().trim();
  const rPhone = (phone || '').trim();

  try {
    const dbRes = await pool.query('SELECT * FROM delivery_riders WHERE (phone IS NOT NULL AND phone = $1) OR (email IS NOT NULL AND LOWER(email) = $2)', [rPhone, rEmail]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const rider = dbRes.rows[0];
      return res.json({
        success: true,
        token: `rider-jwt-${rider.id}-${Date.now()}`,
        rider: {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          email: rider.email,
          city: rider.city,
          vehicle: rider.vehicle,
          status: rider.status,
          walletBalance: Number(rider.wallet_balance || 0)
        }
      });
    }
  } catch (err: any) {}

  return res.status(401).json({ error: 'Rider account not found. Please register first.' });
});

// Rider Registration Endpoint — Direct PostgreSQL SQL Mutation
app.post('/api/delivery/register', async (req, res) => {
  const { name, phone, email, city, vehicle } = req.body;
  if (!name || (!phone && !email)) {
    return res.status(400).json({ error: 'Name and phone or email required' });
  }

  const riderId = `r_${Date.now()}`;
  const rName = name.trim();
  const rPhone = (phone || '').trim();
  const rEmail = (email || '').toLowerCase().trim();
  const rCity = city || 'Nainavaram';
  const rVehicle = vehicle || 'Bike';

  try {
    await pool.query(
      `INSERT INTO delivery_riders (id, name, phone, email, city, vehicle, status, wallet_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [riderId, rName, rPhone, rEmail, rCity, rVehicle, 'APPROVED', 0.00]
    );

    return res.status(201).json({
      success: true,
      token: `rider-jwt-${riderId}-${Date.now()}`,
      message: 'Rider registered successfully',
      rider: {
        id: riderId,
        name: rName,
        phone: rPhone,
        email: rEmail,
        city: rCity,
        vehicle: rVehicle,
        status: 'APPROVED',
        walletBalance: 0.00
      }
    });
  } catch (err: any) {
    return res.status(409).json({ error: 'Phone or email already registered' });
  }
});

// Rider Payout Request — Direct PostgreSQL SQL Mutation
app.post('/api/delivery/payout', async (req, res) => {
  const { amount, riderId } = req.body;
  const payoutAmt = Number(amount || 0);

  if (payoutAmt <= 0) {
    return res.status(400).json({ error: 'Valid payout amount required' });
  }

  const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

  try {
    await pool.query(
      `INSERT INTO rider_payouts (rider_id, amount, transaction_id, status)
       VALUES ($1, $2, $3, 'COMPLETED')`,
      [String(riderId || ''), payoutAmt, txnId]
    );

    if (riderId) {
      await pool.query(`UPDATE delivery_riders SET wallet_balance = GREATEST(0, wallet_balance - $1) WHERE id = $2`, [payoutAmt, String(riderId)]);
    }

    return res.json({
      success: true,
      message: `Payout request for ₹${payoutAmt} completed successfully`,
      transactionId: txnId,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Payout request failed due to database error',
      message: err?.message
    });
  }
});

// Handover OTP Verification & Rider Payout Credit
app.post('/api/rider/verify-handover-otp', async (req, res) => {
  const { orderId, inputOtp, expectedOtp, riderId } = req.body;
  if (!inputOtp || (expectedOtp && inputOtp !== expectedOtp)) {
    return res.status(400).json({ error: 'Invalid handover OTP code' });
  }
  const payoutCredit = 45;

  try {
    await pool.query("UPDATE delivery_orders SET stage = 'delivered', status = 'delivered', updated_at = NOW() WHERE id = $1", [orderId]);
    if (riderId) {
      await pool.query('UPDATE delivery_riders SET wallet_balance = wallet_balance + $1 WHERE id = $2', [payoutCredit, String(riderId)]);
    }
  } catch (err: any) {}

  return res.json({
    success: true,
    orderId: orderId || '',
    status: 'DELIVERED',
    payoutCredit,
    message: `OTP verified! Credited ₹${payoutCredit} to rider wallet.`
  });
});

// Rider Stats & Earnings — Direct PostgreSQL Querying
app.get('/api/delivery/stats', async (req, res) => {
  const riderId = String(req.query.riderId || '');

  try {
    const dbRes = await pool.query("SELECT COUNT(*) as total_deliveries, COALESCE(SUM(payout_credit), 0) as total_earnings FROM delivery_orders WHERE status = 'delivered' AND ($1 = '' OR rider_id = $1)", [riderId]);
    const row = dbRes.rows[0];

    return res.json({
      success: true,
      totalDeliveries: Number(row.total_deliveries || 0),
      todayEarnings: Number(row.total_earnings || 0),
      rating: 4.9,
      onlineStatus: 'ONLINE'
    });
  } catch (err: any) {
    return res.json({
      success: true,
      totalDeliveries: 0,
      todayEarnings: 0,
      rating: 4.9,
      onlineStatus: 'ONLINE'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚴 dynamic delivery-service running on port ${PORT}`);
});
