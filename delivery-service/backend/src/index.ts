import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT ?? 5004);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRds ? { rejectUnauthorized: false } : undefined,
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
        vehicle VARCHAR(100) DEFAULT 'Bike',
        status VARCHAR(50) DEFAULT 'ONLINE',
        wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
        aadhar VARCHAR(50),
        license_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rider_payouts (
        id SERIAL PRIMARY KEY,
        rider_id VARCHAR(255),
        rider_name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        upi_id VARCHAR(255),
        amount NUMERIC(10, 2) NOT NULL,
        completed_deliveries INT DEFAULT 0,
        total_distance_km NUMERIC(10,2) DEFAULT 0,
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe migrations
    const safeAlters = [
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS rider_name VARCHAR(255)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS completed_deliveries INT DEFAULT 0`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS aadhar VARCHAR(50)`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 5.0`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS total_deliveries INT DEFAULT 0`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS account_number VARCHAR(100)`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50)`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)`,
      `ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100)`,
      `ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10)`,
      `ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS order_id INT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id VARCHAR(255)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_name VARCHAR(255)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_phone VARCHAR(50)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10)`,
    ];
    for (const sql of safeAlters) {
      try { await pool.query(sql); } catch {}
    }

    // Indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_delivery_riders_phone ON delivery_riders(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_delivery_riders_email ON delivery_riders(email)`,
      `CREATE INDEX IF NOT EXISTS idx_rider_payouts_rider_id ON rider_payouts(rider_id)`,
      `CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_delivery_orders_rider_id ON delivery_orders(rider_id)`,
      `CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_number ON delivery_orders(order_number)`,
    ];
    for (const idx of indexes) {
      try { await pool.query(idx); } catch {}
    }

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

