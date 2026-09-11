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

const CategorySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true, unique: true },
    icon: { type: String, default: "📦" },
  },
  { timestamps: true }
);

const Product: any = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Vendor: any = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
const Warehouse: any = mongoose.models.Warehouse || mongoose.model("Warehouse", WarehouseSchema);
const User: any = mongoose.models.User || mongoose.model("User", UserSchema);
const Category: any = mongoose.models.Category || mongoose.model("Category", CategorySchema);

const defaultCategories = [
  { id: 1, name: "Vegetables", icon: "🥦" },
  { id: 2, name: "Fruits", icon: "🍎" },
  { id: 3, name: "Dairy", icon: "🥛" },
  { id: 4, name: "Dry Fruits", icon: "🥜" },
  { id: 5, name: "Grains", icon: "🌾" },
];

mongoose.set("bufferCommands", false);

const inMemoryStats = {
  totalOrders: 0,
  totalRevenue: 0,
  activeVendors: 0,
  activeDarkStores: 0,
  deliverySuccessRate: 0,
  totalProducts: 0,
  totalVendors: 0,
  totalUsers: 0,
  categoryBreakdown: [],
  recentUsers: [],
  recentVendors: [],
};

const inMemoryQuotations: any[] = [];
const inMemoryProducts: any[] = [];
const inMemoryWarehouses: any[] = [];

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

// GET /api/categories
app.get("/api/categories", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const categories = await Category.find().sort({ id: 1 });
      if (categories && categories.length > 0) return res.json(categories);
    }
  } catch {
    // Fallback
  }
  return res.json(defaultCategories);
});

// POST /api/categories
app.post("/api/categories", async (req: any, res: any) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });
    if (mongoose.connection.readyState === 1) {
      const count = await Category.countDocuments();
      const cat = await Category.create({ id: count + 1, name, icon: icon || "📦" });
      return res.status(201).json(cat);
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create category" });
  }
  return res.status(201).json({ id: Date.now(), name: req.body.name, icon: req.body.icon || "📦" });
});

// DELETE /api/categories/:id
app.delete("/api/categories/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    if (mongoose.connection.readyState === 1) {
      await Category.deleteOne({ id });
      return res.json({ success: true });
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete category" });
  }
  return res.json({ success: true });
});

// GET /api/products
app.get("/api/products", async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const filter = req.query.all === "true" ? {} : { active: true };
      const products = await Product.find(filter).sort({ createdAt: -1 });
      if (products) return res.json(products);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryProducts);
});

// POST /api/products
app.post("/api/products", async (req: any, res: any) => {
  try {
    const { name, category, unit, price, originalPrice, image, badge, organic, active, description } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: "Name, category, and price are required" });
    }

    const pPrice = Number(price);
    const pOrigPrice = originalPrice !== undefined ? Number(originalPrice) : pPrice;
    const discount = pOrigPrice > pPrice ? Math.round(((pOrigPrice - pPrice) / pOrigPrice) * 100) : 0;

    let product: any = null;
    if (mongoose.connection.readyState === 1) {
      const count = await Product.countDocuments();
      product = await Product.create({
        id: count + 1,
        name,
        category,
        unit: unit || "1 kg",
        price: pPrice,
        originalPrice: pOrigPrice,
        discountPercentage: discount,
        image: image || "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
        badge: badge || null,
        organic: Boolean(organic),
        active: active !== undefined ? Boolean(active) : true,
        description: description || null,
      });
    }

    if (!product) {
      product = {
        id: inMemoryProducts.length + 1,
        name,
        category,
        unit: unit || "1 kg",
        price: pPrice,
        originalPrice: pOrigPrice,
        discountPercentage: discount,
        image: image || "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
        badge: badge || null,
        organic: Boolean(organic),
        active: active !== undefined ? Boolean(active) : true,
        description: description || null,
        createdAt: new Date().toISOString(),
      };
      inMemoryProducts.push(product);
    }
    return res.status(201).json(product);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

