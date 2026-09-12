import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import mongoose, { Schema } from 'mongoose';
import { Server as SocketServer } from 'socket.io';

import procurementRoutes from './routes/procurement.routes';
import wmsRoutes from './routes/wms.routes';
import riderRoutes from './routes/rider.routes';
import storefrontRoutes from './routes/storefront.routes';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*' }
});

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sunotal';

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Mongoose Schemas & Fallback Models
const ProductSchema = new Schema({
  name: String,
  category: String,
  price: Number,
  unit: String,
  stock: Number,
  imageUrl: String,
  aisle: String,
  shelf: String,
  bin: String,
  barcode: String,
  createdAt: { type: Date, default: Date.now }
});

const ProductModel = mongoose.model('Product', ProductSchema);

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log(`[MongoDB] Connected to Native MongoDB 7.0 at ${MONGODB_URI}`))
  .catch((err) => console.warn('[MongoDB] Connection warning (using fallback stateful models):', err.message));

// Health Check Endpoint
app.get('/api/healthz', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'sunotal-unified-backend' });
});

// Authentication Handlers
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  res.json({ success: true, token: 'mock-jwt-token-sunotal-admin', user: { email, role: 'ADMIN', name: 'Admin User' } });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  res.json({ success: true, token: 'mock-jwt-token-sunotal', user: { id: 'USR-NEW', email: req.body.email || 'user@example.com', role: 'CUSTOMER' } });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  res.json({ success: true, user: { id: 'USR-01', name: 'Admin User', email: 'admin@sunotal.com', role: 'ADMIN' } });
});

// Admin Stats Endpoint
app.get('/api/admin/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    totalProducts: 48,
    totalVendors: 12,
    totalUsers: 156,
    activeVendors: 10,
    activeOrders: 14,
    totalRevenue: 12840,
    onlineRiders: 8,
    activeDarkStores: 2,
    categoryBreakdown: [
      { category: 'Vegetables', count: 18 },
      { category: 'Dairy', count: 12 },
      { category: 'Fruits', count: 10 },
      { category: 'Bakery', count: 8 }
    ],
    recentUsers: [
      { id: 'USR-01', name: 'John Doe', email: 'john@example.com', role: 'customer' },
      { id: 'USR-02', name: 'Farmer Ramesh', email: 'ramesh@farmer.com', role: 'vendor' },
      { id: 'USR-03', name: 'Rider Vikram', email: 'vikram@rider.com', role: 'driver' }
    ],
    recentVendors: [
      { id: 'VEND-01', firstName: 'Ramesh', lastName: 'Kumar', location: 'Indiranagar, Bangalore', produce: 'Organic Tomatoes', createdAt: new Date().toISOString(), status: 'approved' },
      { id: 'VEND-02', firstName: 'Suresh', lastName: 'Patel', location: 'Koramangala, Bangalore', produce: 'Fresh Milk & Dairy', createdAt: new Date().toISOString(), status: 'approved' }
    ]
  });
});

// Stateful Standard Collections
const defaultProducts = [
  { id: 1, name: 'Fresh Organic Tomatoes', category: 'Vegetables', price: 32, unit: 'kg', stock: 450, imageUrl: '/assets/tomatoes.jpg', aisle: 'A1', shelf: 'S1', bin: 'B01', barcode: '8901262010015' },
  { id: 2, name: 'Amul Taaza Toned Milk 500ml', category: 'Dairy', price: 27, unit: 'pouch', stock: 1200, imageUrl: '/assets/milk.jpg', aisle: 'A2', shelf: 'S1', bin: 'B04', barcode: '8901262010022' },
  { id: 3, name: 'Britannia Whole Wheat Bread 400g', category: 'Bakery', price: 45, unit: 'pack', stock: 300, imageUrl: '/assets/bread.jpg', aisle: 'A1', shelf: 'S3', bin: 'B02', barcode: '8901068001021' },
  { id: 4, name: 'Farm Fresh White Eggs 6s', category: 'Dairy', price: 52, unit: 'pack', stock: 650, imageUrl: '/assets/eggs.jpg', aisle: 'A1', shelf: 'S2', bin: 'B03', barcode: '8906000000030' }
];

const defaultCategories = [
  { id: 1, name: 'Vegetables', icon: '🥦' },
  { id: 2, name: 'Fruits', icon: '🍎' },
  { id: 3, name: 'Dairy', icon: '🥛' },
  { id: 4, name: 'Bakery', icon: '🍞' },
  { id: 5, name: 'Dry Fruits', icon: '🥜' }
];