// GET Active Delivery Orders — Join orders table & delivery_orders
app.get('/api/delivery/orders/active', async (_req, res) => {
  try {
    const dbRes = await pool.query(`
      SELECT 
        COALESCE(d.id, o.id::text, o.order_number) as id,
        COALESCE(d.order_number, o.order_number, o.id::text) as order_number,
        d.rider_id,
        d.rider_name,
        d.rider_phone,
        COALESCE(d.stage, 'placed') as stage,
        COALESCE(d.status, o.status, 'placed') as status,
        COALESCE(d.current_lat, 12.9716) as current_lat,
        COALESCE(d.current_lng, 77.5946) as current_lng,
        COALESCE(d.dest_lat, 12.9816) as dest_lat,
        COALESCE(d.dest_lng, 77.6046) as dest_lng,
        COALESCE(d.updated_at, o.updated_at, NOW()) as updated_at,
        o.total_amount,
        o.shipping_address,
        u.name as customer_name
      FROM orders o
      LEFT JOIN delivery_orders d ON (d.id = o.id::text OR d.order_number = o.order_number OR d.id = o.order_number)
      LEFT JOIN users u ON u.id = o.user_id
      WHERE COALESCE(d.status, o.status) NOT IN ('delivered', 'cancelled')
      ORDER BY COALESCE(d.updated_at, o.updated_at) DESC
      LIMIT 100
    `).catch(() => ({ rows: [] }));

    const standaloneRes = await pool.query(`
      SELECT * FROM delivery_orders 
      WHERE status NOT IN ('delivered', 'cancelled')
        AND id NOT IN (SELECT COALESCE(id::text, order_number) FROM orders)
        AND order_number NOT IN (SELECT COALESCE(order_number, id::text) FROM orders)
      ORDER BY updated_at DESC
    `).catch(() => ({ rows: [] }));

    const combinedRows = [...(dbRes.rows || []), ...(standaloneRes.rows || [])];

    const dbOrders = combinedRows.map((r: any) => ({
      id: r.id,
      numericId: r.id,
      orderNumber: r.order_number || r.id,
      riderId: r.rider_id || '',
      riderName: r.rider_name || '',
      riderPhone: r.rider_phone || '',
      stage: r.stage || 'placed',
      status: r.status || 'placed',
      currentLat: Number(r.current_lat || 12.9716),
      currentLng: Number(r.current_lng || 77.5946),
      destLat: Number(r.dest_lat || 12.9816),
      destLng: Number(r.dest_lng || 77.6046),
      totalAmount: Number(r.total_amount || 0),
      address: r.shipping_address || 'Delivery Address',
      customerName: r.customer_name || 'Customer',
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
  const rId = riderId ? String(riderId) : 'rider_' + Date.now().toString().slice(-4);
  const rName = riderName || 'Delivery Partner';
  const rPhone = riderPhone || '';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dbRes = await client.query(
      `INSERT INTO delivery_orders (id, order_number, rider_id, rider_name, rider_phone, stage, status, current_lat, current_lng, dest_lat, dest_lng)
       VALUES ($1, $1, $2, $3, $4, 'accepted', 'accepted', 12.9716, 77.5946, 12.9816, 77.6046)
       ON CONFLICT (id) DO UPDATE SET stage = 'accepted', status = 'accepted', rider_id = EXCLUDED.rider_id, rider_name = COALESCE(EXCLUDED.rider_name, delivery_orders.rider_name), rider_phone = COALESCE(EXCLUDED.rider_phone, delivery_orders.rider_phone), updated_at = NOW()
       RETURNING *`,
      [orderId, rId, rName, rPhone]
    );

    // Sync main orders table
    await client.query(
      `UPDATE orders SET status = 'accepted', rider_id = $1, rider_name = $2, rider_phone = $3, updated_at = NOW() WHERE id::text = $4 OR order_number = $4`,
      [rId, rName, rPhone, String(orderId)]
    ).catch(() => null);

    await client.query('COMMIT');
    client.release();

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
    await client.query('ROLLBACK').catch(() => null);
    client.release();
    return res.status(500).json({ error: 'Failed to accept order in database', message: err?.message });
  }
});

// Rider Stage Progression — Direct PostgreSQL SQL Mutation & Automatic Inventory Deduction
app.put('/api/delivery/orders/:id/stage', async (req, res) => {
  const { stage } = req.body;
  const orderId = req.params.id;
  const statusVal = stage === 'delivered' ? 'delivered' : (stage === 'out_for_delivery' || stage === 'in_transit' ? 'out_for_delivery' : stage);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dbRes = await client.query(
      `UPDATE delivery_orders SET stage = $1, status = $2, updated_at = NOW() WHERE id = $3 OR order_number = $3 RETURNING *`,
      [stage, statusVal, orderId]
    );

    if (!dbRes.rows || dbRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Delivery order not found' });
    }

    // Sync main orders table status
    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id::text = $2 OR order_number = $2`,
      [statusVal, String(orderId)]
    ).catch(() => null);

    // Automatic product and warehouse inventory deduction when rider picks up produce from dark store
    if (stage === 'picked_up' || stage === 'at_warehouse' || stage === 'accepted') {
      try {
        const itemsRes = await client.query(
          `SELECT product_id, product_name, quantity FROM order_items WHERE order_id = $1 OR order_id = (SELECT id FROM orders WHERE id::text = $1 OR order_number = $1 LIMIT 1)`,
          [orderId]
        );
        for (const item of itemsRes.rows || []) {
          const qty = Number(item.quantity || 1);
          const pId = item.product_id;
          const pName = item.product_name;
          if (pId || pName) {
            await client.query(
              `UPDATE inventory SET quantity = GREATEST(0, quantity - $1), status = CASE WHEN (quantity - $1) <= 0 THEN 'out_of_stock' ELSE 'in_stock' END, updated_at = NOW() WHERE product_id = $2 OR LOWER(product_name) = LOWER($3)`,
              [qty, pId || 0, (pName || '').toLowerCase()]
            );
            await client.query(
              `UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 OR LOWER(name) = LOWER($3)`,
              [qty, pId || 0, (pName || '').toLowerCase()]
            );
          }
        }
      } catch (invErr: any) {
        console.warn('⚠️ Inventory deduction on rider stage update warning:', invErr?.message);
      }
    }

    await client.query('COMMIT');
    client.release();

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
    await client.query('ROLLBACK').catch(() => null);
    client.release();
    return res.status(500).json({ error: 'Failed to update stage in database', message: err?.message });
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
  const { name, phone, email, city, vehicle, aadhar, licenseNumber, bankName, accountNumber, ifscCode, accountHolderName, upiId } = req.body;
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
      `INSERT INTO delivery_riders (id, name, phone, email, city, vehicle, status, wallet_balance, aadhar, license_number, bank_name, account_number, ifsc_code, account_holder_name, upi_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', 0.00, $7, $8, $9, $10, $11, $12, $13)`,
      [
        riderId, rName, rPhone || null, rEmail || null, rCity, rVehicle,
        aadhar || null, licenseNumber || null,
        bankName || null, accountNumber || null, ifscCode || null, accountHolderName || null, upiId || null
      ]
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
        walletBalance: 0.00,
        bankName,
        accountNumber,
        ifscCode,
        accountHolderName,
        upiId
      }
    });
  } catch (err: any) {
    return res.status(409).json({ error: 'Phone or email already registered', message: err?.message });
  }
});