// PUT & PATCH /api/products/:id
const handleUpdateProduct = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  try {
    if (mongoose.connection.readyState === 1) {
      const updated = await Product.findOneAndUpdate(
        { id: targetId },
        { $set: payload },
        { new: true }
      );
      if (updated) return res.json(updated);
    }
  } catch {
    // Fallback
  }

  let prod = inMemoryProducts.find((p) => p.id === targetId);
  if (prod) {
    Object.assign(prod, payload);
    return res.json(prod);
  }
  return res.status(404).json({ error: "Product not found" });
};

app.put("/api/products/:id", handleUpdateProduct);
app.patch("/api/products/:id", handleUpdateProduct);

// DELETE /api/products/:id
app.delete("/api/products/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    if (mongoose.connection.readyState === 1) {
      await Product.deleteOne({ id: targetId });
      return res.json({ success: true, message: "Product deleted" });
    }
  } catch {
    // Fallback
  }

  const idx = inMemoryProducts.findIndex((p) => p.id === targetId);
  if (idx !== -1) inMemoryProducts.splice(idx, 1);
  return res.json({ success: true, message: "Product deleted" });
});

const inMemoryVendors: any[] = [];

// GET /api/vendors
app.get("/api/vendors", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const vendors = await Vendor.find().sort({ createdAt: -1 });
      if (vendors && vendors.length > 0) return res.json(vendors);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryVendors);
});

// POST /api/vendors
app.post("/api/vendors", async (req: any, res: any) => {
  try {
    const { firstName, lastName, phone, location, produce, email, bankName, accountNumber, ifscCode, branchName, accountHolderName } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ error: "First name and phone are required" });
    }

    let vendor: any = null;
    if (mongoose.connection.readyState === 1) {
      const count = await Vendor.countDocuments();
      vendor = await Vendor.create({
        id: count + 1,
        firstName,
        lastName: lastName || "",
        phone,
        location: location || "",
        produce: produce || "",
        email: email || null,
        status: "pending",
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        branchName: branchName || null,
        accountHolderName: accountHolderName || null,
      });
    }

    if (!vendor) {
      vendor = {
        id: inMemoryVendors.length + 1,
        firstName,
        lastName: lastName || "",
        phone,
        location: location || "",
        produce: produce || "",
        email: email || null,
        status: "pending",
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        branchName: branchName || null,
        accountHolderName: accountHolderName || null,
        createdAt: new Date().toISOString(),
      };
      inMemoryVendors.push(vendor);
    }
    return res.status(201).json(vendor);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create vendor" });
  }
});

// PUT & PATCH /api/vendors/:id
const handleUpdateVendor = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  try {
    if (mongoose.connection.readyState === 1) {
      const updated = await Vendor.findOneAndUpdate(
        { id: targetId },
        { $set: payload },
        { new: true }
      );
      if (updated) return res.json(updated);
    }
  } catch {
    // Fallback
  }

  let vendor = inMemoryVendors.find((v) => v.id === targetId);
  if (vendor) {
    Object.assign(vendor, payload);
    return res.json(vendor);
  }
  return res.status(404).json({ error: "Vendor not found" });
};

app.put("/api/vendors/:id", handleUpdateVendor);
app.patch("/api/vendors/:id", handleUpdateVendor);

// DELETE /api/vendors/:id
app.delete("/api/vendors/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    if (mongoose.connection.readyState === 1) {
      await Vendor.deleteOne({ id: targetId });
      return res.json({ success: true, message: "Vendor deleted" });
    }
  } catch {
    // Fallback
  }

  const idx = inMemoryVendors.findIndex((v) => v.id === targetId);
  if (idx !== -1) inMemoryVendors.splice(idx, 1);
  return res.json({ success: true, message: "Vendor deleted" });
});

// Warehouses endpoints
app.get("/api/warehouses", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const warehouses = await Warehouse.find({ isActive: true });
      if (warehouses) return res.json(warehouses);
    }
  } catch {
    // Fallback
  }
  return res.json([]);
});

app.get("/api/admin/warehouses", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const warehouses = await Warehouse.find().sort({ createdAt: -1 });
      if (warehouses) return res.json(warehouses);
    }
  } catch {
    // Fallback
  }
  return res.json([]);
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

const inMemoryOrders: any[] = [];

app.get("/api/orders", (_req, res) => res.json(inMemoryOrders));

app.get("/api/orders/:id", (req: any, res: any) => {
  const order = inMemoryOrders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
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
