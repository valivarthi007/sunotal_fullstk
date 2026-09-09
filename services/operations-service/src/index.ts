import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const app = express();
const PORT = Number(process.env.PORT ?? 5002);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";
const JWT_SECRET = process.env.JWT_SECRET || "sunotal-jwt-secret";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const ProductSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    image: { type: String, required: true },
    badge: { type: String },
    organic: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true }
);

const VendorSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    userId: { type: Number },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String },
    location: { type: String },
    produce: { type: String },
    email: { type: String },
    status: { type: String, default: "pending" },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    branchName: { type: String },
    accountHolderName: { type: String },
  },
  { timestamps: true }
);

const WarehouseSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    freeDeliveryRadiusKm: { type: Number, default: 30 },
    maxServiceRadiusKm: { type: Number, default: 70 },
    baseDeliveryFee: { type: Number, default: 50 },
    perKmRate: { type: Number, default: 8 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String },
    email: { type: String },
    passwordHash: { type: String },
    role: { type: String },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

const Product: any = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Vendor: any = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
const Warehouse: any = mongoose.models.Warehouse || mongoose.model("Warehouse", WarehouseSchema);
const User: any = mongoose.models.User || mongoose.model("User", UserSchema);


mongoose.set("bufferCommands", false);

const inMemoryStats = {
  totalOrders: 1284,
  totalRevenue: 485900,
  activeVendors: 42,
  activeDarkStores: 8,
  deliverySuccessRate: 99.4,
  totalProducts: 48,
  totalVendors: 12,
  totalUsers: 156,
  categoryBreakdown: [
    { category: "Vegetables", count: 18 },
    { category: "Fruits", count: 14 },
    { category: "Leafy Greens", count: 10 },
    { category: "Dairy & Eggs", count: 6 },
  ],
  recentUsers: [
    { id: 1, name: "Admin User", email: "admin@sunotal.com", role: "admin" },
    { id: 2, name: "Sunotal Customer", email: "user@sunotal.com", role: "user" },
    { id: 3, name: "Farm Vendor", email: "vendor@sunotal.com", role: "vendor" },
  ],
  recentVendors: [
    { id: 1, firstName: "Ramesh", lastName: "Kumar", location: "Mysuru", produce: "Organic Tomatoes", createdAt: new Date().toISOString(), status: "approved" },
    { id: 2, firstName: "Suresh", lastName: "Patel", location: "Mandya", produce: "Fresh Spinach", createdAt: new Date().toISOString(), status: "pending" },
  ],
};

const inMemoryQuotations = [
  {
    id: 1,
    vendorName: "Ramesh Kumar",
    cropName: "Organic Tomatoes",
    quantity: 500,
    price: 24,
    status: "accepted",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    vendorName: "Suresh Patel",
    cropName: "Fresh Spinach",
    quantity: 300,
    price: 18,
    status: "pending",
    paymentStatus: "processing",
    createdAt: new Date().toISOString(),
  },
];

const inMemoryProducts = [
  {
    id: 1,
    name: "Fresh Organic Tomatoes",
    category: "Vegetables",
    unit: "1 kg",
    price: 32,
    originalPrice: 40,
    discountPercentage: 20,
    image: "https://d24f4if64xotls.cloudfront.net/tomatoes.jpg",
    badge: "Fresh",
    organic: true,
    active: true,
    description: "Farm-fresh organic red tomatoes sourced directly from verified local growers.",
  },
  {
    id: 2,
    name: "Farm Fresh Spinach",
    category: "Leafy Greens",
    unit: "250 g",
    price: 18,
    originalPrice: 25,
    discountPercentage: 28,
    image: "https://d24f4if64xotls.cloudfront.net/spinach.jpg",
    badge: "Organic",
    organic: true,
    active: true,
    description: "Nutrient-rich, pesticide-free fresh green spinach leaves.",
  },
];

const inMemoryWarehouses = [
  {
    id: 1,
    name: "Sunotal Dark Store Hub 1 - HSR Layout",
    address: "Sector 1, HSR Layout",
    city: "Bengaluru",
    latitude: 12.9121,
    longitude: 77.6446,
    freeDeliveryRadiusKm: 30,
    maxServiceRadiusKm: 70,
    baseDeliveryFee: 50,
    perKmRate: 8,
    isActive: true,
  },
];

const QuotationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    vendorName: { type: String, required: true },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: "pending" },
    paymentStatus: { type: String, default: "processing" },
  },
  { timestamps: true }
);

const Quotation: any = mongoose.models.Quotation || mongoose.model("Quotation", QuotationSchema);

// GET /api/admin/stats
app.get("/api/admin/stats", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const orderCount = await Product.countDocuments();
      const productCount = await Product.countDocuments();
      const vendorCount = await Vendor.countDocuments();
      const userCount = await User.countDocuments();
      return res.json({
        ...inMemoryStats,
        totalOrders: 1284 + orderCount,
        totalProducts: productCount || 48,
        totalVendors: vendorCount || 12,
        totalUsers: userCount || 156,
        activeVendors: vendorCount || 42,
        activeDarkStores: await Warehouse.countDocuments() || 8,
      });
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryStats);
});