// Admin: List All Registered Riders
app.get(['/api/delivery/riders', '/api/rider/list'], async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM delivery_riders ORDER BY created_at DESC');
    return res.json(dbRes.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      email: r.email || '',
      city: r.city || '',
      vehicle: r.vehicle || 'Bike',
      status: r.status || 'APPROVED',
      walletBalance: Number(r.wallet_balance || 0),
      aadhar: r.aadhar || '',
      licenseNumber: r.license_number || '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    })));
  } catch (err: any) {
    return res.json([]);
  }
});

// Rider Payout Request — Direct PostgreSQL SQL Mutation
app.post('/api/delivery/payout', async (req, res) => {
  const { amount, riderId, upiId } = req.body;
  const rId = riderId ? String(riderId) : '';
  const client = await pool.connect();

  try {
    let payoutAmt = Number(amount || 0);
    let riderName = '', riderPhone = '', riderEmail = '', currentBalance = 0;

    if (rId) {
      const riderRes = await client.query('SELECT name, phone, email, wallet_balance FROM delivery_riders WHERE id = $1', [rId]);
      if (riderRes.rows && riderRes.rows.length > 0) {
        riderName = riderRes.rows[0].name || '';
        riderPhone = riderRes.rows[0].phone || '';
        riderEmail = riderRes.rows[0].email || '';
        currentBalance = Number(riderRes.rows[0].wallet_balance || 0);
      }
    }

    if (payoutAmt <= 0) {
      payoutAmt = currentBalance;
    }

    if (payoutAmt <= 0) {
      client.release();
      return res.status(400).json({ error: 'No wallet balance available for payout request' });
    }

    if (currentBalance > 0 && payoutAmt > currentBalance) {
      client.release();
      return res.status(400).json({ error: `Payout amount ₹${payoutAmt} exceeds current wallet balance ₹${currentBalance}` });
    }

    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO rider_payouts (rider_id, rider_name, phone, email, upi_id, amount, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED')`,
      [rId, riderName, riderPhone, riderEmail, upiId || '', payoutAmt, txnId]
    );

    if (rId) {
      await client.query(`UPDATE delivery_riders SET wallet_balance = GREATEST(0, wallet_balance - $1) WHERE id = $2`, [payoutAmt, rId]);
    }

    await client.query('COMMIT');
    client.release();

    return res.json({
      success: true,
      message: `Payout request for ₹${payoutAmt} completed successfully`,
      transactionId: txnId,
      payoutAmount: payoutAmt,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => null);
    client.release();
    return res.status(500).json({
      error: 'Payout request failed due to database error',
      message: err?.message
    });
  }
});

// Generate Handover OTP Code
app.post('/api/delivery/otp/generate', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  try {
    await pool.query('UPDATE delivery_orders SET delivery_otp = $1 WHERE id = $2 OR order_number = $2', [otp, String(orderId)]);
    await pool.query('UPDATE orders SET delivery_otp = $1 WHERE id::text = $2 OR order_number = $2', [otp, String(orderId)]).catch(() => {});
    return res.json({ success: true, orderId, otp });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate OTP', message: err?.message });
  }
});

