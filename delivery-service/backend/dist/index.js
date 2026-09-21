"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const events_1 = require("events");
const pg_1 = require("pg");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 5004);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal';
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isRds ? { rejectUnauthorized: false } : undefined,
});
const deliveryEventEmitter = new events_1.EventEmitter();
deliveryEventEmitter.setMaxListeners(100);
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
        ];
        for (const sql of safeAlters) {
            try {
                await pool.query(sql);
            }
            catch { }
        }
        // Indexes
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_delivery_riders_phone ON delivery_riders(phone)`,
            `CREATE INDEX IF NOT EXISTS idx_delivery_riders_email ON delivery_riders(email)`,
            `CREATE INDEX IF NOT EXISTS idx_rider_payouts_rider_id ON rider_payouts(rider_id)`,
            `CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status)`,
        ];
        for (const idx of indexes) {
            try {
                await pool.query(idx);
            }
            catch { }
        }
        console.log('🐘 [delivery-service] PostgreSQL database tables ready.');
    }
    catch (err) {
        console.warn('⚠️ [delivery-service] DB init warning:', err?.message || err);
    }
}
initDb();
function calculateEtaMinutes(lat1, lon1, lat2, lon2, speedKmh = 25) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
        const dbOrders = (dbRes.rows || []).map((r) => ({
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
    }
    catch (err) {
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
        const dbRes = await pool.query(`INSERT INTO delivery_orders (id, order_number, rider_id, rider_name, rider_phone, stage, status, current_lat, current_lng, dest_lat, dest_lng, updated_at)
       VALUES ($1, $1, $2, $3, $4, 'in_transit', 'ON_THE_WAY', $5, $6, $5 + 0.015, $6 + 0.015, NOW())
       ON CONFLICT (id) DO UPDATE SET
         current_lat = EXCLUDED.current_lat,
         current_lng = EXCLUDED.current_lng,
         rider_name = COALESCE(EXCLUDED.rider_name, delivery_orders.rider_name),
         rider_phone = COALESCE(EXCLUDED.rider_phone, delivery_orders.rider_phone),
         updated_at = NOW()
       RETURNING *`, [orderId, riderId || '', riderName || 'Delivery Partner', riderPhone || '', numLat, numLng]);
        const r = dbRes.rows[0];
        const updatedOrder = {
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
    }
    catch (err) {
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
    const sendOrderUpdate = (order) => {
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
            const dbOrder = {
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
        }
        else {
            res.write(`data: ${JSON.stringify({ orderId, status: 'PREPARING', message: 'Order is being packed at dark store' })}\n\n`);
        }
    }
    catch (err) {
        res.write(`data: ${JSON.stringify({ orderId, status: 'PREPARING', message: 'Connecting to delivery telemetry...' })}\n\n`);
    }
    const listener = (updatedOrder) => {
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
        const dbRes = await pool.query(`INSERT INTO delivery_orders (id, order_number, rider_id, rider_name, rider_phone, stage, status, current_lat, current_lng, dest_lat, dest_lng)
       VALUES ($1, $1, $2, $3, $4, 'accepted', 'accepted', 12.9716, 77.5946, 12.9816, 77.6046)
       ON CONFLICT (id) DO UPDATE SET stage = 'accepted', status = 'accepted', rider_name = COALESCE($3, delivery_orders.rider_name), rider_phone = COALESCE($4, delivery_orders.rider_phone), updated_at = NOW()
       RETURNING *`, [orderId, riderId || 'rider_' + Date.now().toString().slice(-4), riderName || 'Delivery Partner', riderPhone || '']);
        const r = dbRes.rows[0];
        const order = {
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
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to accept order in database' });
    }
});
// Rider Stage Progression — Direct PostgreSQL SQL Mutation & Automatic Inventory Deduction
app.put('/api/delivery/orders/:id/stage', async (req, res) => {
    const { stage } = req.body;
    const orderId = req.params.id;
    try {
        const dbRes = await pool.query(`UPDATE delivery_orders SET stage = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`, [stage, stage === 'delivered' ? 'delivered' : 'in_transit', orderId]);
        if (!dbRes.rows || dbRes.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery order not found' });
        }
        // Automatic product and warehouse inventory deduction when rider picks up produce from dark store
        if (stage === 'picked_up' || stage === 'at_warehouse' || stage === 'accepted') {
            try {
                const itemsRes = await pool.query(`SELECT product_id, product_name, quantity FROM order_items WHERE order_id = $1 OR order_id = (SELECT id FROM orders WHERE id::text = $1 OR order_number = $1 LIMIT 1)`, [orderId]);
                for (const item of itemsRes.rows || []) {
                    const qty = Number(item.quantity || 1);
                    const pId = item.product_id;
                    const pName = item.product_name;
                    if (pId || pName) {
                        await pool.query(`UPDATE inventory SET quantity = GREATEST(0, quantity - $1), status = CASE WHEN (quantity - $1) <= 0 THEN 'out_of_stock' ELSE 'in_stock' END, updated_at = NOW() WHERE product_id = $2 OR LOWER(product_name) = LOWER($3)`, [qty, pId || 0, (pName || '').toLowerCase()]);
                        await pool.query(`UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 OR LOWER(name) = LOWER($3)`, [qty, pId || 0, (pName || '').toLowerCase()]);
                    }
                }
            }
            catch (invErr) {
                console.warn('⚠️ Inventory deduction on rider stage update warning:', invErr?.message);
            }
        }
        const r = dbRes.rows[0];
        const order = {
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
    }
    catch (err) {
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
    }
    catch (err) { }
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
    }
    catch (err) { }
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
        await pool.query(`INSERT INTO delivery_riders (id, name, phone, email, city, vehicle, status, wallet_balance, aadhar, license_number, bank_name, account_number, ifsc_code, account_holder_name, upi_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', 0.00, $7, $8, $9, $10, $11, $12, $13)`, [
            riderId, rName, rPhone || null, rEmail || null, rCity, rVehicle,
            aadhar || null, licenseNumber || null,
            bankName || null, accountNumber || null, ifscCode || null, accountHolderName || null, upiId || null
        ]);
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
    }
    catch (err) {
        return res.status(409).json({ error: 'Phone or email already registered', message: err?.message });
    }
});
// Admin: List All Registered Riders
app.get(['/api/delivery/riders', '/api/rider/list'], async (_req, res) => {
    try {
        const dbRes = await pool.query('SELECT * FROM delivery_riders ORDER BY created_at DESC');
        return res.json(dbRes.rows.map((r) => ({
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
    }
    catch (err) {
        return res.json([]);
    }
});
// Rider Payout Request — Direct PostgreSQL SQL Mutation
app.post('/api/delivery/payout', async (req, res) => {
    const { amount, riderId, upiId } = req.body;
    const payoutAmt = Number(amount || 0);
    if (payoutAmt <= 0) {
        return res.status(400).json({ error: 'Valid payout amount required' });
    }
    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    try {
        // Fetch rider info for enriched payout record
        let riderName = '', riderPhone = '', riderEmail = '';
        if (riderId) {
            const riderRes = await pool.query('SELECT name, phone, email FROM delivery_riders WHERE id = $1', [String(riderId)]).catch(() => null);
            if (riderRes?.rows?.[0]) {
                riderName = riderRes.rows[0].name || '';
                riderPhone = riderRes.rows[0].phone || '';
                riderEmail = riderRes.rows[0].email || '';
            }
        }
        await pool.query(`INSERT INTO rider_payouts (rider_id, rider_name, phone, email, upi_id, amount, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED')`, [String(riderId || ''), riderName, riderPhone, riderEmail, upiId || '', payoutAmt, txnId]);
        if (riderId) {
            await pool.query(`UPDATE delivery_riders SET wallet_balance = GREATEST(0, wallet_balance - $1) WHERE id = $2`, [payoutAmt, String(riderId)]);
        }
        return res.json({
            success: true,
            message: `Payout request for ₹${payoutAmt} completed successfully`,
            transactionId: txnId,
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
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
        await pool.query('UPDATE orders SET delivery_otp = $1 WHERE id::text = $2 OR order_number = $2', [otp, String(orderId)]).catch(() => { });
        return res.json({ success: true, orderId, otp });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to generate OTP', message: err?.message });
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
    }
    catch (err) { }
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
    }
    catch (err) {
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