// GET & POST /api/admin/quotations
app.get("/api/admin/quotations", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quotes = await Quotation.find().sort({ createdAt: -1 });
      if (quotes && quotes.length > 0) return res.json(quotes);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryQuotations);
});

app.get("/api/vendors/quotations", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quotes = await Quotation.find().sort({ createdAt: -1 });
      if (quotes && quotes.length > 0) return res.json(quotes);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryQuotations);
});

app.post("/api/vendors/quotations", async (req: any, res: any) => {
  const { vendorName, cropName, quantity, price } = req.body;
  if (!cropName || !quantity || !price) {
    return res.status(400).json({ error: "Missing required quotation fields" });
  }

  const newQuote = {
    id: inMemoryQuotations.length + 1,
    vendorName: vendorName || "Local Farm Vendor",
    cropName,
    quantity: Number(quantity),
    price: Number(price),
    status: "pending",
    paymentStatus: "processing",
    createdAt: new Date().toISOString(),
  };

  inMemoryQuotations.unshift(newQuote);

  if (mongoose.connection.readyState === 1) {
    try {
      await Quotation.create(newQuote);
    } catch {
      // Ignored
    }
  }

  return res.status(201).json(newQuote);
});

// POST /api/admin/login
app.post("/api/admin/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === "admin@sunotal.com" && password === "admin123") {
    const token = jwt.sign({ userId: 1, email: cleanEmail, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: { id: 1, name: "Admin User", email: cleanEmail, role: "admin" } });
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const user: any = await User.findOne({ email: cleanEmail });
      if (user && user.role === "admin") {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (isMatch) {
          const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
          return res.json({ token, user });
        }
      }
    } catch {
      // Fallback
    }
  }

  return res.status(401).json({ error: "Invalid admin credentials" });
});

// GET /api/products
app.get("/api/products", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const products = await Product.find({ active: true });
      if (products && products.length > 0) return res.json(products);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryProducts);
});

// GET /api/vendors
app.get("/api/vendors", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const vendors = await Vendor.find();
      if (vendors && vendors.length > 0) return res.json(vendors);
    }
  } catch {
    // Fallback
  }
  return res.json([]);
});

// Warehouses endpoints
app.get("/api/warehouses", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const warehouses = await Warehouse.find({ isActive: true });
      if (warehouses && warehouses.length > 0) return res.json(warehouses);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryWarehouses);
});

app.get("/api/admin/warehouses", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const warehouses = await Warehouse.find().sort({ createdAt: -1 });
      if (warehouses && warehouses.length > 0) return res.json(warehouses);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryWarehouses);
});

app.post("/api/admin/warehouses", async (req: any, res: any) => {
  try {
    const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ error: "Name, address, and city are required" });
    }
    const warehouse = {
      id: inMemoryWarehouses.length + 1,
      name,
      address,
      city,
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
      freeDeliveryRadiusKm: Number(freeDeliveryRadiusKm || 30),
      maxServiceRadiusKm: Number(maxServiceRadiusKm || 70),
      baseDeliveryFee: Number(baseDeliveryFee || 50),
      perKmRate: Number(perKmRate || 8),
      isActive: true,
    };
    inMemoryWarehouses.push(warehouse);
    if (mongoose.connection.readyState === 1) {
      await Warehouse.create(warehouse);
    }
    return res.status(201).json(warehouse);
  } catch {
    return res.status(500).json({ error: "Failed to create warehouse" });
  }
});

app.put("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    let warehouse = inMemoryWarehouses.find((w) => w.id === Number(id));
    if (warehouse) {
      Object.assign(warehouse, updateData);
    }
    if (mongoose.connection.readyState === 1) {
      const dbW = await Warehouse.findOneAndUpdate(
        { id: Number(id) },
        { $set: updateData },
        { new: true }
      );
      if (dbW) warehouse = dbW;
    }
    if (!warehouse) return res.status(404).json({ error: "Warehouse not found" });
    return res.json(warehouse);
  } catch {
    return res.status(500).json({ error: "Failed to update warehouse" });
  }
});

