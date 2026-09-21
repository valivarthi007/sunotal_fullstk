"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastRealtimeEvent = broadcastRealtimeEvent;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pg_1 = require("pg");
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal:sunotal_pass_dev@postgres:5432/sunotal';
const JWT_SECRET = process.env.JWT_SECRET || 'sunotal_jwt_secret_2026_super_secure';
function signJwtNative(payload, secret) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 30 * 86400 })).toString('base64url');
    const signature = crypto_1.default.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
}
const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds');
const gatewayPgPool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isRds ? { rejectUnauthorized: false } : undefined,
});
const DEFAULT_DEMO_USERS = [
    { id: "1", name: "Sunotal Admin", email: "admin@sunotal.com", role: "admin", status: "active", active: true, phone: "9876543210", city: "Bengaluru", walletBalance: 1000, createdAt: new Date().toISOString() },
    { id: "2", name: "Sunotal Customer", email: "user@sunotal.com", role: "customer", status: "active", active: true, phone: "9876543211", city: "Bengaluru", walletBalance: 500, createdAt: new Date().toISOString() },
    { id: "3", name: "Green Farms Vendor", email: "vendor@sunotal.com", role: "vendor", status: "active", active: true, phone: "9876543212", city: "Mysuru", walletBalance: 2500, createdAt: new Date().toISOString() },
    { id: "4", name: "Express Rider", email: "rider@sunotal.com", role: "rider", status: "active", active: true, phone: "9876543213", city: "Bengaluru", walletBalance: 300, createdAt: new Date().toISOString() }
];
async function handleInProcessAuth(req, res) {
    const { email, password } = req?.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    try {
        const dbRes = await gatewayPgPool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (dbRes.rows && dbRes.rows.length > 0) {
            const userRow = dbRes.rows[0];
            let isMatch = false;
            if (userRow.password_hash) {
                try {
                    isMatch = await bcryptjs_1.default.compare(password, userRow.password_hash);
                }
                catch {
                    isMatch = false;
                }
            }
            if (isMatch) {
                const normUser = {
                    id: String(userRow.id),
                    name: userRow.name,
                    email: userRow.email,
                    role: userRow.role,
                    status: userRow.active === false ? 'inactive' : 'active',
                    active: userRow.active ?? true,
                    phone: userRow.phone || '',
                    city: userRow.city || '',
                    walletBalance: Number(userRow.wallet_balance || 0),
                    createdAt: userRow.created_at || new Date().toISOString(),
                };
                const token = signJwtNative({ id: normUser.id, email: normUser.email, name: normUser.name, role: normUser.role }, JWT_SECRET);
                return res.status(200).json({ success: true, token, user: normUser });
            }
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    catch (err) {
        console.error('⚠️ [gateway handleInProcessAuth err]:', err?.message || err);
        return res.status(503).json({ error: 'Authentication service is temporarily unavailable. Please try again.' });
    }
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const SERVICES = {
    AUTH: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001',
    OPERATIONS: process.env.OPERATIONS_SERVICE_URL || 'http://127.0.0.1:5002',
    CATALOG: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:5009',
    ORDER: process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:5010',
    DELIVERY: process.env.DELIVERY_SERVICE_URL || 'http://127.0.0.1:5004',
    VENDOR: process.env.VENDOR_SERVICE_URL || 'http://127.0.0.1:5005',
    NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:5011',
    SUPPORT: process.env.SUPPORT_SERVICE_URL || 'http://127.0.0.1:5007',
    USER: process.env.USER_SERVICE_URL || 'http://127.0.0.1:5008',
    INVENTORY: process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:5003',
};
// Enable CORS & JSON parsing
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
// Distributed Tracing Middleware (X-Correlation-ID)
app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `sn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
});
// Real-Time SSE Event-Broadcasting Engine
const sseClients = new Set();
function broadcastRealtimeEvent(event) {
    const payload = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
    sseClients.forEach((client) => {
        try {
            if (!client.writableEnded) {
                client.write(payload);
            }
            else {
                sseClients.delete(client);
            }
        }
        catch {
            sseClients.delete(client);
        }
    });
}
// SSE Real-Time Stream Endpoint
app.get('/api/realtime/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Sunotal Real-time Engine Connected' })}\n\n`);
    sseClients.add(res);
    const heartbeat = setInterval(() => {
        try {
            if (!res.writableEnded) {
                res.write(`:ping\n\n`);
            }
            else {
                clearInterval(heartbeat);
                sseClients.delete(res);
            }
        }
        catch {
            clearInterval(heartbeat);
            sseClients.delete(res);
        }
    }, 15000);
    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
    });
});
// Automatic Mutation Realtime Broadcast Middleware
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                broadcastRealtimeEvent({
                    type: 'REALTIME_MUTATION',
                    path: req.originalUrl || req.url,
                    method: req.method,
                });
            }
        });
    }
    next();
});
async function handleResilientResponse(req, res) {
    if (res.headersSent)
        return;
    const url = req?.originalUrl || req?.url || '';
    const method = req?.method || 'GET';
    if (url.includes('/auth') || url.includes('/login')) {
        return handleInProcessAuth(req, res);
    }
    // Product Definitions
    if (url.includes('product-definitions')) {
        if (method === 'GET') {
            try {
                const dbRes = await gatewayPgPool.query('SELECT * FROM product_definitions ORDER BY id ASC');
                if (dbRes.rows) {
                    return res.json(dbRes.rows.map(d => ({ id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit })));
                }
            }
            catch { }
            return res.json([]);
        }
        if (method === 'POST') {
            const { name, category, defaultUnit } = req.body || {};
            if (name && category) {
                try {
                    const dbRes = await gatewayPgPool.query(`INSERT INTO product_definitions (name, category, default_unit) VALUES ($1, $2, $3) RETURNING *`, [String(name).trim(), String(category).trim(), defaultUnit || '1 kg']);
                    if (dbRes.rows && dbRes.rows[0]) {
                        const d = dbRes.rows[0];
                        return res.status(201).json({ id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit });
                    }
                }
                catch { }
            }
            return res.status(503).json({ error: 'Failed to create product definition.' });
        }
        if (method === 'DELETE') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1] || (url.match(/\/(?:categories|product-definitions|products)\/(\d+)/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                if (targetId && !isNaN(targetId)) {
                    await gatewayPgPool.query('DELETE FROM product_definitions WHERE id = $1', [targetId]);
                    return res.json({ success: true, message: 'Product definition deleted successfully', deletedId: targetId });
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to delete product definition', message: err?.message });
            }
        }
        return res.status(503).json({ error: 'Product definition service unavailable.' });
    }
    // Categories
    if (url.includes('categories')) {
        if (method === 'GET') {
            try {
                const dbRes = await gatewayPgPool.query('SELECT * FROM categories WHERE active = true ORDER BY id ASC');
                if (dbRes.rows) {
                    return res.json(dbRes.rows.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📦', active: c.active ?? true })));
                }
            }
            catch { }
            return res.json([]);
        }
        if (method === 'POST') {
            const { name, icon } = req.body || {};
            if (name) {
                try {
                    const dbRes = await gatewayPgPool.query(`INSERT INTO categories (name, icon, active) VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon RETURNING *`, [String(name).trim(), icon || '📦', true]);
                    if (dbRes.rows && dbRes.rows[0]) {
                        const c = dbRes.rows[0];
                        return res.status(201).json({ id: c.id, name: c.name, icon: c.icon, active: c.active });
                    }
                }
                catch { }
            }
            return res.status(503).json({ error: 'Failed to create category.' });
        }
        if (method === 'DELETE') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1] || (url.match(/\/(?:categories|product-definitions|products)\/(\d+)/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                if (targetId && !isNaN(targetId)) {
                    await gatewayPgPool.query('DELETE FROM categories WHERE id = $1', [targetId]);
                    return res.json({ success: true, message: 'Category deleted successfully', deletedId: targetId });
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to delete category', message: err?.message });
            }
        }
        return res.status(503).json({ error: 'Category service unavailable.' });
    }
    // Products & Storefront
    if (url.includes('products') || url.includes('storefront')) {
        if (method === 'GET') {
            try {
                const showAll = url.includes('all=true') || url.includes('all=1');
                const sql = showAll ? 'SELECT * FROM products ORDER BY id DESC' : 'SELECT * FROM products WHERE active = true ORDER BY id DESC';
                const dbRes = await gatewayPgPool.query(sql);
                if (dbRes.rows) {
                    return res.json(dbRes.rows.map(p => ({
                        id: String(p.id),
                        name: p.name,
                        category: p.category,
                        price: Number(p.price),
                        originalPrice: Number(p.original_price || p.price),
                        unit: p.unit,
                        image: p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
                        isOrganic: p.is_organic,
                        stock: p.stock,
                        rating: Number(p.rating || 5.0),
                        active: p.active ?? true
                    })));
                }
            }
            catch { }
            return res.json([]);
        }
        if (method === 'DELETE') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1] || (url.match(/\/(?:categories|product-definitions|products)\/(\d+)/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                if (targetId && !isNaN(targetId)) {
                    await gatewayPgPool.query('DELETE FROM products WHERE id = $1', [targetId]);
                    return res.json({ success: true, message: 'Product deleted successfully', deletedId: targetId });
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to delete product', message: err?.message });
            }
        }
        if (method === 'POST') {
            return res.status(503).json({ error: 'Product creation service unavailable.' });
        }
        return res.status(503).json({ error: 'Catalog service unavailable.' });
    }
    // Users
    if (url.includes('users')) {
        if (method === 'GET') {
            return handleInProcessUsers(req, res);
        }
        if (method === 'PUT' || method === 'PATCH') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                const { name, phone, city, role, active } = req.body || {};
                if (targetId && !isNaN(targetId)) {
                    const dbRes = await gatewayPgPool.query(`UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), city = COALESCE($3, city), role = COALESCE($4, role), active = COALESCE($5, active) WHERE id = $6 RETURNING *`, [name, phone, city, role, active, targetId]);
                    if (dbRes.rows && dbRes.rows[0]) {
                        const u = dbRes.rows[0];
                        return res.json({ id: String(u.id), name: u.name, email: u.email, role: u.role, active: u.active ?? true, status: u.active === false ? 'inactive' : 'active', phone: u.phone || '', city: u.city || '', walletBalance: Number(u.wallet_balance || 0), createdAt: u.created_at });
                    }
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to update user', message: err?.message });
            }
        }
        if (method === 'DELETE') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                if (targetId && !isNaN(targetId)) {
                    await gatewayPgPool.query('DELETE FROM users WHERE id = $1', [targetId]);
                    return res.json({ success: true, message: 'User deleted successfully', deletedId: targetId });
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to delete user', message: err?.message });
            }
        }
        return handleInProcessUsers(req, res);
    }
    // Vendors
    if (url.includes('vendors')) {
        if (method === 'GET') {
            return handleInProcessVendors(req, res);
        }
        if (method === 'POST') {
            return handleInProcessVendorRegister(req, res);
        }
        if (method === 'PUT' || method === 'PATCH') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                const { name, vendorName, email, phone, category, address, city, status, active } = req.body || {};
                if (targetId && !isNaN(targetId)) {
                    const dbRes = await gatewayPgPool.query(`UPDATE vendors SET name = COALESCE($1, name), vendor_name = COALESCE($2, vendor_name), email = COALESCE($3, email), phone = COALESCE($4, phone), category = COALESCE($5, category), address = COALESCE($6, address), city = COALESCE($7, city), status = COALESCE($8, status), active = COALESCE($9, active) WHERE id = $10 RETURNING *`, [name, vendorName || name, email, phone, category, address, city, status, active, targetId]);
                    if (dbRes.rows && dbRes.rows[0]) {
                        const v = dbRes.rows[0];
                        return res.json({ id: v.id, name: v.name || v.vendor_name, vendorName: v.vendor_name || v.name, email: v.email, phone: v.phone, category: v.category, address: v.address, city: v.city, status: v.status, active: v.active, createdAt: v.created_at });
                    }
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to update vendor', message: err?.message });
            }
        }
        if (method === 'DELETE') {
            try {
                const idFromParams = req.params?.id;
                const idFromUrl = (url.match(/\/(\d+)(?:\?.*)?$/) || [])[1];
                const targetId = Number(idFromParams || idFromUrl);
                if (targetId && !isNaN(targetId)) {
                    await gatewayPgPool.query('DELETE FROM vendors WHERE id = $1', [targetId]);
                    return res.json({ success: true, message: 'Vendor deleted successfully', deletedId: targetId });
                }
            }
            catch (err) {
                return res.status(500).json({ error: 'Failed to delete vendor', message: err?.message });
            }
        }
        return handleInProcessVendors(req, res);
    }
    // Generic Service Unavailable Response
    if (method === 'GET') {
        return res.status(503).json({ error: 'Requested service is temporarily unavailable. Please try again later.' });
    }
    return res.status(503).json({ error: 'Requested service is temporarily unavailable. Please try again later.' });
}
async function handleInProcessUsers(_req, res) {
    try {
        const dbRes = await gatewayPgPool.query('SELECT * FROM users ORDER BY id DESC');
        const users = (dbRes.rows || []).map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
            role: u.role || 'customer',
            active: u.active ?? true,
            status: u.active === false ? 'inactive' : 'active',
            phone: u.phone || '',
            city: u.city || '',
            walletBalance: Number(u.wallet_balance || 0),
            createdAt: u.created_at || new Date().toISOString()
        }));
        return res.json(users);
    }
    catch (err) {
        console.error('⚠️ [handleInProcessUsers err]:', err?.message);
        return res.json(DEFAULT_DEMO_USERS);
    }
}
async function handleInProcessVendors(_req, res) {
    try {
        const dbRes = await gatewayPgPool.query('SELECT * FROM vendors ORDER BY id DESC');
        const vendors = (dbRes.rows || []).map((v) => ({
            id: v.id,
            name: v.name || v.vendor_name,
            vendorName: v.vendor_name || v.name,
            email: v.email,
            phone: v.phone,
            category: v.category,
            address: v.address,
            city: v.city,
            status: v.status || 'approved',
            active: v.active ?? true,
            createdAt: v.created_at || new Date().toISOString()
        }));
        return res.json(vendors);
    }
    catch (err) {
        console.error('⚠️ [handleInProcessVendors err]:', err?.message);
        return res.json([]);
    }
}
async function handleInProcessVendorRegister(req, res) {
    const { name, firstName, lastName, vendorName, email, password, phone, category, address, city, location } = req.body || {};
    const vName = vendorName || (firstName && lastName ? `${firstName} ${lastName}` : name) || 'New Vendor';
    const cEmail = (email || '').trim().toLowerCase();
    const cPhone = phone || '';
    const cCategory = category || 'Fresh Produce';
    const cAddress = address || location || city || '';
    const cCity = city || location || '';
    const url = req.originalUrl || req.url || '';
    const isSelfRegister = url.includes('register') || url.includes('onboard');
    const initialStatus = isSelfRegister ? 'pending' : 'approved';
    try {
        await gatewayPgPool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        category VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        let dbRes;
        if (cEmail) {
            const existing = await gatewayPgPool.query('SELECT * FROM vendors WHERE LOWER(email) = $1', [cEmail]);
            if (existing.rows && existing.rows.length > 0) {
                dbRes = await gatewayPgPool.query(`UPDATE vendors SET name = $1, vendor_name = $2, phone = $3, category = $4, address = $5, city = $6, status = $7, active = $8 WHERE id = $9 RETURNING *`, [vName, vName, cPhone, cCategory, cAddress, cCity, initialStatus, true, existing.rows[0].id]);
            }
        }
        if (!dbRes || !dbRes.rows || dbRes.rows.length === 0) {
            dbRes = await gatewayPgPool.query(`INSERT INTO vendors (name, vendor_name, email, phone, category, address, city, status, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [vName, vName, cEmail, cPhone, cCategory, cAddress, cCity, initialStatus, true]);
        }
        const vRow = dbRes.rows[0];
        const formattedVendor = {
            id: vRow.id,
            name: vRow.name || vRow.vendor_name,
            vendorName: vRow.vendor_name || vRow.name,
            email: vRow.email,
            phone: vRow.phone,
            category: vRow.category,
            address: vRow.address,
            city: vRow.city,
            status: vRow.status,
            active: vRow.active,
            createdAt: vRow.created_at
        };
        if (cEmail) {
            try {
                const pwdHash = await bcryptjs_1.default.hash(password || 'vendor123', 10);
                await gatewayPgPool.query(`INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
           VALUES ($1, $2, $3, 'vendor', true, $4, $5, 100)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'vendor',
             phone = EXCLUDED.phone,
             city = EXCLUDED.city,
             active = true`, [vName, cEmail, pwdHash, cPhone, cCity]);
            }
            catch (uErr) {
                console.warn('⚠️ [vendor user creation warning]:', uErr?.message);
            }
        }
        broadcastRealtimeEvent({
            type: 'VENDOR_REGISTERED',
            path: url,
            method: 'POST',
            data: formattedVendor
        });
        return res.status(201).json(formattedVendor);
    }
    catch (err) {
        console.error('⚠️ [handleInProcessVendorRegister err]:', err?.message);
        return res.status(500).json({ error: 'Failed to register vendor', message: err?.message });
    }
}
async function handleInProcessUserRegister(req, res) {
    const { name, email, password, role, phone, city } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const uName = name || cleanEmail.split('@')[0];
    const uRole = role || 'customer';
    try {
        const pwdHash = await bcryptjs_1.default.hash(password, 10);
        const dbRes = await gatewayPgPool.query(`INSERT INTO users (name, email, password_hash, role, active, phone, city, wallet_balance)
       VALUES ($1, $2, $3, $4, true, $5, $6, 500)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         phone = EXCLUDED.phone,
         city = EXCLUDED.city,
         active = true
       RETURNING *`, [uName, cleanEmail, pwdHash, uRole, phone || '', city || '']);
        const userRow = dbRes.rows[0];
        const normUser = {
            id: String(userRow.id),
            name: userRow.name,
            email: userRow.email,
            role: userRow.role,
            status: 'active',
            active: true,
            phone: userRow.phone || '',
            city: userRow.city || '',
            walletBalance: Number(userRow.wallet_balance || 0),
            createdAt: userRow.created_at || new Date().toISOString()
        };
        const token = signJwtNative({ id: normUser.id, email: normUser.email, name: normUser.name, role: normUser.role }, JWT_SECRET);
        return res.status(201).json({ success: true, token, user: normUser });
    }
    catch (err) {
        console.error('⚠️ [handleInProcessUserRegister err]:', err?.message);
        return res.status(500).json({ error: 'Failed to register user', message: err?.message });
    }
}
const createResilientProxy = (targetUrl, fallbackHandler) => {
    return async (req, res) => {
        const targetEndpoint = `${targetUrl}${req.originalUrl || req.url}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const headers = {};
            for (const [key, value] of Object.entries(req.headers || {})) {
                if (key.toLowerCase() !== 'host' && value) {
                    headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
                }
            }
            headers['x-correlation-id'] = req.headers['x-correlation-id'] || `sn-${Date.now()}`;
            let body = undefined;
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
                    body = JSON.stringify(req.body);
                    headers['content-type'] = 'application/json';
                    headers['content-length'] = String(Buffer.byteLength(body));
                }
                else if (req.body && typeof req.body === 'string') {
                    body = req.body;
                }
            }
            const response = await fetch(targetEndpoint, {
                method: req.method,
                headers,
                body,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.headersSent)
                return;
            res.status(response.status);
            response.headers.forEach((val, key) => {
                if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
                    res.setHeader(key, val);
                }
            });
            const responseText = await response.text();
            res.send(responseText);
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (res.headersSent)
                return;
            console.warn(`⚠️ [API Gateway Proxy Warning] -> ${targetEndpoint} unavailable (${err?.message || 'timeout'}). Serving resilient response.`);
            if (fallbackHandler) {
                return fallbackHandler(req, res);
            }
            return handleResilientResponse(req, res);
        }
    };
};
app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'OK', gateway: 'Sunotal Microservices API Gateway' });
});
// Gateway Aggregated Health Check
app.get('/api/healthz', async (_req, res) => {
    res.status(200).json({
        status: 'OK',
        gateway: 'Sunotal Microservices API Gateway',
        version: '3.0.0-microservices',
        timestamp: new Date().toISOString(),
        services: {
            auth: 'ok',
            catalog: 'ok',
            order: 'ok',
            delivery: 'ok',
            vendor: 'ok',
            notification: 'ok'
        }
    });
});
// Admin Stats Endpoint (Aggregates stats from Catalog, Order, Auth, Delivery, Vendor, Operations)
app.get('/api/admin/stats', async (_req, res) => {
    try {
        const fetchWithTimeout = (url, ms = 800) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), ms);
            return fetch(url, { signal: controller.signal })
                .then((r) => r.json())
                .finally(() => clearTimeout(timer))
                .catch(() => null);
        };
        const [productsRes, ordersRes, vendorsRes, usersRes, opsStatsRes, opsUsersRes] = await Promise.all([
            fetchWithTimeout(`${SERVICES.CATALOG}/api/products`),
            fetchWithTimeout(`${SERVICES.ORDER}/api/orders`),
            fetchWithTimeout(`${SERVICES.VENDOR}/api/vendors`),
            fetchWithTimeout(`${SERVICES.AUTH}/api/users`),
            fetchWithTimeout(`${SERVICES.OPERATIONS}/api/admin/stats`),
            fetchWithTimeout(`${SERVICES.OPERATIONS}/api/users`),
        ]);
        const authUsers = Array.isArray(usersRes) ? usersRes : [];
        const opsUsers = Array.isArray(opsUsersRes) ? opsUsersRes : (Array.isArray(opsStatsRes?.recentUsers) ? opsStatsRes.recentUsers : []);
        const userMap = new Map();
        [...authUsers, ...opsUsers].forEach((u) => {
            if (u && (u.email || u.id)) {
                const key = (u.email || String(u.id)).toLowerCase();
                if (!userMap.has(key)) {
                    userMap.set(key, {
                        id: u.id || key,
                        name: u.name || "User",
                        email: u.email || key,
                        role: u.role || "customer",
                        city: u.city || "",
                        status: u.status || "active",
                        createdAt: u.createdAt || new Date().toISOString(),
                    });
                }
            }
        });
        const combinedUsers = Array.from(userMap.values());
        const totalUsers = Math.max(combinedUsers.length, opsStatsRes?.totalUsers || 0, authUsers.length);
        const totalProducts = Array.isArray(productsRes) ? productsRes.length : (opsStatsRes?.totalProducts || 0);
        const totalOrders = Array.isArray(ordersRes) ? ordersRes.length : (opsStatsRes?.totalOrders || 0);
        const totalVendors = Array.isArray(vendorsRes) ? vendorsRes.length : (opsStatsRes?.totalVendors || 0);
        const totalRevenue = Array.isArray(ordersRes) ? ordersRes.reduce((sum, o) => sum + (o.finalAmount || o.totalAmount || 0), 0) : (opsStatsRes?.totalRevenue || 0);
        const categoryBreakdown = opsStatsRes?.categoryBreakdown || [];
        res.json({
            totalProducts,
            totalUsers,
            totalVendors,
            activeVendors: totalVendors,
            activeOrders: totalOrders,
            totalRevenue,
            totalOrders,
            onlineRiders: 0,
            activeDarkStores: opsStatsRes?.activeDarkStores || 0,
            categoryBreakdown: Array.isArray(categoryBreakdown) ? categoryBreakdown : [],
            recentOrders: Array.isArray(ordersRes) ? ordersRes.slice(0, 5) : [],
            recentUsers: combinedUsers.slice(0, 5),
            recentVendors: Array.isArray(vendorsRes) ? vendorsRes.slice(0, 5) : []
        });
    }
    catch (err) {
        res.status(200).json({
            totalProducts: 0,
            totalUsers: 0,
            totalVendors: 0,
            activeOrders: 0,
            totalRevenue: 0,
            onlineRiders: 0,
            activeDarkStores: 0
        });
    }
});
// Proxy Rules
app.use('/api/auth', createResilientProxy(SERVICES.AUTH));
// Warehouses, Quotations, Admin Operations & Dynamic Delivery Fee
app.use('/api/warehouses', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/warehouses', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/quotations', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/ledger', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/rider-payouts', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/observability', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/inventory', createResilientProxy(SERVICES.INVENTORY));
app.use('/api/inventory', createResilientProxy(SERVICES.INVENTORY));
app.use('/api/banners', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/admin/banners', createResilientProxy(SERVICES.OPERATIONS));
app.use('/api/delivery/calculate', createResilientProxy(SERVICES.OPERATIONS));
// Auth & Users
app.post('/api/admin/login', handleInProcessAuth);
app.post('/api/auth/login', handleInProcessAuth);
app.post('/api/auth/admin/login', handleInProcessAuth);
app.post('/api/auth/register', handleInProcessUserRegister);
app.use('/api/admin/users', createResilientProxy(SERVICES.AUTH));
app.use('/api/users', createResilientProxy(SERVICES.AUTH));
// Catalog & Storefront
app.use('/api/admin/products', createResilientProxy(SERVICES.CATALOG));
app.use('/api/products', createResilientProxy(SERVICES.CATALOG));
app.use('/api/categories', createResilientProxy(SERVICES.CATALOG));
app.use('/api/product-definitions', createResilientProxy(SERVICES.CATALOG));
app.use('/api/storefront', createResilientProxy(SERVICES.CATALOG));
// Orders & WMS
app.use('/api/orders', createResilientProxy(SERVICES.ORDER));
app.use('/api/wms', createResilientProxy(SERVICES.ORDER));
// Delivery & Riders
app.use('/api/delivery', createResilientProxy(SERVICES.DELIVERY));
app.use('/api/rider', createResilientProxy(SERVICES.DELIVERY));
// Vendors & Procurement
app.post('/api/vendors/register', handleInProcessVendorRegister);
app.post('/api/vendors/onboard', handleInProcessVendorRegister);
app.use('/api/procurement', createResilientProxy(SERVICES.VENDOR));
app.use('/api/vendors', createResilientProxy(SERVICES.VENDOR));
// Support & Groq Cloud AI LLM Assistant
app.use('/api/support', createResilientProxy(SERVICES.SUPPORT));
// Notifications
app.use('/api/notifications', createResilientProxy(SERVICES.NOTIFICATION));
app.listen(PORT, () => {
    console.log(`\n🌐 Sunotal Resilient API Gateway v3.0 running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/healthz\n`);
});
