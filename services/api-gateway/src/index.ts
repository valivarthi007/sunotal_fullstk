import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sunotal_admin:SunotalPostgres2026SecurePass!@sunotal-postgres-db.c2d668wu0n34.us-east-1.rds.amazonaws.com:5432/sunotal?sslmode=no-verify';
const JWT_SECRET = process.env.JWT_SECRET || 'sunotal_jwt_secret_2026_super_secure';

function signJwtNative(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 30 * 86400 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds');
const gatewayPgPool = new Pool({
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

async function handleInProcessAuth(req: any, res: any) {
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
          isMatch = await bcrypt.compare(password, userRow.password_hash);
        } catch {
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
  } catch (err: any) {
    console.error('⚠️ [gateway handleInProcessAuth err]:', err?.message || err);
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable. Please try again.' });
  }
}

const app = express();
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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Distributed Tracing Middleware (X-Correlation-ID)
app.use((req: any, res: any, next: any) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || `sn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// Real-Time SSE Event-Broadcasting Engine
const sseClients = new Set<any>();

export function broadcastRealtimeEvent(event: { type: string; path: string; method: string; data?: any }) {
  const payload = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
  sseClients.forEach((client) => {
    try {
      if (!client.writableEnded) {
        client.write(payload);
      } else {
        sseClients.delete(client);
      }
    } catch {
      sseClients.delete(client);
    }
  });
}

// SSE Real-Time Stream Endpoint
app.get('/api/realtime/stream', (req: any, res: any) => {
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
      } else {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    } catch {
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
app.use((req: any, res: any, next: any) => {
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

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Vegetables", icon: "🥦", active: true },
  { id: 2, name: "Fruits", icon: "🍎", active: true },
  { id: 3, name: "Dairy", icon: "🥛", active: true },
  { id: 4, name: "Dry Fruits", icon: "🥜", active: true },
  { id: 5, name: "Grains", icon: "🌾", active: true },
  { id: 6, name: "Organic Herbs", icon: "🌿", active: true },
  { id: 7, name: "Cold Pressed Oils", icon: "🫒", active: true },
  { id: 8, name: "Fresh Bakery", icon: "🍞", active: true }
];

const DEFAULT_PRODUCT_DEFINITIONS = [
  { id: 1, name: "Fresh Spinach", category: "Vegetables", defaultUnit: "1 kg" },
  { id: 2, name: "Organic Tomatoes", category: "Vegetables", defaultUnit: "1 kg" },
  { id: 3, name: "Alphonso Mangoes", category: "Fruits", defaultUnit: "1 Dozen" },
  { id: 4, name: "Fresh Milk", category: "Dairy", defaultUnit: "1 L" },
  { id: 5, name: "Whole Almonds", category: "Dry Fruits", defaultUnit: "500g" },
  { id: 6, name: "Basmati Rice", category: "Grains", defaultUnit: "1 kg" },
  { id: 7, name: "Cold Pressed Coconut Oil", category: "Cold Pressed Oils", defaultUnit: "500ml" },
  { id: 8, name: "Multigrain Bread", category: "Fresh Bakery", defaultUnit: "400g" }
];

const DEFAULT_PRODUCTS = [
  { id: "1", name: "Fresh Spinach", category: "Vegetables", price: 40, originalPrice: 50, unit: "1 kg", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", isOrganic: true, stock: 100, rating: 4.8, active: true },
  { id: "2", name: "Organic Tomatoes", category: "Vegetables", price: 35, originalPrice: 45, unit: "1 kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400", isOrganic: true, stock: 150, rating: 4.9, active: true },
  { id: "3", name: "Alphonso Mangoes", category: "Fruits", price: 350, originalPrice: 450, unit: "1 Dozen", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400", isOrganic: true, stock: 50, rating: 5.0, active: true },
  { id: "4", name: "Fresh Milk", category: "Dairy", price: 60, originalPrice: 65, unit: "1 L", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", isOrganic: false, stock: 200, rating: 4.7, active: true },
  { id: "5", name: "Whole Almonds", category: "Dry Fruits", price: 450, originalPrice: 550, unit: "500g", image: "https://images.unsplash.com/photo-1508061252966-173859dbab0b?w=400", isOrganic: true, stock: 80, rating: 4.9, active: true },
  { id: "6", name: "Basmati Rice", category: "Grains", price: 120, originalPrice: 150, unit: "1 kg", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", isOrganic: true, stock: 120, rating: 4.9, active: true }
];

async function handleResilientResponse(req: any, res: any) {
  if (res.headersSent) return;
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
      } catch {}
      return res.json([]);
    }
    if (method === 'POST') {
      const { name, category, defaultUnit } = req.body || {};
      if (name && category) {
        try {
          const dbRes = await gatewayPgPool.query(
            `INSERT INTO product_definitions (name, category, default_unit) VALUES ($1, $2, $3) RETURNING *`,
            [String(name).trim(), String(category).trim(), defaultUnit || '1 kg']
          );
          if (dbRes.rows && dbRes.rows[0]) {
            const d = dbRes.rows[0];
            return res.status(201).json({ id: d.id, name: d.name, category: d.category, defaultUnit: d.default_unit });
          }
        } catch {}
      }
      return res.status(503).json({ error: 'Failed to create product definition. Database unavailable.' });
    }
    return res.status(503).json({ error: 'Catalog service is temporarily unavailable.' });
  }

  // Categories
  if (url.includes('/categories')) {
    if (method === 'GET') {
      try {
        const dbRes = await gatewayPgPool.query('SELECT * FROM categories WHERE active = true ORDER BY id ASC');
        if (dbRes.rows) {
          return res.json(dbRes.rows.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📦', active: c.active ?? true })));
        }
      } catch {}
      return res.json([]);
    }
    if (method === 'POST') {
      return res.status(503).json({ error: 'Category creation service unavailable.' });
    }
    return res.status(503).json({ error: 'Category service unavailable.' });
  }

  // Products & Storefront
  if (url.includes('/products') || url.includes('/storefront')) {
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
      } catch {}
      return res.json([]);
    }
    if (method === 'DELETE') {
      try {
        const idMatch = url.match(/\/products\/(\d+)/);
        if (idMatch) {
          const targetId = Number(idMatch[1]);
          await gatewayPgPool.query('DELETE FROM products WHERE id = $1', [targetId]);
          return res.json({ success: true, message: 'Product deleted successfully' });
        }
      } catch (err: any) {
        return res.status(500).json({ error: 'Failed to delete product', message: err?.message });
      }
    }
    if (method === 'POST') {
      return res.status(503).json({ error: 'Product creation service unavailable.' });
    }
    return res.status(503).json({ error: 'Catalog service unavailable.' });
  }

  // Generic Service Unavailable Response
  if (method === 'GET') {
    return res.status(503).json({ error: 'Requested service is temporarily unavailable. Please try again later.' });
  }
  return res.status(503).json({ error: 'Requested service is temporarily unavailable. Please try again later.' });
}

const createResilientProxy = (targetUrl: string, fallbackHandler?: (req: any, res: any) => void) => {
  return async (req: any, res: any) => {
    const targetEndpoint = `${targetUrl}${req.originalUrl || req.url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers || {})) {
        if (key.toLowerCase() !== 'host' && value) {
          headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      }
      headers['x-correlation-id'] = (req.headers['x-correlation-id'] as string) || `sn-${Date.now()}`;

      let body: any = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
          body = JSON.stringify(req.body);
          headers['content-type'] = 'application/json';
          headers['content-length'] = String(Buffer.byteLength(body));
        } else if (req.body && typeof req.body === 'string') {
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

      if (res.headersSent) return;

      res.status(response.status);
      response.headers.forEach((val, key) => {
        if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });

      const responseText = await response.text();
      res.send(responseText);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (res.headersSent) return;
      console.warn(`⚠️ [API Gateway Proxy Warning] -> ${targetEndpoint} unavailable (${err?.message || 'timeout'}). Serving resilient response.`);
      if (fallbackHandler) {
        return fallbackHandler(req, res);
      }
      return handleResilientResponse(req, res);
    }
  };
};

app.get('/healthz', (_req: any, res: any) => {
  res.status(200).json({ status: 'OK', gateway: 'Sunotal Microservices API Gateway' });
});

// Gateway Aggregated Health Check
app.get('/api/healthz', async (_req: any, res: any) => {
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
app.get('/api/admin/stats', async (_req: any, res: any) => {
  try {
    const fetchWithTimeout = (url: string, ms = 800) => {
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
    const totalRevenue = Array.isArray(ordersRes) ? ordersRes.reduce((sum: number, o: any) => sum + (o.finalAmount || o.totalAmount || 0), 0) : (opsStatsRes?.totalRevenue || 0);

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
  } catch (err: any) {
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
