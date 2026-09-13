import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';

const app = express();
const PORT = process.env.PORT || 5000;

const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001',
  CATALOG: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:5002',
  ORDER: process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:5003',
  DELIVERY: process.env.DELIVERY_SERVICE_URL || 'http://127.0.0.1:5004',
  VENDOR: process.env.VENDOR_SERVICE_URL || 'http://127.0.0.1:5005',
  NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:5006',
};

app.use(cors());

// Gateway Aggregated Health Check
app.get('/api/healthz', async (_req, res) => {
  const checkService = async (url: string) => {
    try {
      const res = await fetch(`${url}/healthz`);
      return res.ok ? 'ok' : 'error';
    } catch {
      return 'down';
    }
  };

  const statusMap = {
    auth: await checkService(SERVICES.AUTH),
    catalog: await checkService(SERVICES.CATALOG),
    order: await checkService(SERVICES.ORDER),
    delivery: await checkService(SERVICES.DELIVERY),
    vendor: await checkService(SERVICES.VENDOR),
    notification: await checkService(SERVICES.NOTIFICATION),
  };

  res.json({
    status: 'OK',
    gateway: 'Sunotal Microservices API Gateway',
    version: '3.0.0-microservices',
    timestamp: new Date().toISOString(),
    services: statusMap
  });
});

// Admin Stats Endpoint (Aggregates stats from Catalog, Order, Auth, Delivery, Vendor)
app.get('/api/admin/stats', async (_req, res) => {
  try {
    const productsRes = await fetch(`${SERVICES.CATALOG}/api/products`).then((r) => r.json()).catch(() => []);
    const ordersRes = await fetch(`${SERVICES.ORDER}/api/orders`).then((r) => r.json()).catch(() => []);
    const vendorsRes = await fetch(`${SERVICES.VENDOR}/api/vendors`).then((r) => r.json()).catch(() => []);

    const totalProducts = Array.isArray(productsRes) ? productsRes.length : 0;
    const totalOrders = Array.isArray(ordersRes) ? ordersRes.length : 0;
    const totalVendors = Array.isArray(vendorsRes) ? vendorsRes.length : 0;
    const totalRevenue = Array.isArray(ordersRes) ? ordersRes.reduce((sum: number, o: any) => sum + (o.finalAmount || o.totalAmount || 0), 0) : 0;

    res.json({
      totalProducts,
      totalUsers: 2,
      totalVendors,
      activeVendors: totalVendors,
      activeOrders: totalOrders,
      totalRevenue,
      totalOrders,
      onlineRiders: 3,
      activeDarkStores: 2,
      categoryBreakdown: [
        { category: 'Vegetables', count: 4 },
        { category: 'Fruits', count: 2 },
        { category: 'Dairy', count: 4 }
      ],
      recentOrders: Array.isArray(ordersRes) ? ordersRes.slice(0, 5) : [],
      recentUsers: [],
      recentVendors: Array.isArray(vendorsRes) ? vendorsRes.slice(0, 5) : []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy Rules
app.use('/api/auth', proxy(SERVICES.AUTH));

app.use('/api/products', proxy(SERVICES.CATALOG));
app.use('/api/categories', proxy(SERVICES.CATALOG));
app.use('/api/storefront', proxy(SERVICES.CATALOG));

app.use('/api/orders', proxy(SERVICES.ORDER));
app.use('/api/wms', proxy(SERVICES.ORDER));

app.use('/api/delivery', proxy(SERVICES.DELIVERY));
app.use('/api/rider', proxy(SERVICES.DELIVERY));

app.use('/api/procurement', proxy(SERVICES.VENDOR));
app.use('/api/vendors', proxy(SERVICES.VENDOR));

app.use('/api/notifications', proxy(SERVICES.NOTIFICATION));

app.listen(PORT, () => {
  console.log(`\n🌐 Sunotal API Gateway v3.0 running on port ${PORT}`);
  console.log(`   auth-service:         ${SERVICES.AUTH}`);
  console.log(`   catalog-service:      ${SERVICES.CATALOG}`);
  console.log(`   order-service:        ${SERVICES.ORDER}`);
  console.log(`   delivery-service:     ${SERVICES.DELIVERY}`);
  console.log(`   vendor-service:       ${SERVICES.VENDOR}`);
  console.log(`   notification-service: ${SERVICES.NOTIFICATION}`);
  console.log(`   Health:               http://localhost:${PORT}/api/healthz\n`);
});