// Handover OTP Verification & Rider Payout Credit
app.post('/api/rider/verify-handover-otp', async (req, res) => {
  const { orderId, inputOtp, otp, riderId } = req.body;
  const userOtp = String(inputOtp || otp || '').trim();

  if (!orderId || !userOtp) {
    return res.status(400).json({ error: 'orderId and valid OTP PIN are required' });
  }

  const payoutCredit = 45;
  const client = await pool.connect();

  try {
    let valid = false;
    let actualRiderId = riderId ? String(riderId) : '';

    // Query delivery_orders first
    const dbRes = await client.query(
      "SELECT delivery_otp, rider_id FROM delivery_orders WHERE id = $1 OR order_number = $1",
      [String(orderId)]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      const storedOtp = String(dbRes.rows[0].delivery_otp || '').trim();
      if (!actualRiderId && dbRes.rows[0].rider_id) {
        actualRiderId = String(dbRes.rows[0].rider_id);
      }
      if (storedOtp && userOtp === storedOtp) {
        valid = true;
      }
    }

    // Query orders table fallback if not verified yet
    if (!valid) {
      const mainRes = await client.query(
        "SELECT delivery_otp, rider_id FROM orders WHERE id::text = $1 OR order_number = $1",
        [String(orderId)]
      );
      if (mainRes.rows && mainRes.rows.length > 0) {
        const storedOtp = String(mainRes.rows[0].delivery_otp || '').trim();
        if (!actualRiderId && mainRes.rows[0].rider_id) {
          actualRiderId = String(mainRes.rows[0].rider_id);
        }
        if (storedOtp && userOtp === storedOtp) {
          valid = true;
        }
      }
    }

    if (!valid) {
      client.release();
      return res.status(400).json({ error: 'Invalid handover OTP code. Please check OTP with customer.' });
    }

    await client.query('BEGIN');

    // Update delivery_orders
    await client.query(
      "UPDATE delivery_orders SET stage = 'delivered', status = 'delivered', updated_at = NOW() WHERE id = $1 OR order_number = $1",
      [String(orderId)]
    );

    // Update orders table
    await client.query(
      "UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id::text = $1 OR order_number = $1",
      [String(orderId)]
    ).catch(() => null);

    // Credit rider wallet balance & total deliveries
    if (actualRiderId) {
      await client.query(
        'UPDATE delivery_riders SET wallet_balance = wallet_balance + $1, total_deliveries = total_deliveries + 1 WHERE id = $2',
        [payoutCredit, actualRiderId]
      );
    }

    await client.query('COMMIT');
    client.release();

    return res.json({
      success: true,
      orderId: String(orderId),
      status: 'DELIVERED',
      payoutCredit,
      message: `OTP verified successfully! Credited ₹${payoutCredit} to rider wallet.`
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => null);
    client.release();
    return res.status(500).json({ error: 'Handover verification failed', message: err?.message });
  }
});

// Rider Stats & Earnings — Direct PostgreSQL Querying
app.get('/api/delivery/stats', async (req, res) => {
  const riderId = String(req.query.riderId || '');

  try {
    const [dRes, rRes] = await Promise.all([
      pool.query("SELECT COUNT(*) as total_deliveries, COALESCE(SUM(payout_credit), 0) as total_earnings FROM delivery_orders WHERE status = 'delivered' AND ($1 = '' OR rider_id = $1)", [riderId]),
      riderId ? pool.query('SELECT avg_rating, status FROM delivery_riders WHERE id = $1', [riderId]) : Promise.resolve({ rows: [] })
    ]);
    const row = dRes.rows[0];
    const riderRow = rRes.rows[0];
    const rating = riderRow?.avg_rating ? Number(riderRow.avg_rating) : 5.0;
    const onlineStatus = riderRow?.status || 'ONLINE';

    return res.json({
      success: true,
      totalDeliveries: Number(row.total_deliveries || 0),
      todayEarnings: Number(row.total_earnings || 0),
      rating,
      onlineStatus
    });
  } catch (err: any) {
    return res.json({
      success: true,
      totalDeliveries: 0,
      todayEarnings: 0,
      rating: 5.0,
      onlineStatus: 'ONLINE'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚴 dynamic delivery-service running on port ${PORT}`);
});