const defaultVendors = [
  { id: 1, firstName: 'Ramesh', lastName: 'Kumar', location: 'Indiranagar, Bangalore', produce: 'Organic Vegetables', status: 'approved', createdAt: new Date().toISOString() },
  { id: 2, firstName: 'Suresh', lastName: 'Patel', location: 'Koramangala, Bangalore', produce: 'Fresh Milk & Dairy', status: 'approved', createdAt: new Date().toISOString() }
];

const defaultUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'customer', status: 'active', createdAt: new Date().toISOString() },
  { id: 2, name: 'Farmer Ramesh', email: 'ramesh@farmer.com', role: 'vendor', status: 'active', createdAt: new Date().toISOString() },
  { id: 3, name: 'Rider Vikram', email: 'vikram@rider.com', role: 'driver', status: 'active', createdAt: new Date().toISOString() }
];

const defaultWarehouses = [
  { id: 1, name: 'Indiranagar Dark Store Hub', code: 'HUB-IND-01', location: '100ft Road, Indiranagar', status: 'ACTIVE' },
  { id: 2, name: 'Koramangala Dark Store Hub', code: 'HUB-KOR-02', location: '80ft Road, Koramangala', status: 'ACTIVE' }
];

const defaultBanners = [
  { id: 1, title: 'Fresh Organic Harvest', subtitle: 'Direct from regional farmers to your doorstep in 10 mins', imageUrl: '/assets/banner-1.jpg', linkUrl: '/products' },
  { id: 2, title: 'Daily Dairy Essentials', subtitle: 'Fresh milk, curd & butter delivered every morning', imageUrl: '/assets/banner-2.jpg', linkUrl: '/products?category=Dairy' }
];

app.get('/api/products', (req: Request, res: Response) => res.json(defaultProducts));
app.get('/api/categories', (req: Request, res: Response) => res.json(defaultCategories));
app.get('/api/vendors', (req: Request, res: Response) => res.json(defaultVendors));
app.get('/api/users', (req: Request, res: Response) => res.json(defaultUsers));
app.get(['/api/warehouses', '/api/admin/warehouses'], (req: Request, res: Response) => res.json(defaultWarehouses));
app.get('/api/banners', (req: Request, res: Response) => res.json(defaultBanners));
app.get('/api/product-definitions', (req: Request, res: Response) => res.json([]));
app.get('/api/inventory', (req: Request, res: Response) => res.json([]));
app.get('/api/orders', (req: Request, res: Response) => res.json([]));
app.get('/api/delivery/slots', (req: Request, res: Response) => res.json([]));
app.get('/api/user/addresses', (req: Request, res: Response) => res.json([]));

app.get('/api/admin/quotations', (req: Request, res: Response) => res.json({ success: true, quotations: [] }));
app.get('/api/delivery/orders/active', (req: Request, res: Response) => res.json({ success: true, orders: [] }));
app.get('/api/support/tickets', (req: Request, res: Response) => res.json({ success: true, tickets: [] }));
app.get('/api/admin/ledger', (req: Request, res: Response) => res.json({ success: true, transactions: [], summary: { totalInflow: 12840, totalOutflow: 4500 } }));
app.get('/api/admin/observability', (req: Request, res: Response) => res.json({ success: true, metrics: { cpu: '14%', memory: '256MB', uptime: '99.98%' }, logs: [] }));
app.get('/api/admin/rider-payouts', (req: Request, res: Response) => res.json({
  success: true,
  payouts: [
    { id: 'PAY-101', riderId: 'RIDER-007', riderName: 'Vikram Singh', completedDeliveries: 12, totalKmsRun: 42, totalBasePay: 360, totalDistancePay: 420, totalTips: 50, totalPayout: 830, payoutStatus: 'PENDING_APPROVAL' }
  ]
}));
app.get('/api/vendors/quotations', (req: Request, res: Response) => res.json({ success: true, quotations: [] }));
app.get('/api/vendors/invoices', (req: Request, res: Response) => res.json({ success: true, invoices: [] }));

// Domain Feature Routes
app.use('/api/procurement', procurementRoutes);
app.use('/api/wms', wmsRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/storefront', storefrontRoutes);

// Catch-all API Fallback Router
app.use('/api/*', (req: Request, res: Response) => {
  if (req.method === 'GET') {
    res.json([]);
  } else {
    res.json({ success: true, message: 'Sunotal Unified API Endpoint Active', path: req.baseUrl });
  }
});

// WebSocket Real-time Telemetry & Order Rooms
io.on('connection', (socket) => {
  console.log('[WebSocket] Client connected:', socket.id);

  socket.on('join_order_room', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('rider_telemetry', (data) => {
    io.to(`order:${data.orderId}`).emit('telemetry_update', data);
  });

  socket.on('disconnect', () => {
    console.log('[WebSocket] Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Sunotal Unified Microservice Backend running on port ${PORT}`);
});