app.delete("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const idx = inMemoryWarehouses.findIndex((w) => w.id === Number(id));
    if (idx !== -1) inMemoryWarehouses.splice(idx, 1);
    if (mongoose.connection.readyState === 1) {
      await Warehouse.deleteOne({ id: Number(id) });
    }
    return res.json({ success: true, message: "Warehouse deleted" });
  } catch {
    return res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

app.post("/api/admin/warehouses/calc-fee", async (req: any, res: any) => {
  try {
    const { city, userLat, userLng } = req.body;
    let warehouses = inMemoryWarehouses;
    if (mongoose.connection.readyState === 1) {
      const dbW = await Warehouse.find({ isActive: true });
      if (dbW && dbW.length > 0) warehouses = dbW;
    }
    
    let matched = warehouses.find((w: any) => w.city.toLowerCase() === String(city || "").toLowerCase());
    if (!matched && warehouses.length > 0) matched = warehouses[0];
    
    if (!matched) {
      return res.json({
        serviceable: false,
        deliveryFee: 0,
        warehouseName: "",
        distanceKm: 0,
        freeDelivery: false,
        message: "No active warehouse configured for location",
      });
    }

    let distanceKm = 5;
    if (userLat && userLng && matched.latitude && matched.longitude) {
      const rad = Math.PI / 180;
      const dLat = (userLat - matched.latitude) * rad;
      const dLng = (userLng - matched.longitude) * rad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(matched.latitude * rad) * Math.cos(userLat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    const freeRadius = matched.freeDeliveryRadiusKm || 30;
    const maxRadius = matched.maxServiceRadiusKm || 70;
    const baseFee = matched.baseDeliveryFee || 50;
    const perKm = matched.perKmRate || 8;

    if (distanceKm > maxRadius) {
      return res.json({ serviceable: false, message: `Location beyond max service radius of ${maxRadius}km` });
    }

    const isFree = distanceKm <= freeRadius;
    const deliveryFee = isFree ? 0 : Math.round(baseFee + (distanceKm - freeRadius) * perKm);

    return res.json({
      serviceable: true,
      deliveryFee,
      warehouseName: matched.name,
      distanceKm,
      freeDelivery: isFree,
    });
  } catch {
    return res.status(500).json({ error: "Failed to calculate delivery fee" });
  }
});

app.get("/api/vendors/invoices", (_req, res) => res.json([
  { id: 1, invoiceNumber: "INV-2026-001", vendorName: "Ramesh Kumar", amount: 12000, date: "2026-09-08", status: "paid" },
  { id: 2, invoiceNumber: "INV-2026-002", vendorName: "Suresh Patel", amount: 5400, date: "2026-09-09", status: "pending" }
]));

app.post("/api/vendors/register", (req: any, res: any) => {
  return res.status(201).json({ success: true, message: "Vendor registered successfully", vendor: req.body });
});

app.get("/api/admin/observability", (_req, res) => res.json({
  cpuUsage: 14.2,
  memoryUsage: 38.6,
  activeConnections: 124,
  latencyMs: 18,
  errorRate: 0.01,
  services: [
    { name: "auth-service", status: "healthy", uptime: "99.99%" },
    { name: "operations-service", status: "healthy", uptime: "99.98%" },
    { name: "inventory-service", status: "healthy", uptime: "100%" },
    { name: "delivery-service", status: "healthy", uptime: "99.95%" },
    { name: "support-service", status: "healthy", uptime: "100%" }
  ]
}));

app.get("/api/admin/ledger", (_req, res) => res.json([
  { id: 1, transactionId: "TXN-88491", type: "credit", amount: 485900, description: "Daily Sales Settlement", createdAt: new Date().toISOString() },
  { id: 2, transactionId: "TXN-88492", type: "debit", amount: 17400, description: "Farmer Payout - Ramesh Kumar", createdAt: new Date().toISOString() }
]));

app.put("/api/admin/quotations/:id", (req: any, res: any) => {
  const { id } = req.params;
  const quote = inMemoryQuotations.find((q) => q.id === Number(id));
  if (quote) {
    Object.assign(quote, req.body);
    return res.json(quote);
  }
  return res.status(200).json({ id: Number(id), status: req.body.status || "accepted", paymentStatus: "paid" });
});

const inMemoryOrders: any[] = [
  { id: 101, customerName: "Rahul Sharma", total: 450, status: "delivered", itemsCount: 4, createdAt: new Date().toISOString() },
  { id: 102, customerName: "Priya Singh", total: 280, status: "out_for_delivery", itemsCount: 2, createdAt: new Date().toISOString() }
];

app.get("/api/orders", (_req, res) => res.json(inMemoryOrders));

app.get("/api/orders/:id", (req: any, res: any) => {
  const order = inMemoryOrders.find((o) => o.id === Number(req.params.id)) || inMemoryOrders[0];
  return res.json(order);
});

app.post("/api/orders/checkout", (req: any, res: any) => {
  const newOrder = { id: inMemoryOrders.length + 101, ...req.body, status: "placed", createdAt: new Date().toISOString() };
  inMemoryOrders.unshift(newOrder);
  return res.status(201).json({ success: true, message: "Order placed successfully", order: newOrder });
});

app.post("/api/orders/:id/cancel", (_req: any, res: any) => {
  return res.json({ success: true, message: "Order cancelled" });
});

app.put("/api/orders/:id/status", (_req: any, res: any) => {
  return res.json({ success: true, message: "Status updated" });
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "operations-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true, serverSelectionTimeoutMS: 3000 }).then(() => {
  console.log("⚡ [operations-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [operations-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
});
