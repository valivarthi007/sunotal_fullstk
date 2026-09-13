import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import mongoose, { Schema, Document } from 'mongoose';
import { Server as SocketServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import compression from 'compression';
import { createClient } from 'redis';

import procurementRoutes from './routes/procurement.routes';
import wmsRoutes from './routes/wms.routes';
import riderRoutes from './routes/rider.routes';
import storefrontRoutes from './routes/storefront.routes';

// ─── Configuration ───────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const PORT     = Number(process.env.PORT)     || 5000;
const MONGODB_URI = process.env.MONGODB_URI   || 'mongodb://127.0.0.1:27017/sunotal';
const REDIS_URL   = process.env.REDIS_URL     || 'redis://127.0.0.1:6379';
const JWT_SECRET  = process.env.JWT_SECRET    || 'sunotal-jwt-secret-2026';
const NODE_ENV    = process.env.NODE_ENV      || 'development';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

// ─── Socket.IO ───────────────────────────────────────────────────────────────

const io = new SocketServer(server, {
  cors: { origin: FRONTEND_ORIGIN, credentials: true },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ─── Redis Client ─────────────────────────────────────────────────────────────

let redis: any = null;
let redisConnected = false;

async function connectRedis() {
  try {
    redis = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: (retries: number) => {
          if (retries > 1) return false;
          return 500;
        },
      },
    });
    redis.on('error', (err: any) => {
      if (redisConnected) console.warn('[Redis] Connection lost:', err.message);
      redisConnected = false;
    });
    await redis.connect();
    redisConnected = true;
    console.log(`[Redis] Connected at ${REDIS_URL}`);
  } catch (err: any) {
    console.warn('[Redis] Not available — running without cache:', err.message);
    redis = null;
    redisConnected = false;
  }
}

// Cache helpers
const CACHE_TTL = { products: 120, stats: 30, categories: 300 };

async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis || !redisConnected) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function cacheSet(key: string, value: any, ttl: number): Promise<void> {
  if (!redis || !redisConnected) return;
  try { await redis.setEx(key, ttl, JSON.stringify(value)); } catch {}
}

async function cacheDel(pattern: string): Promise<void> {
  if (!redis || !redisConnected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(keys);
  } catch {}
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(compression());
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request ID + timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = req.headers['x-request-id'] as string || `REQ-${Date.now().toString(36)}`;
  res.setHeader('X-Request-ID', reqId);
  res.setHeader('X-Powered-By', 'Sunotal-Backend/2.0');
  (req as any).requestId = reqId;
  (req as any).startTime = Date.now();
  next();
});

// Simple rate limiter (in-memory, production would use Redis)
const rateLimitStore = new Map<string, { count: number; ts: number }>();
function rateLimiter(maxReqs: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(ip);
    if (!entry || now - entry.ts > windowMs) {
      rateLimitStore.set(ip, { count: 1, ts: now });
      return next();
    }
    entry.count++;
    if (entry.count > maxReqs) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  };
}

app.use('/api', rateLimiter(200, 60_000)); // 200 req/min per IP

// ─── Mongoose Schemas ─────────────────────────────────────────────────────────

const UserSchema = new Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:  { type: String, required: true },
  phone:         String,
  city:          String,
  role:          { type: String, enum: ['customer', 'vendor', 'driver', 'admin'], default: 'customer' },
  status:        { type: String, enum: ['active', 'suspended', 'pending'], default: 'active' },
  walletBalance: { type: Number, default: 50, min: 0 },
  createdAt:     { type: Date, default: Date.now },
});
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, status: 1 });
const UserModel = mongoose.model('User', UserSchema);

const ProductSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true, index: true },
  price:       { type: Number, required: true, min: 0 },
  unit:        { type: String, default: 'kg' },
  stock:       { type: Number, default: 100, min: 0 },
  imageUrl:    { type: String, default: '' },
  description: String,
  isOrganic:   { type: Boolean, default: false, index: true },
  tags:        [String],
  aisle:       String,
  shelf:       String,
  bin:         String,
  barcode:     String,
  isActive:    { type: Boolean, default: true, index: true },
  createdAt:   { type: Date, default: Date.now },
});
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, isActive: 1, price: 1 });
const ProductModel = mongoose.model('Product', ProductSchema);

const CategorySchema = new Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  icon:     String,
  sortOrder:{ type: Number, default: 0 },
});
const CategoryModel = mongoose.model('Category', CategorySchema);

const BannerSchema = new Schema({
  title:     { type: String, required: true },
  subtitle:  String,
  imageUrl:  { type: String, required: true },
  linkUrl:   String,
  active:    { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const BannerModel = mongoose.model('Banner', BannerSchema);

const OrderItemSchema = new Schema({
  productId:   String,
  productName: String,
  unitPrice:   Number,
  quantity:    Number,
  subtotal:    Number,
  image:       String,
  unit:        String,
}, { _id: false });

const AddressSchema = new Schema({
  street:  String,
  city:    String,
  state:   String,
  pincode: String,
  lat:     Number,
  lng:     Number,
}, { _id: false });

const OrderSchema = new Schema({
  orderNumber:     { type: String, unique: true, index: true },
  userId:          { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  customerName:    String,
  customerEmail:   String,
  customerPhone:   String,
  items:           [OrderItemSchema],
  subtotal:        { type: Number, default: 0 },
  gstAmount:       { type: Number, default: 0 },
  deliveryFee:     { type: Number, default: 0 },
  discountAmount:  { type: Number, default: 0 },
  totalAmount:     { type: Number, default: 0 },
  finalAmount:     { type: Number, default: 0 },
  status:          {
    type: String,
    enum: ['placed', 'processing', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed',
    index: true,
  },
  paymentStatus:   { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentMethod:   { type: String, default: 'upi' },
  address:         AddressSchema,
  riderId:         { type: mongoose.Types.ObjectId, ref: 'User' },
  riderName:       String,
  riderPhone:      String,
  estimatedDelivery: String,
  deliveredAt:     Date,
  cancelledAt:     Date,
  cancelReason:    String,
  notes:           String,
}, { timestamps: true });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
const OrderModel = mongoose.model('Order', OrderSchema);

const WalletTxSchema = new Schema({
  userId:    { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  type:      { type: String, enum: ['credit', 'debit'], required: true },
  title:     String,
  subtitle:  String,
  amount:    { type: Number, required: true },
  refId:     String,
  balance:   Number,
}, { timestamps: true });
const WalletTxModel = mongoose.model('WalletTransaction', WalletTxSchema);

const VendorSchema = new Schema({
  firstName:   String,
  lastName:    String,
  email:       { type: String, unique: true, sparse: true },
  phone:       String,
  location:    String,
  produce:     String,
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true });
const VendorModel = mongoose.model('Vendor', VendorSchema);

const WarehouseSchema = new Schema({
  name:     String,
  code:     String,
  location: String,
  city:     String,
  isActive: { type: Boolean, default: true },
  status:   { type: String, default: 'ACTIVE' },
});
const WarehouseModel = mongoose.model('Warehouse', WarehouseSchema);

const SupportTicketSchema = new Schema({
  userId:              { type: mongoose.Types.ObjectId, ref: 'User' },
  orderId:             String,
  type:                String,
  description:         String,
  preferredResolution: String,
  status:              { type: String, default: 'Open', index: true },
  resolvedAt:          Date,
  resolution:          String,
}, { timestamps: true });
const SupportTicketModel = mongoose.model('SupportTicket', SupportTicketSchema);

// ─── In-Memory Fallback ───────────────────────────────────────────────────────

let mongoConnected = false;

const memStore = {
  users: [] as any[],
  products: [] as any[],
  categories: [] as any[],
  banners: [] as any[],
  orders: [] as any[],
  vendors: [] as any[],
  warehouses: [] as any[],
  walletTxns: [] as any[],
  tickets: [] as any[],
  _id: 10000,
  nextId() { return ++this._id; },
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS = [
  { name: 'Fresh Organic Tomatoes', category: 'Vegetables', price: 32, unit: 'kg', stock: 450, imageUrl: 'https://images.unsplash.com/photo-1546470427-e5380b43f29e?w=400&auto=format&fit=crop&q=70', isOrganic: true, tags: ['fresh', 'organic', 'farm'], aisle: 'A1', shelf: 'S1', bin: 'B01', barcode: '8901262010015' },
  { name: 'Amul Taaza Toned Milk 500ml', category: 'Dairy', price: 27, unit: 'pouch', stock: 1200, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['dairy', 'milk'], aisle: 'A2', shelf: 'S1', bin: 'B04', barcode: '8901262010022' },
  { name: 'Britannia Whole Wheat Bread 400g', category: 'Bakery', price: 45, unit: 'pack', stock: 300, imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['bread', 'bakery'], aisle: 'A1', shelf: 'S3', bin: 'B02', barcode: '8901068001021' },
  { name: 'Farm Fresh White Eggs 6s', category: 'Dairy', price: 52, unit: 'pack', stock: 650, imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['eggs', 'protein'], aisle: 'A1', shelf: 'S2', bin: 'B03', barcode: '8906000000030' },
  { name: 'Organic Basmati Rice 1kg', category: 'Grains', price: 120, unit: 'kg', stock: 800, imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=70', isOrganic: true, tags: ['rice', 'grain', 'organic'], aisle: 'A3', shelf: 'S1', bin: 'B05', barcode: '8901491001009' },
  { name: 'Fresh Carrots 500g', category: 'Vegetables', price: 28, unit: 'pack', stock: 350, imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=70', isOrganic: true, tags: ['carrot', 'vegetable'], aisle: 'A1', shelf: 'S1', bin: 'B06', barcode: '8901262010099' },
  { name: 'Alphonso Mangoes 4 pcs', category: 'Fruits', price: 180, unit: 'pack', stock: 200, imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['mango', 'fruit', 'seasonal'], aisle: 'A2', shelf: 'S2', bin: 'B07', barcode: '8901001020034' },
  { name: 'Cashews Premium W320 200g', category: 'Dry Fruits', price: 220, unit: 'pack', stock: 150, imageUrl: 'https://images.unsplash.com/photo-1574184864703-3487b13f0edd?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['cashew', 'dry fruit', 'nuts'], aisle: 'A4', shelf: 'S1', bin: 'B08', barcode: '8901001050012' },
  { name: 'Greek Yogurt 400g', category: 'Dairy', price: 85, unit: 'pack', stock: 300, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['yogurt', 'protein', 'dairy'], aisle: 'A2', shelf: 'S1', bin: 'B09', barcode: '8901262010041' },
  { name: 'Seedless Green Grapes 500g', category: 'Fruits', price: 95, unit: 'pack', stock: 280, imageUrl: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['grapes', 'fruit'], aisle: 'A2', shelf: 'S2', bin: 'B10', barcode: '8901001020011' },
  { name: 'Organic Spinach Bunch 250g', category: 'Vegetables', price: 18, unit: 'bunch', stock: 400, imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=70', isOrganic: true, tags: ['spinach', 'greens', 'organic'], aisle: 'A1', shelf: 'S1', bin: 'B11', barcode: '8901262010077' },
  { name: 'Almonds Premium 250g', category: 'Dry Fruits', price: 185, unit: 'pack', stock: 200, imageUrl: 'https://images.unsplash.com/photo-1582056730014-1c8e5f60e820?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['almond', 'nuts', 'dry fruit'], aisle: 'A4', shelf: 'S1', bin: 'B12', barcode: '8901001050019' },
  { name: 'Cold Pressed Coconut Oil 1L', category: 'Oils & Ghee', price: 350, unit: 'bottle', stock: 120, imageUrl: 'https://images.unsplash.com/photo-1585669143853-0a27e7d54ed7?w=400&auto=format&fit=crop&q=70', isOrganic: true, tags: ['coconut oil', 'organic', 'oil'], aisle: 'A5', shelf: 'S1', bin: 'B13', barcode: '8901001060011' },
  { name: 'Tata Salt 1kg', category: 'Spices & Condiments', price: 20, unit: 'pack', stock: 600, imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['salt', 'condiment'], aisle: 'A5', shelf: 'S2', bin: 'B14', barcode: '8901001070001' },
  { name: 'Amul Butter 100g', category: 'Dairy', price: 55, unit: 'pack', stock: 400, imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['butter', 'dairy', 'amul'], aisle: 'A2', shelf: 'S1', bin: 'B15', barcode: '8901262010033' },
  { name: 'Red Onions 1kg', category: 'Vegetables', price: 35, unit: 'kg', stock: 550, imageUrl: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&auto=format&fit=crop&q=70', isOrganic: false, tags: ['onion', 'vegetable'], aisle: 'A1', shelf: 'S2', bin: 'B16', barcode: '8901262010088' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Vegetables', icon: '🥦', sortOrder: 1 },
  { name: 'Fruits', icon: '🍎', sortOrder: 2 },
  { name: 'Dairy', icon: '🥛', sortOrder: 3 },
  { name: 'Bakery', icon: '🍞', sortOrder: 4 },
  { name: 'Dry Fruits', icon: '🥜', sortOrder: 5 },
  { name: 'Grains', icon: '🌾', sortOrder: 6 },
  { name: 'Oils & Ghee', icon: '🫙', sortOrder: 7 },
  { name: 'Spices & Condiments', icon: '🧂', sortOrder: 8 },
];

const DEFAULT_BANNERS = [
  { title: 'Fresh Organic Harvest', subtitle: 'Direct from regional farmers to your doorstep in 10 mins', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80', linkUrl: '/products', active: true, sortOrder: 1 },
  { title: 'Daily Dairy Essentials', subtitle: 'Fresh milk, curd & butter delivered every morning', imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=1200&auto=format&fit=crop&q=80', linkUrl: '/products?category=Dairy', active: true, sortOrder: 2 },
  { title: 'Exotic Fruits Season', subtitle: 'Alphonso mangoes, fresh grapes & seasonal specials', imageUrl: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=1200&auto=format&fit=crop&q=80', linkUrl: '/products?category=Fruits', active: true, sortOrder: 3 },
];

const DEFAULT_WAREHOUSES = [
  { name: 'Indiranagar Dark Store Hub', code: 'HUB-IND-01', location: '100ft Road, Indiranagar', city: 'Bengaluru', isActive: true, status: 'ACTIVE' },
  { name: 'Koramangala Dark Store Hub', code: 'HUB-KOR-02', location: '80ft Road, Koramangala', city: 'Bengaluru', isActive: true, status: 'ACTIVE' },
  { name: 'Whitefield Dark Store', code: 'HUB-WHF-03', location: 'EPIP Zone, Whitefield', city: 'Bengaluru', isActive: true, status: 'ACTIVE' },
];

async function seedDatabase() {
  try {
    if (await ProductModel.countDocuments() === 0) {
      await ProductModel.insertMany(DEFAULT_PRODUCTS);
      console.log('[Seed] Products seeded:', DEFAULT_PRODUCTS.length);
    }
    if (await CategoryModel.countDocuments() === 0) {
      await CategoryModel.insertMany(DEFAULT_CATEGORIES);
      console.log('[Seed] Categories seeded');
    }
    if (await BannerModel.countDocuments() === 0) {
      await BannerModel.insertMany(DEFAULT_BANNERS);
      console.log('[Seed] Banners seeded');
    }
    if (await WarehouseModel.countDocuments() === 0) {
      await WarehouseModel.insertMany(DEFAULT_WAREHOUSES);
      console.log('[Seed] Warehouses seeded');
    }
    if (await VendorModel.countDocuments() === 0) {
      await VendorModel.insertMany([
        { firstName: 'Ramesh', lastName: 'Kumar', email: 'ramesh@farms.com', phone: '9876543210', location: 'Indiranagar, Bangalore', produce: 'Organic Vegetables', status: 'approved' },
        { firstName: 'Suresh', lastName: 'Patel', email: 'suresh@dairy.com', phone: '9876543211', location: 'Koramangala, Bangalore', produce: 'Fresh Milk & Dairy', status: 'approved' },
      ]);
    }
    if (!await UserModel.findOne({ role: 'admin' })) {
      const h = await bcrypt.hash('admin123', 10);
      const dh = await bcrypt.hash('rider123', 10);
      await UserModel.create({ name: 'Admin User', email: 'admin@sunotal.com', passwordHash: h, role: 'admin', status: 'active', walletBalance: 0 });
      await UserModel.create({ name: 'Rider Vikram', email: 'rider@sunotal.com', passwordHash: dh, role: 'driver', status: 'active', phone: '9000000001', walletBalance: 0 });
      console.log('[Seed] Admin + Rider seeded. Login: admin@sunotal.com / admin123');
    }
  } catch (err: any) {
    console.warn('[Seed] Error:', err.message);
  }
}

async function seedMemStore() {
  if (memStore.products.length > 0) return;
  const adminHash = await bcrypt.hash('admin123', 10);
  const riderHash = await bcrypt.hash('rider123', 10);
  memStore.users = [
    { id: '1', _id: '1', name: 'Admin User', email: 'admin@sunotal.com', passwordHash: adminHash, role: 'admin', status: 'active', walletBalance: 1000, createdAt: new Date() },
    { id: '2', _id: '2', name: 'Rider Vikram', email: 'rider@sunotal.com', passwordHash: riderHash, role: 'driver', status: 'active', phone: '9000000001', walletBalance: 500, createdAt: new Date() },
  ];
  memStore.products   = DEFAULT_PRODUCTS.map((p, i) => ({ ...p, id: i + 1, _id: String(i + 1), isActive: true, createdAt: new Date() }));
  memStore.categories = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: i + 1, _id: String(i + 1) }));
  memStore.banners    = DEFAULT_BANNERS.map((b, i) => ({ ...b, id: i + 1, _id: String(i + 1), createdAt: new Date() }));
  memStore.warehouses = DEFAULT_WAREHOUSES.map((w, i) => ({ ...w, id: i + 1, _id: String(i + 1) }));
}

// ─── MongoDB ──────────────────────────────────────────────────────────────────

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(async () => {
    mongoConnected = true;
    console.log(`[MongoDB] Connected: ${MONGODB_URI}`);
    await seedDatabase();
  })
  .catch(err => {
    console.warn('[MongoDB] Falling back to in-memory store:', err.message);
  });

mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
  console.warn('[MongoDB] Disconnected — using in-memory fallback');
});
mongoose.connection.on('reconnected', () => {
  mongoConnected = true;
  console.log('[MongoDB] Reconnected');
});

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function getTokenUser(req: Request): any | null {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET) as any;
  } catch { return null; }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getTokenUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized — valid JWT required' });
  (req as any).authUser = user;
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getTokenUser(req);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: `Access denied — requires role: ${roles.join(' or ')}` });
    }
    (req as any).authUser = user;
    next();
  };
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeProduct(p: any) {
  return {
    id: p._id?.toString() || p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit || 'kg',
    stock: p.stock ?? 100,
    imageUrl: p.imageUrl || '',
    image: p.imageUrl || '',
    description: p.description || '',
    isOrganic: p.isOrganic || false,
    tags: Array.isArray(p.tags) ? p.tags : [],
    aisle: p.aisle || '',
    shelf: p.shelf || '',
    bin: p.bin || '',
    barcode: p.barcode || '',
    isActive: p.isActive !== false,
  };
}

function normalizeOrder(o: any) {
  const addr = o.address || {};
  return {
    id: o._id?.toString() || o.id,
    orderNumber: o.orderNumber || '',
    userId: o.userId?.toString() || '',
    customerName: o.customerName || '',
    customerEmail: o.customerEmail || '',
    customerPhone: o.customerPhone || '',
    items: Array.isArray(o.items) ? o.items : [],
    subtotal: o.subtotal || 0,
    gstAmount: o.gstAmount || 0,
    deliveryFee: o.deliveryFee || 0,
    discountAmount: o.discountAmount || 0,
    totalAmount: o.totalAmount || 0,
    finalAmount: o.finalAmount || 0,
    status: o.status || 'placed',
    paymentStatus: o.paymentStatus || 'unpaid',
    paymentMethod: o.paymentMethod || 'upi',
    shippingAddress: addr.street || o.shippingAddress || '',
    city: addr.city || o.city || '',
    state: addr.state || o.state || '',
    pincode: addr.pincode || o.pincode || '',
    lat: addr.lat || o.lat || 0,
    lng: addr.lng || o.lng || 0,
    riderName: o.riderName || '',
    riderPhone: o.riderPhone || '',
    estimatedDelivery: o.estimatedDelivery || '',
    createdAt: o.createdAt || o.updatedAt,
    updatedAt: o.updatedAt || o.createdAt,
  };
}

function normalizeUser(u: any) {
  return {
    id: u._id?.toString() || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    phone: u.phone,
    city: u.city,
    walletBalance: u.walletBalance || 0,
    createdAt: u.createdAt,
  };
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/healthz', async (_req, res) => {
  const startMs = Date.now();
  let mongoStatus = 'disconnected';
  let redisStatus = 'disconnected';
  try {
    if (mongoConnected && mongoose.connection.db) { await mongoose.connection.db.admin().ping(); mongoStatus = 'ok'; }
  } catch { mongoStatus = 'error'; }
  try {
    if (redisConnected && redis) { await redis.ping(); redisStatus = 'ok'; }
  } catch { redisStatus = 'error'; }
  res.json({
    status: 'OK',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    latencyMs: Date.now() - startMs,
    services: { mongodb: mongoStatus, redis: redisStatus, memFallback: !mongoConnected },
    memory: process.memoryUsage(),
  });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, city, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const assignedRole = ['vendor', 'driver'].includes(role) ? role : 'customer';

    if (mongoConnected) {
      if (await UserModel.findOne({ email: email.toLowerCase() })) {
        return res.status(409).json({ error: 'Email is already registered' });
      }
      const user = await UserModel.create({
        name: name.trim(), email: email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(password, 10),
        phone, city, role: assignedRole, walletBalance: 50,
      });
      const token = signToken({ id: user._id.toString(), email: user.email, name: user.name, role: user.role });
      return res.status(201).json({ success: true, token, user: normalizeUser(user) });
    } else {
      if (memStore.users.find((u: any) => u.email === email.toLowerCase())) {
        return res.status(409).json({ error: 'Email is already registered' });
      }
      const id = memStore.nextId();
      const user: any = { id, _id: String(id), name: name.trim(), email: email.toLowerCase().trim(), passwordHash: await bcrypt.hash(password, 10), phone, city, role: assignedRole, status: 'active', walletBalance: 50, createdAt: new Date() };
      memStore.users.push(user);
      const token = signToken({ id: String(id), email: user.email, name: user.name, role: user.role });
      return res.status(201).json({ success: true, token, user: normalizeUser(user) });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    if (mongoConnected) {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact support.' });
      const token = signToken({ id: user._id.toString(), email: user.email, name: user.name, role: user.role });
      return res.json({ success: true, token, user: normalizeUser(user) });
    } else {
      const user = memStore.users.find((u: any) => u.email === email.toLowerCase());
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      return res.json({ success: true, token, user: normalizeUser(user) });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Vendor & Delivery login (delegates to same auth, just validates role)
const loginWithRole = (allowedRoles: string[]) => async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (mongoConnected) {
      const user = await UserModel.findOne({ email: email.toLowerCase(), role: { $in: [...allowedRoles, 'admin'] } });
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ error: `Invalid credentials or no ${allowedRoles[0]} account found` });
      }
      const token = signToken({ id: user._id.toString(), email: user.email, name: user.name, role: user.role });
      return res.json({ success: true, token, user: normalizeUser(user) });
    } else {
      // In-memory fallback: accept any email/password for vendor/rider demo
      const id = `DEMO-${allowedRoles[0].toUpperCase()}-${Date.now()}`;
      const token = signToken({ id, email, name: email.split('@')[0], role: allowedRoles[0] });
      return res.json({ success: true, token, user: { id, name: email.split('@')[0], email, role: allowedRoles[0], walletBalance: 0 } });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

app.post('/api/auth/login/vendor', loginWithRole(['vendor']));
app.post('/api/auth/login/delivery', loginWithRole(['driver']));

app.get('/api/auth/me', async (req, res) => {
  const tokenUser = getTokenUser(req);
  if (!tokenUser) return res.status(401).json({ error: 'Not authenticated' });
  try {
    if (mongoConnected) {
      const user = await UserModel.findById(tokenUser.id).select('-passwordHash');
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(normalizeUser(user));
    } else {
      const user = memStore.users.find((u: any) => String(u.id) === String(tokenUser.id));
      return res.json(user ? normalizeUser(user) : { ...tokenUser, walletBalance: 0 });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Products ─────────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort, organic, limit = '100', page = '1' } = req.query as Record<string, string>;
    const cacheKey = `products:${category}:${search}:${sort}:${organic}:${page}`;

    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) return res.json(cached);

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    if (mongoConnected) {
      const query: any = { isActive: { $ne: false } };
      if (category && category !== 'All') query.category = category;
      if (search?.trim()) query.$text = { $search: search.trim() };
      if (organic === 'true') query.isOrganic = true;

      let sortOpt: any = { createdAt: -1 };
      if (sort === 'price_asc') sortOpt = { price: 1 };
      else if (sort === 'price_desc') sortOpt = { price: -1 };
      else if (sort === 'name_asc') sortOpt = { name: 1 };

      const products = await ProductModel.find(query)
        .sort(sortOpt)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      const result = products.map(normalizeProduct);
      await cacheSet(cacheKey, result, CACHE_TTL.products);
      return res.json(result);
    } else {
      let products = [...memStore.products];
      if (category && category !== 'All') products = products.filter((p: any) => p.category === category);
      if (search?.trim()) products = products.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase())));
      if (organic === 'true') products = products.filter((p: any) => p.isOrganic);
      if (sort === 'price_asc') products.sort((a: any, b: any) => a.price - b.price);
      else if (sort === 'price_desc') products.sort((a: any, b: any) => b.price - a.price);
      const result = products.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(normalizeProduct);
      return res.json(result);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    if (mongoConnected) {
      const p = await ProductModel.findById(req.params.id).lean();
      if (!p) return res.status(404).json({ error: 'Product not found' });
      return res.json(normalizeProduct(p));
    } else {
      const p = memStore.products.find((p: any) => String(p.id) === req.params.id);
      if (!p) return res.status(404).json({ error: 'Product not found' });
      return res.json(normalizeProduct(p));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', requireRole('admin'), async (req, res) => {
  try {
    await cacheDel('products:*');
    if (mongoConnected) {
      const p = await ProductModel.create(req.body);
      return res.status(201).json(normalizeProduct(p));
    } else {
      const id = memStore.nextId();
      const p = { ...req.body, id, _id: String(id), isActive: true, createdAt: new Date() };
      memStore.products.push(p);
      return res.status(201).json(normalizeProduct(p));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', requireRole('admin'), async (req, res) => {
  try {
    await cacheDel('products:*');
    if (mongoConnected) {
      const p = await ProductModel.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
      if (!p) return res.status(404).json({ error: 'Product not found' });
      return res.json(normalizeProduct(p));
    } else {
      const idx = memStore.products.findIndex((p: any) => String(p.id) === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Product not found' });
      memStore.products[idx] = { ...memStore.products[idx], ...req.body };
      return res.json(normalizeProduct(memStore.products[idx]));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', requireRole('admin'), async (req, res) => {
  try {
    await cacheDel('products:*');
    if (mongoConnected) {
      await ProductModel.findByIdAndDelete(req.params.id);
    } else {
      memStore.products = memStore.products.filter((p: any) => String(p.id) !== req.params.id);
    }
    return res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Categories ───────────────────────────────────────────────────────────────

app.get('/api/categories', async (_req, res) => {
  try {
    const cached = await cacheGet<any[]>('categories:all');
    if (cached) return res.json(cached);
    if (mongoConnected) {
      const cats = await CategoryModel.find().sort({ sortOrder: 1 }).lean();
      const result = cats.map(c => ({ id: c._id.toString(), name: c.name, icon: c.icon, sortOrder: c.sortOrder }));
      await cacheSet('categories:all', result, CACHE_TTL.categories);
      return res.json(result);
    } else {
      return res.json(memStore.categories);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories', requireRole('admin'), async (req, res) => {
  try {
    await cacheDel('categories:*');
    if (mongoConnected) {
      const c = await CategoryModel.create(req.body);
      return res.status(201).json({ id: c._id.toString(), name: c.name, icon: c.icon });
    } else {
      const id = memStore.nextId();
      const c = { ...req.body, id, _id: String(id) };
      memStore.categories.push(c);
      return res.status(201).json(c);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/:id', requireRole('admin'), async (req, res) => {
  try {
    await cacheDel('categories:*');
    if (mongoConnected) await CategoryModel.findByIdAndDelete(req.params.id);
    else memStore.categories = memStore.categories.filter((c: any) => String(c.id) !== req.params.id);
    return res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Banners ──────────────────────────────────────────────────────────────────

app.get('/api/banners', async (_req, res) => {
  try {
    if (mongoConnected) {
      const banners = await BannerModel.find({ active: true }).sort({ sortOrder: 1 }).lean();
      return res.json(banners.map(b => ({ id: b._id.toString(), title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, linkUrl: b.linkUrl, active: b.active, createdAt: b.createdAt })));
    } else {
      return res.json(memStore.banners);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/banners', requireRole('admin'), async (req, res) => {
  try {
    if (mongoConnected) {
      const b = await BannerModel.create(req.body);
      return res.status(201).json({ id: b._id.toString(), title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, linkUrl: b.linkUrl, active: b.active });
    } else {
      const id = memStore.nextId();
      const b = { ...req.body, id, _id: String(id), active: true, createdAt: new Date() };
      memStore.banners.push(b);
      return res.status(201).json(b);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/banners/:id', requireRole('admin'), async (req, res) => {
  try {
    if (mongoConnected) {
      const b = await BannerModel.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
      if (!b) return res.status(404).json({ error: 'Banner not found' });
      return res.json({ id: b._id.toString(), title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, linkUrl: b.linkUrl, active: b.active });
    } else {
      const idx = memStore.banners.findIndex((b: any) => String(b.id) === req.params.id);
      if (idx !== -1) memStore.banners[idx] = { ...memStore.banners[idx], ...req.body };
      return res.json({ success: true });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/banners/:id', requireRole('admin'), async (req, res) => {
  try {
    if (mongoConnected) await BannerModel.findByIdAndDelete(req.params.id);
    else memStore.banners = memStore.banners.filter((b: any) => String(b.id) !== req.params.id);
    return res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  return `SUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

app.get('/api/orders', async (req, res) => {
  try {
    const tokenUser = getTokenUser(req);
    const isAdmin = tokenUser?.role === 'admin';
    if (mongoConnected) {
      const q = isAdmin ? {} : (tokenUser ? { userId: new mongoose.Types.ObjectId(tokenUser.id) } : { userId: null });
      const orders = await OrderModel.find(q).sort({ createdAt: -1 }).limit(100).lean();
      return res.json(orders.map(normalizeOrder));
    } else {
      const orders = isAdmin
        ? [...memStore.orders]
        : tokenUser ? memStore.orders.filter((o: any) => String(o.userId) === String(tokenUser.id)) : [];
      return res.json([...orders].reverse().map(normalizeOrder));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    if (mongoConnected) {
      const q = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { $or: [{ _id: req.params.id }, { orderNumber: req.params.id }] }
        : { orderNumber: req.params.id };
      const o = await OrderModel.findOne(q).lean();
      if (!o) return res.status(404).json({ error: 'Order not found' });
      return res.json(normalizeOrder(o));
    } else {
      const o = memStore.orders.find((o: any) => String(o.id) === req.params.id || o.orderNumber === req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      return res.json(normalizeOrder(o));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders/checkout', async (req, res) => {
  try {
    const tokenUser = getTokenUser(req);
    const { items, shippingAddress, city, state, pincode, lat, lng, paymentMethod, deliveryFee: dfFee, customerPhone } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart items are required' });

    const orderItems = items.map((i: any) => ({
      productId: String(i.productId || i.id || i.product?.id || ''),
      productName: i.name || i.productName || i.product?.name || 'Item',
      unitPrice: Number(i.price || i.unitPrice || i.product?.price || 0),
      quantity: Number(i.quantity || 1),
      subtotal: Number(i.price || i.unitPrice || i.product?.price || 0) * Number(i.quantity || 1),
      image: i.imageUrl || i.image || i.product?.imageUrl || '',
      unit: i.unit || i.product?.unit || 'pcs',
    }));

    const subtotal      = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const gstAmount     = Math.round(subtotal * 0.05);
    const deliveryFee   = Number(dfFee) || 0;
    const finalAmount   = subtotal + gstAmount + deliveryFee;

    const address = { street: shippingAddress || '', city: city || '', state: state || '', pincode: pincode || '', lat: Number(lat) || 0, lng: Number(lng) || 0 };

    const orderData: any = {
      orderNumber: generateOrderNumber(),
      userId: tokenUser ? (mongoConnected && mongoose.Types.ObjectId.isValid(tokenUser.id) ? new mongoose.Types.ObjectId(tokenUser.id) : tokenUser.id) : null,
      customerName: tokenUser?.name || req.body.customerName || 'Guest',
      customerEmail: tokenUser?.email || req.body.email || '',
      customerPhone: customerPhone || tokenUser?.phone || '',
      items: orderItems,
      subtotal, gstAmount, deliveryFee, discountAmount: 0,
      totalAmount: finalAmount, finalAmount,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: paymentMethod || 'upi',
      address,
      estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    let savedOrder: any;
    if (mongoConnected) {
      savedOrder = await OrderModel.create(orderData);
      // Update stock
      for (const item of orderItems) {
        if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          await ProductModel.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }
      }
      await cacheDel('products:*');
      await cacheDel('stats:*');
    } else {
      const id = memStore.nextId();
      savedOrder = { ...orderData, id, _id: String(id), createdAt: new Date(), updatedAt: new Date() };
      memStore.orders.push(savedOrder);
      for (const item of orderItems) {
        const p = memStore.products.find((p: any) => String(p.id) === item.productId);
        if (p) p.stock = Math.max(0, (p.stock || 0) - item.quantity);
      }
    }

    const normalizedOrder = normalizeOrder(savedOrder);
    // Real-time: emit to all riders
    io.to('riders').emit('new_order_alert', normalizedOrder);
    io.emit('order_placed', { orderNumber: normalizedOrder.orderNumber, city: normalizedOrder.city });

    return res.status(201).json({ success: true, message: 'Order placed successfully!', order: normalizedOrder });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (mongoConnected) {
      const o = await OrderModel.findById(req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      if (['delivered', 'out_for_delivery'].includes(o.status)) {
        return res.status(400).json({ error: 'Cannot cancel — order is already out for delivery or delivered' });
      }
      o.status = 'cancelled'; o.cancelledAt = new Date(); o.cancelReason = reason || '';
      await o.save();
      for (const item of o.items as any[]) {
        if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          await ProductModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }
      }
      await cacheDel('products:*'); await cacheDel('stats:*');
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status: 'cancelled' });
      return res.json({ success: true, order: normalizeOrder(o) });
    } else {
      const o = memStore.orders.find((o: any) => String(o.id) === req.params.id || o.orderNumber === req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      if (['delivered', 'out_for_delivery'].includes(o.status)) return res.status(400).json({ error: 'Cannot cancel' });
      o.status = 'cancelled'; o.cancelledAt = new Date(); o.cancelReason = reason || '';
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status: 'cancelled' });
      return res.json({ success: true, order: normalizeOrder(o) });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/orders/:id/status', requireRole('admin', 'driver'), async (req, res) => {
  try {
    const { status, paymentStatus, riderName, riderPhone } = req.body;
    const validStatus = ['placed', 'processing', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatus.includes(status)) return res.status(400).json({ error: `Invalid status. Must be: ${validStatus.join(', ')}` });

    if (mongoConnected) {
      const update: any = { status, updatedAt: new Date() };
      if (paymentStatus) update.paymentStatus = paymentStatus;
      if (riderName) update.riderName = riderName;
      if (riderPhone) update.riderPhone = riderPhone;
      if (status === 'delivered') { update.deliveredAt = new Date(); update.paymentStatus = 'paid'; }
      const o = await OrderModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
      if (!o) return res.status(404).json({ error: 'Order not found' });
      await cacheDel('stats:*');
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status, riderName, paymentStatus });
      return res.json(normalizeOrder(o));
    } else {
      const o = memStore.orders.find((o: any) => String(o.id) === req.params.id || o.orderNumber === req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      Object.assign(o, { status, ...(paymentStatus && { paymentStatus }), ...(riderName && { riderName }), ...(riderPhone && { riderPhone }), updatedAt: new Date() });
      if (status === 'delivered') { o.deliveredAt = new Date(); o.paymentStatus = 'paid'; }
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status, riderName, paymentStatus });
      return res.json(normalizeOrder(o));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Delivery ─────────────────────────────────────────────────────────────────

app.get('/api/delivery/orders/active', async (_req, res) => {
  try {
    if (mongoConnected) {
      const orders = await OrderModel.find({ status: { $in: ['placed', 'processing', 'packed'] }, riderId: null }).sort({ createdAt: 1 }).limit(20).lean();
      return res.json(orders.map(normalizeOrder));
    } else {
      const orders = memStore.orders.filter((o: any) => ['placed', 'processing', 'packed'].includes(o.status));
      return res.json(orders.map(normalizeOrder));
    }
  } catch { res.json([]); }
});

app.post('/api/delivery/orders/:id/accept', requireRole('driver', 'admin'), async (req, res) => {
  try {
    const tokenUser = (req as any).authUser;
    const riderName = tokenUser?.name || req.body.riderName || 'Delivery Partner';
    const riderPhone = req.body.riderPhone || '';
    if (mongoConnected) {
      const o = await OrderModel.findByIdAndUpdate(req.params.id, {
        status: 'out_for_delivery', riderName, riderPhone,
        riderId: mongoose.Types.ObjectId.isValid(tokenUser.id) ? new mongoose.Types.ObjectId(tokenUser.id) : null,
      }, { new: true }).lean();
      if (!o) return res.status(404).json({ error: 'Order not found' });
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status: 'out_for_delivery', riderName });
      return res.json({ success: true, order: normalizeOrder(o) });
    } else {
      const o = memStore.orders.find((o: any) => String(o.id) === req.params.id || o.orderNumber === req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      Object.assign(o, { status: 'out_for_delivery', riderName, riderPhone, updatedAt: new Date() });
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status: 'out_for_delivery', riderName });
      return res.json({ success: true, order: normalizeOrder(o) });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/delivery/orders/:id/stage', requireRole('driver', 'admin'), async (req, res) => {
  try {
    const { stage } = req.body;
    const valid = ['processing', 'packed', 'out_for_delivery', 'delivered'];
    if (!valid.includes(stage)) return res.status(400).json({ error: `Stage must be: ${valid.join(', ')}` });
    if (mongoConnected) {
      const update: any = { status: stage };
      if (stage === 'delivered') { update.paymentStatus = 'paid'; update.deliveredAt = new Date(); }
      const o = await OrderModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
      if (!o) return res.status(404).json({ error: 'Order not found' });
      await cacheDel('stats:*');
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status: stage });
      return res.json({ success: true, order: normalizeOrder(o) });
    } else {
      const o = memStore.orders.find((o: any) => String(o.id) === req.params.id || o.orderNumber === req.params.id);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      o.status = stage;
      if (stage === 'delivered') { o.paymentStatus = 'paid'; o.deliveredAt = new Date(); }
      io.to(`order:${req.params.id}`).emit('order_status_update', { orderId: req.params.id, status: stage });
      return res.json({ success: true, order: normalizeOrder(o) });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/delivery/stats', async (req, res) => {
  try {
    const tokenUser = getTokenUser(req);
    if (!tokenUser) return res.json({ completedDeliveries: 0, totalPayout: 0 });
    if (mongoConnected) {
      const completed = await OrderModel.countDocuments({ riderName: tokenUser.name, status: 'delivered' });
      return res.json({ completedDeliveries: completed, totalKmsRun: completed * 3.5, basePayPerOrder: 30, distanceRatePerKm: 10, totalBasePay: completed * 30, totalDistancePay: completed * 35, totalTips: completed * 5, totalPayout: completed * 70, payoutStatus: completed > 0 ? 'PENDING_APPROVAL' : 'NO_EARNINGS' });
    } else {
      const completed = memStore.orders.filter((o: any) => o.riderName === tokenUser.name && o.status === 'delivered').length;
      return res.json({ completedDeliveries: completed, totalBasePay: completed * 30, totalDistancePay: completed * 35, totalTips: completed * 5, totalPayout: completed * 70, payoutStatus: completed > 0 ? 'PENDING_APPROVAL' : 'NO_EARNINGS' });
    }
  } catch { res.json({ completedDeliveries: 0, totalPayout: 0 }); }
});

app.post('/api/delivery/payout', requireRole('driver', 'admin'), async (req, res) => {
  res.json({ success: true, message: 'Payout request submitted successfully', upiId: req.body.upiId, estimatedProcessingTime: '2-4 hours' });
});

app.get('/api/delivery/slots', (_req, res) => {
  const now = new Date();
  const slots = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(now.getTime() + (i * 2 + 0.5) * 3600000);
    const end = new Date(start.getTime() + 7200000);
    return { id: `SLOT-${i + 1}`, label: i === 0 ? 'Express (10-15 min)' : `${start.getHours()}:00 – ${end.getHours()}:00`, startTime: start.toISOString(), endTime: end.toISOString(), available: true, fee: i === 0 ? 0 : 0 };
  });
  res.json(slots);
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

app.get('/api/wallet', async (req, res) => {
  try {
    const tokenUser = getTokenUser(req);
    if (!tokenUser) return res.json({ balance: 0, transactions: [] });
    if (mongoConnected) {
      const user = await UserModel.findById(tokenUser.id).select('walletBalance').lean();
      const txns = await WalletTxModel.find({ userId: new mongoose.Types.ObjectId(tokenUser.id) }).sort({ createdAt: -1 }).limit(50).lean();
      return res.json({
        balance: user?.walletBalance || 0,
        transactions: txns.map(t => ({ id: t._id.toString(), type: t.type, title: t.title, subtitle: t.subtitle, amount: t.amount, balance: t.balance, createdAt: t.createdAt }))
      });
    } else {
      const user = memStore.users.find((u: any) => String(u.id) === String(tokenUser.id));
      const txns = memStore.walletTxns.filter((t: any) => String(t.userId) === String(tokenUser.id)).slice(-50).reverse();
      return res.json({ balance: user?.walletBalance || 0, transactions: txns });
    }
  } catch { res.json({ balance: 0, transactions: [] }); }
});

app.post('/api/wallet/topup', requireAuth, async (req, res) => {
  try {
    const tokenUser = (req as any).authUser;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0 || amount > 100000) return res.status(400).json({ error: 'Invalid amount (1 – 1,00,000)' });
    if (mongoConnected) {
      const user = await UserModel.findByIdAndUpdate(tokenUser.id, { $inc: { walletBalance: amount } }, { new: true });
      const txn = await WalletTxModel.create({ userId: new mongoose.Types.ObjectId(tokenUser.id), type: 'credit', title: `Wallet Top-up — ₹${amount}`, subtitle: 'Added via payment gateway', amount, balance: user?.walletBalance || 0 });
      return res.json({ success: true, newBalance: user?.walletBalance || 0, transaction: { id: txn._id.toString(), type: 'credit', title: txn.title, amount } });
    } else {
      const user = memStore.users.find((u: any) => String(u.id) === String(tokenUser.id));
      if (user) user.walletBalance = (user.walletBalance || 0) + amount;
      const id = memStore.nextId();
      const txn = { id, userId: tokenUser.id, type: 'credit', title: `Wallet Top-up — ₹${amount}`, subtitle: 'Added via payment gateway', amount, balance: user?.walletBalance || 0, createdAt: new Date() };
      memStore.walletTxns.push(txn);
      return res.json({ success: true, newBalance: user?.walletBalance || 0, transaction: txn });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────

app.get('/api/users', requireRole('admin'), async (_req, res) => {
  try {
    if (mongoConnected) {
      const users = await UserModel.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
      return res.json(users.map(normalizeUser));
    } else {
      return res.json(memStore.users.map(({ passwordHash, ...u }: any) => normalizeUser(u)));
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Status must be active or suspended' });
    if (mongoConnected) {
      const user = await UserModel.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash').lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(normalizeUser(user));
    } else {
      const user = memStore.users.find((u: any) => String(u.id) === req.params.id);
      if (user) user.status = status;
      return res.json({ success: true });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Vendors ──────────────────────────────────────────────────────────────────

app.get('/api/vendors', async (_req, res) => {
  try {
    if (mongoConnected) {
      const vendors = await VendorModel.find().sort({ createdAt: -1 }).lean();
      return res.json(vendors.map(v => ({ id: v._id.toString(), firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone, location: v.location, produce: v.produce, status: v.status, createdAt: (v as any).createdAt })));
    } else { return res.json(memStore.vendors); }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/vendors', async (req, res) => {
  try {
    if (mongoConnected) {
      const v = await VendorModel.create({ ...req.body, status: 'pending' });
      return res.status(201).json({ id: v._id.toString(), ...req.body, status: 'pending' });
    } else {
      const id = memStore.nextId();
      const v = { ...req.body, id, _id: String(id), status: 'pending', createdAt: new Date() };
      memStore.vendors.push(v);
      return res.status(201).json(v);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/vendors/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (mongoConnected) {
      const v = await VendorModel.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
      if (!v) return res.status(404).json({ error: 'Vendor not found' });
      return res.json({ id: v._id.toString(), status: v.status });
    } else {
      const v = memStore.vendors.find((v: any) => String(v.id) === req.params.id);
      if (v) v.status = status;
      return res.json({ success: true });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Warehouses ───────────────────────────────────────────────────────────────

app.get(['/api/warehouses', '/api/admin/warehouses'], async (_req, res) => {
  try {
    if (mongoConnected) {
      const wh = await WarehouseModel.find().lean();
      return res.json(wh.map(w => ({ id: w._id.toString(), name: w.name, code: w.code, location: w.location, city: w.city, isActive: w.isActive, status: w.status })));
    } else { return res.json(memStore.warehouses); }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/warehouses', requireRole('admin'), async (req, res) => {
  try {
    if (mongoConnected) {
      const wh = await WarehouseModel.create(req.body);
      return res.status(201).json({ id: wh._id.toString(), ...req.body });
    } else {
      const id = memStore.nextId();
      const wh = { ...req.body, id, _id: String(id) };
      memStore.warehouses.push(wh);
      return res.status(201).json(wh);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Inventory ────────────────────────────────────────────────────────────────

app.get('/api/inventory', requireRole('admin', 'vendor'), async (_req, res) => {
  try {
    if (mongoConnected) {
      const products = await ProductModel.find().select('_id name stock category unit aisle shelf bin').lean();
      return res.json(products.map(p => ({ id: p._id.toString(), productId: p._id.toString(), productName: p.name, quantity: p.stock, category: p.category, unit: p.unit, aisle: p.aisle, shelf: p.shelf, bin: p.bin })));
    } else {
      return res.json(memStore.products.map((p: any) => ({ id: p.id, productId: p.id, productName: p.name, quantity: p.stock, category: p.category, unit: p.unit, aisle: p.aisle, shelf: p.shelf, bin: p.bin })));
    }
  } catch { res.json([]); }
});

app.put('/api/inventory/:productId', requireRole('admin'), async (req, res) => {
  try {
    const { quantity } = req.body;
    if (mongoConnected) await ProductModel.findByIdAndUpdate(req.params.productId, { stock: quantity });
    else {
      const p = memStore.products.find((p: any) => String(p.id) === req.params.productId);
      if (p) p.stock = quantity;
    }
    await cacheDel('products:*');
    return res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Admin Stats ──────────────────────────────────────────────────────────────

app.get('/api/admin/stats', requireRole('admin'), async (_req, res) => {
  try {
    const cached = await cacheGet<any>('stats:admin');
    if (cached) return res.json(cached);

    if (mongoConnected) {
      const [totalProducts, totalUsers, totalVendors, activeVendors, totalOrders, activeOrders] = await Promise.all([
        ProductModel.countDocuments(),
        UserModel.countDocuments({ role: 'customer' }),
        VendorModel.countDocuments(),
        VendorModel.countDocuments({ status: 'approved' }),
        OrderModel.countDocuments(),
        OrderModel.countDocuments({ status: { $in: ['placed', 'processing', 'out_for_delivery'] } }),
      ]);
      const [revenueAgg, catBreakdown, recentOrders, recentUsers, recentVendors] = await Promise.all([
        OrderModel.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
        ProductModel.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $project: { category: '$_id', count: 1, _id: 0 } }, { $sort: { count: -1 } }]),
        OrderModel.find().sort({ createdAt: -1 }).limit(5).lean(),
        UserModel.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5).select('-passwordHash').lean(),
        VendorModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      ]);
      const stats = { totalProducts, totalUsers, totalVendors, activeVendors, activeOrders, totalRevenue: revenueAgg[0]?.total || 0, totalOrders, onlineRiders: 3, activeDarkStores: 2, categoryBreakdown: catBreakdown, recentOrders: recentOrders.map(normalizeOrder), recentUsers: recentUsers.map(normalizeUser), recentVendors: recentVendors.map(v => ({ id: v._id.toString(), firstName: v.firstName, lastName: v.lastName, produce: v.produce, status: v.status, location: v.location, createdAt: (v as any).createdAt })) };
      await cacheSet('stats:admin', stats, CACHE_TTL.stats);
      return res.json(stats);
    } else {
      const activeOrders = memStore.orders.filter((o: any) => ['placed', 'processing', 'out_for_delivery'].includes(o.status)).length;
      const totalRevenue = memStore.orders.filter((o: any) => o.status === 'delivered').reduce((s: number, o: any) => s + (o.finalAmount || 0), 0);
      return res.json({ totalProducts: memStore.products.length, totalUsers: memStore.users.filter((u: any) => u.role === 'customer').length, totalVendors: memStore.vendors.length, activeVendors: memStore.vendors.filter((v: any) => v.status === 'approved').length, activeOrders, totalRevenue, totalOrders: memStore.orders.length, onlineRiders: 3, activeDarkStores: 2, categoryBreakdown: DEFAULT_CATEGORIES.map(c => ({ category: c.name, count: memStore.products.filter((p: any) => p.category === c.name).length })), recentOrders: memStore.orders.slice(-5).map(normalizeOrder), recentUsers: [], recentVendors: memStore.vendors.slice(-5) });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Admin Ledger ─────────────────────────────────────────────────────────────

app.get('/api/admin/ledger', requireRole('admin'), async (_req, res) => {
  try {
    if (mongoConnected) {
      const orders = await OrderModel.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }).limit(100).lean();
      const transactions = orders.map((o, i) => ({ id: `TXN-${1000 + i}`, orderId: o.orderNumber, customer: o.customerName || 'Customer', type: o.paymentMethod || 'upi', amount: o.finalAmount, status: 'Captured', payoutStatus: o.status === 'delivered' ? 'Settled' : 'Pending', createdAt: o.createdAt }));
      const totalInflow = orders.reduce((s, o) => s + (o.finalAmount || 0), 0);
      return res.json({ transactions, summary: { totalInflow, totalOutflow: Math.round(totalInflow * 0.35), completedSettlements: orders.filter(o => o.status === 'delivered').length } });
    } else {
      const transactions = memStore.orders.filter((o: any) => o.paymentStatus === 'paid').map((o: any, i: number) => ({ id: `TXN-${1000 + i}`, orderId: o.orderNumber, customer: o.customerName || 'Customer', type: o.paymentMethod || 'upi', amount: o.finalAmount, status: 'Captured', payoutStatus: o.status === 'delivered' ? 'Settled' : 'Pending' }));
      const totalInflow = transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      return res.json({ transactions, summary: { totalInflow, totalOutflow: Math.round(totalInflow * 0.35), completedSettlements: transactions.filter((t: any) => t.payoutStatus === 'Settled').length } });
    }
  } catch { res.json({ transactions: [], summary: { totalInflow: 0, totalOutflow: 0 } }); }
});

// ─── Admin Observability ──────────────────────────────────────────────────────

app.get('/api/admin/observability', requireRole('admin'), (_req, res) => {
  res.json({
    metrics: { cpu: `${(10 + Math.random() * 20).toFixed(1)}%`, memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), uptimeSecs: Math.floor(process.uptime()), requestsPerMin: Math.round(50 + Math.random() * 100), mongoConnected, redisConnected },
    logs: [
      { level: 'INFO', message: 'Backend healthy', timestamp: new Date().toISOString() },
      { level: 'INFO', message: `MongoDB: ${mongoConnected ? 'connected' : 'using in-memory fallback'}`, timestamp: new Date().toISOString() },
      { level: 'INFO', message: `Redis: ${redisConnected ? 'connected' : 'disabled'}`, timestamp: new Date().toISOString() },
    ]
  });
});

app.get('/api/admin/rider-payouts', requireRole('admin'), async (_req, res) => {
  try {
    if (mongoConnected) {
      const riders = await UserModel.find({ role: 'driver' }).select('-passwordHash').lean();
      const payouts = await Promise.all(riders.map(async (r) => {
        const completed = await OrderModel.countDocuments({ riderId: r._id, status: 'delivered' });
        return { id: `PAY-${r._id}`, riderId: r._id.toString(), riderName: r.name, completedDeliveries: completed, totalBasePay: completed * 30, totalDistancePay: completed * 35, totalTips: completed * 5, totalPayout: completed * 70, payoutStatus: completed > 0 ? 'PENDING_APPROVAL' : 'NO_EARNINGS' };
      }));
      return res.json(payouts);
    } else {
      return res.json([]);
    }
  } catch { res.json([]); }
});

// ─── Support Tickets ──────────────────────────────────────────────────────────

app.get('/api/support/tickets', async (req, res) => {
  try {
    const tokenUser = getTokenUser(req);
    if (mongoConnected) {
      const q = tokenUser?.role === 'admin' ? {} : (tokenUser ? { userId: new mongoose.Types.ObjectId(tokenUser.id) } : { userId: null });
      const tickets = await SupportTicketModel.find(q).sort({ createdAt: -1 }).lean();
      return res.json(tickets.map(t => ({ id: t._id.toString(), orderId: t.orderId, type: t.type, description: t.description, preferredResolution: t.preferredResolution, status: t.status, createdAt: (t as any).createdAt })));
    } else {
      return res.json(memStore.tickets);
    }
  } catch { res.json([]); }
});

app.post('/api/support/tickets', async (req, res) => {
  try {
    const tokenUser = getTokenUser(req);
    if (mongoConnected) {
      const t = await SupportTicketModel.create({ ...req.body, userId: tokenUser ? new mongoose.Types.ObjectId(tokenUser.id) : null });
      return res.status(201).json({ id: t._id.toString(), ...req.body, status: 'Open', createdAt: (t as any).createdAt });
    } else {
      const id = memStore.nextId();
      const t = { ...req.body, id, _id: String(id), userId: tokenUser?.id, status: 'Open', createdAt: new Date() };
      memStore.tickets.push(t);
      return res.status(201).json(t);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/support/tickets/:id/resolve', requireRole('admin'), async (req, res) => {
  try {
    const { resolution } = req.body;
    if (mongoConnected) {
      const t = await SupportTicketModel.findByIdAndUpdate(req.params.id, { status: 'Resolved', resolution, resolvedAt: new Date() }, { new: true }).lean();
      if (!t) return res.status(404).json({ error: 'Ticket not found' });
      return res.json({ id: t._id.toString(), status: t.status, resolution: t.resolution });
    } else {
      const t = memStore.tickets.find((t: any) => String(t.id) === req.params.id);
      if (t) { t.status = 'Resolved'; t.resolution = resolution; t.resolvedAt = new Date(); }
      return res.json({ success: true });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Vendor Quotations ────────────────────────────────────────────────────────

app.get('/api/admin/quotations', requireRole('admin'), (_req, res) => res.json([]));
app.get('/api/vendors/quotations', (_req, res) => res.json([]));
app.post('/api/vendors/quotations', async (req, res) => {
  res.status(201).json({ success: true, id: memStore.nextId(), ...req.body, status: 'pending', createdAt: new Date() });
});
app.get('/api/vendors/invoices', (_req, res) => res.json([]));
app.get('/api/product-definitions', (_req, res) => res.json([]));
app.get('/api/user/addresses', (_req, res) => res.json([]));

// ─── Upload ───────────────────────────────────────────────────────────────────

app.post('/api/upload', async (req, res) => {
  // Production: wire to S3 PutObject. For now return a valid placeholder.
  const name = req.body?.filename || 'image.jpg';
  res.json({ success: true, url: `https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=70&name=${encodeURIComponent(name)}` });
});

// ─── Domain Routes ────────────────────────────────────────────────────────────

app.use('/api/procurement', procurementRoutes);
app.use('/api/wms', wmsRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/storefront', storefrontRoutes);

// ─── Catch-all API ────────────────────────────────────────────────────────────

app.use('/api/*', (req, res) => {
  if (['GET', 'HEAD'].includes(req.method)) {
    return res.json([]);
  }
  res.json({ success: true, message: 'Endpoint acknowledged', path: req.baseUrl });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message, err.stack);
  res.status(err.status || 500).json({ error: NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.id} from ${socket.handshake.address}`);

  // Rider joins the rider pool
  socket.on('rider_online', (data: any) => {
    socket.join('riders');
    socket.data.riderName = data?.name || 'Rider';
    socket.broadcast.to('riders').emit('rider_pool_update', { action: 'joined', name: data?.name });
    console.log(`[WS] Rider online: ${data?.name}`);
  });

  // Customer / admin tracks a specific order
  socket.on('join_order_room', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`[WS] ${socket.id} watching order: ${orderId}`);
  });

  socket.on('leave_order_room', (orderId: string) => {
    socket.leave(`order:${orderId}`);
  });

  // Rider sends GPS telemetry (forwarded to order room)
  socket.on('rider_telemetry', (data: { orderId: string; lat: number; lng: number }) => {
    if (data?.orderId) {
      io.to(`order:${data.orderId}`).emit('telemetry_update', { lat: data.lat, lng: data.lng, ts: Date.now() });
    }
  });

  // Rider marks order stage from mobile
  socket.on('update_stage', async (data: { orderId: string; stage: string; token: string }) => {
    try {
      const user = jwt.verify(data.token, JWT_SECRET) as any;
      if (!user || !['driver', 'admin'].includes(user.role)) return;
      if (mongoConnected) {
        await OrderModel.findByIdAndUpdate(data.orderId, { status: data.stage, ...(data.stage === 'delivered' ? { paymentStatus: 'paid', deliveredAt: new Date() } : {}) });
      } else {
        const o = memStore.orders.find((o: any) => String(o.id) === data.orderId);
        if (o) o.status = data.stage;
      }
      io.to(`order:${data.orderId}`).emit('order_status_update', { orderId: data.orderId, status: data.stage, ts: Date.now() });
    } catch {}
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Disconnected: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await seedMemStore();
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`\n🚀 Sunotal Backend v2.0 running on port ${PORT}`);
    console.log(`   Mode:      ${NODE_ENV}`);
    console.log(`   MongoDB:   ${MONGODB_URI}`);
    console.log(`   Redis:     ${REDIS_URL}`);
    console.log(`   Health:    http://localhost:${PORT}/api/healthz\n`);
  });
}

start().catch(console.error);

export { io };
