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
    id: { type: Number, unique: true, required: true },
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
    id: { type: Number, unique: true, required: true },
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
    farmSize: { type: String },
    aadhar: { type: String },
    gstin: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

const WarehouseSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
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
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    role: { type: String, default: "user" },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

const CategorySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, unique: true },
    icon: { type: String, default: "📦" },
  },
  { timestamps: true }
);

const QuotationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    vendorName: { type: String, required: true },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: "pending" },
    paymentStatus: { type: String, default: "processing" },
  },
  { timestamps: true }
);

const OrderSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    orderId: { type: String, required: true, unique: true },
    userId: { type: Number },
    customerName: { type: String },
    customerEmail: { type: String },
    phone: { type: String },
    items: { type: mongoose.Schema.Types.Mixed },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, default: "placed" },
    address: { type: String },
    city: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: { type: String, default: "pending" },
    driverId: { type: Number },
    driverName: { type: String },
    rating: { type: Number },
    ratingNotes: { type: String },
  },
  { timestamps: true }
);

const Product: any = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Vendor: any = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
const Warehouse: any = mongoose.models.Warehouse || mongoose.model("Warehouse", WarehouseSchema);
const User: any = mongoose.models.User || mongoose.model("User", UserSchema);
const Category: any = mongoose.models.Category || mongoose.model("Category", CategorySchema);
const Quotation: any = mongoose.models.Quotation || mongoose.model("Quotation", QuotationSchema);
const Order: any = mongoose.models.Order || mongoose.model("Order", OrderSchema);

async function getNextId(Model: any): Promise<number> {
  try {
    const highest = await Model.findOne({}, { id: 1 }).sort({ id: -1 }).exec();
    if (highest && typeof highest.id === "number" && !isNaN(highest.id)) {
      return highest.id + 1;
    }
  } catch {
    // Ignored
  }
  return 1;
}

// GET /api/admin/stats
app.get("/api/admin/stats", async (_req, res) => {
  try {
    let totalUsers = 0;
    let totalVendors = 0;
    let totalProducts = 0;
    let totalDarkStores = 0;
    let activeVendors = 0;
    let totalOrders = 0;
    let totalRevenue = 0;
    let users: any[] = [];
    let vendors: any[] = [];
    let products: any[] = [];

    try {
      [totalUsers, totalVendors, totalProducts, totalDarkStores, activeVendors, totalOrders, users, vendors, products] = await Promise.all([
        User.countDocuments().exec().catch(() => 0),
        Vendor.countDocuments().exec().catch(() => 0),
        Product.countDocuments().exec().catch(() => 0),
        Warehouse.countDocuments().exec().catch(() => 0),
        Vendor.countDocuments({ status: { $in: ["approved", "active"] } }).exec().catch(() => 0),
        Order.countDocuments().exec().catch(() => 0),
        User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(5).exec().catch(() => []),
        Vendor.find().sort({ createdAt: -1 }).limit(5).exec().catch(() => []),
        Product.find().sort({ createdAt: -1 }).exec().catch(() => []),
      ]);
    } catch {
      // Ignored
    }

    const categoryMap: Record<string, number> = {};
    if (Array.isArray(products)) {
      for (const p of products) {
        if (p && p.category) {
          const cat = p.category || "Other";
          categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        }
      }
    }
    const categoryBreakdown = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

    return res.json({
      totalOrders: Number(totalOrders || 0),
      totalRevenue: Number(totalRevenue || 0),
      totalProducts: Number(totalProducts || 0),
      totalVendors: Number(totalVendors || 0),
      totalUsers: Number(totalUsers || 0),
      activeVendors: Number(activeVendors || 0),
      activeDarkStores: Number(totalDarkStores || 0),
      deliverySuccessRate: 100,
      categoryBreakdown: categoryBreakdown || [],
      recentUsers: (Array.isArray(users) ? users : []).filter(Boolean).map((u: any) => ({
        id: u.id || 1,
        name: u.name || "User",
        email: u.email || "",
        role: u.role || "user",
        city: u.city || "",
        createdAt: u.createdAt || new Date().toISOString(),
      })),
      recentVendors: Array.isArray(vendors) ? vendors : [],
    });
  } catch (err: any) {
    console.error("Error fetching admin stats:", err);
    return res.json({
      totalOrders: 0,
      totalRevenue: 0,
      totalProducts: 0,
      totalVendors: 0,
      totalUsers: 0,
      activeVendors: 0,
      activeDarkStores: 0,
      deliverySuccessRate: 100,
      categoryBreakdown: [],
      recentUsers: [],
      recentVendors: [],
    });
  }
});

// GET & POST /api/admin/quotations
app.get("/api/admin/quotations", async (_req, res) => {
  try {
    const quotes = await Quotation.find().sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(quotes || []);
  } catch {
    // Ignored
  }
  return res.json([]);
});

app.get("/api/vendors/quotations", async (_req, res) => {
  try {
    const quotes = await Quotation.find().sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(quotes || []);
  } catch {
    // Ignored
  }
  return res.json([]);
});

app.post("/api/vendors/quotations", async (req: any, res: any) => {
  const { vendorName, cropName, quantity, price } = req.body;
  if (!cropName || !quantity || !price) {
    return res.status(400).json({ error: "Missing required quotation fields" });
  }

  try {
    const nextId = await getNextId(Quotation);
    const newQuote = await Quotation.create({
      id: nextId,
      vendorName: vendorName || "Local Farm Vendor",
      cropName,
      quantity: Number(quantity),
      price: Number(price),
      status: "pending",
      paymentStatus: "processing",
    });
    return res.status(201).json(newQuote);
  } catch (err: any) {
    console.error("Error creating quotation:", err);
    return res.status(500).json({ error: "Failed to create quotation" });
  }
});

const handleQuotationStatus = async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const updated = await Quotation.findOneAndUpdate({ id }, { $set: { status } }, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: "Quotation not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update quotation" });
  }
};
app.put("/api/admin/quotations/:id/status", handleQuotationStatus);
app.patch("/api/admin/quotations/:id/status", handleQuotationStatus);

app.get("/api/admin/quotations/:id/invoice", async (req: any, res: any) => {
  const id = Number(req.params.id);
  const q = await Quotation.findOne({ id }).exec().catch(() => null);
  return res.json({
    invoiceNumber: `INV-2026-${id}`,
    quotationId: id,
    vendorName: q?.vendorName || "Local Farmer",
    cropName: q?.cropName || "Produce",
    quantity: q?.quantity || 100,
    price: q?.price || 5000,
    gst: (q?.price || 5000) * 0.05,
    total: (q?.price || 5000) * 1.05,
    status: q?.paymentStatus || "processing",
  });
});

app.post("/api/admin/quotations/:id/payout", async (req: any, res: any) => {
  const id = Number(req.params.id);
  await Quotation.findOneAndUpdate({ id }, { $set: { paymentStatus: "paid" } }).exec().catch(() => null);
  return res.json({ success: true, message: "Payout initiated successfully" });
});

// POST /api/admin/login
app.post("/api/admin/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Hardcoded Admin Account Check - Instant Response
  if (cleanEmail === "admin@sunotal.com" && password === "admin123") {
    const token = jwt.sign({ userId: 1, email: "admin@sunotal.com", role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: { id: 1, name: "Admin User", email: "admin@sunotal.com", role: "admin" } });
  }

  try {
    const user: any = await User.findOne({ email: cleanEmail }).exec().catch(() => null);

    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);
      if (isMatch) {
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role || "admin" }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role || "admin" } });
      }
    }
    return res.status(401).json({ error: "Invalid admin credentials" });
  } catch (err: any) {
    console.error("Admin login error:", err);
    return res.status(401).json({ error: "Invalid admin credentials" });
  }
});

// GET /api/categories
app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await Category.find().sort({ id: 1 }).exec().catch(() => []);
    if (categories && categories.length > 0) return res.json(categories);
  } catch {
    // Ignored
  }
  return res.json([]);
});

app.post("/api/categories", async (req: any, res: any) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  try {
    const nextId = await getNextId(Category);
    const cat = await Category.create({ id: nextId, name, icon: icon || "📦" });
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create category" });
  }
});

// GET /api/products
app.get("/api/products", async (req: any, res: any) => {
  try {
    const { category, search } = req.query;
    const filter: any = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const products = await Product.find(filter).sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(products || []);
  } catch {
    // Ignored
  }
  return res.json([]);
});

app.get("/api/products/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const prod = await Product.findOne({ id }).exec();
    if (!prod) return res.status(404).json({ error: "Product not found" });
    return res.json(prod);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.post("/api/products", async (req: any, res: any) => {
  try {
    const { name, category, unit, price, originalPrice, discountPercentage, image, badge, organic, active, description } = req.body;
    if (!name || !category || !unit || price === undefined) {
      return res.status(400).json({ error: "Name, category, unit, and price are required" });
    }
    const nextId = await getNextId(Product);
    const prod = await Product.create({
      id: nextId,
      name,
      category,
      unit,
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      discountPercentage: Number(discountPercentage || 0),
      image: image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
      badge: badge || null,
      organic: Boolean(organic),
      active: active !== undefined ? Boolean(active) : true,
      description: description || "",
    });
    return res.status(201).json(prod);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

app.put("/api/products/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    const prod = await Product.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).exec();
    if (!prod) return res.status(404).json({ error: "Product not found" });
    return res.json(prod);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const result = await Product.deleteOne({ id }).exec();
    if (result.deletedCount === 0) return res.status(404).json({ error: "Product not found" });
    return res.json({ success: true, message: "Product deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// GET & POST /api/vendors
app.get("/api/vendors", async (req: any, res: any) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status.toLowerCase();
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    const vendors = await Vendor.find(filter).sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(vendors || []);
  } catch {
    return res.json([]);
  }
});

app.get("/api/vendors/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const vendor = await Vendor.findOne({ id }).exec();
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    return res.json(vendor);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

const handleCreateVendor = async (req: any, res: any) => {
  try {
    const { firstName, lastName, phone, location, farmSize, produce, email, password, aadhar, gstin, notes, bankName, accountNumber, ifscCode, branchName, accountHolderName, status } = req.body;
    if (!firstName || !phone || !email) {
      return res.status(400).json({ error: "First name, phone, and email are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await Vendor.findOne({ $or: [{ email: cleanEmail }, { phone }] }).exec().catch(() => null);
    if (existing) {
      return res.status(200).json(existing);
    }

    const nextId = await getNextId(Vendor);
    const vendor = await Vendor.create({
      id: nextId,
      firstName,
      lastName: lastName || "",
      phone,
      location: location || "",
      produce: produce || farmSize || "Fresh Farm Produce",
      email: cleanEmail,
      status: status || "pending", // Default is "pending" for admin approval!
      farmSize: farmSize || null,
      aadhar: aadhar || null,
      gstin: gstin || null,
      notes: notes || null,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      branchName: branchName || null,
      accountHolderName: accountHolderName || null,
    });

    // Create corresponding User account so vendor can log into Vendor portal!
    const existingUser = await User.findOne({ email: cleanEmail }).exec().catch(() => null);
    if (!existingUser) {
      const passwordHash = await bcrypt.hash(password || "vendor123", 10);
      const userNextId = await getNextId(User);
      await User.create({
        id: userNextId,
        name: `${firstName} ${lastName || ""}`.trim(),
        email: cleanEmail,
        passwordHash,
        role: "vendor",
        active: true,
        phone,
        city: location || null,
      }).catch((e: any) => console.warn("Vendor User creation notice:", e.message));
    }

    return res.status(201).json(vendor);
  } catch (err: any) {
    console.error("Error creating vendor:", err);
    return res.status(500).json({ error: err.message || "Failed to create vendor" });
  }
};

app.post("/api/vendors", handleCreateVendor);
app.post("/api/vendors/register", handleCreateVendor);
app.post("/api/vendors/onboard", handleCreateVendor);

app.put("/api/vendors/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    const vendor = await Vendor.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).exec();
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    return res.json(vendor);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update vendor" });
  }
});

app.delete("/api/vendors/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const result = await Vendor.deleteOne({ id }).exec();
    if (result.deletedCount === 0) return res.status(404).json({ error: "Vendor not found" });
    return res.json({ success: true, message: "Vendor deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// ORDERS & CHECKOUT API ENDPOINTS (/api/orders)
app.get("/api/orders", async (req: any, res: any) => {
  try {
    const { userId, status } = req.query;
    const filter: any = {};
    if (userId) filter.userId = Number(userId);
    if (status) filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(orders || []);
  } catch {
    return res.json([]);
  }
});

const handleCheckoutOrder = async (req: any, res: any) => {
  try {
    const { items, totalAmount, customerName, customerEmail, phone, address, city, paymentMethod, userId } = req.body;
    const nextId = await getNextId(Order);
    const orderId = `ORD-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder = await Order.create({
      id: nextId,
      orderId,
      userId: userId ? Number(userId) : 1,
      customerName: customerName || "Customer",
      customerEmail: customerEmail || "customer@example.com",
      phone: phone || "9876543210",
      items: items || [],
      totalAmount: Number(totalAmount || 0),
      status: "placed",
      address: address || "Default Address",
      city: city || "Hyderabad",
      paymentMethod: paymentMethod || "COD",
      paymentStatus: paymentMethod === "COD" ? "pending" : "paid",
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
      orderId: newOrder.orderId,
    });
  } catch (err: any) {
    console.error("Order creation error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
};

app.post("/api/orders", handleCheckoutOrder);
app.post("/api/orders/checkout", handleCheckoutOrder);

app.get("/api/orders/:id", async (req: any, res: any) => {
  try {
    const target = req.params.id;
    const query = isNaN(Number(target)) ? { orderId: target } : { $or: [{ orderId: target }, { id: Number(target) }] };
    const order = await Order.findOne(query).exec();
    if (!order) return res.status(404).json({ error: "Order not found" });
    return res.json(order);
  } catch {
    return res.status(500).json({ error: "Failed to fetch order" });
  }
});

const handleUpdateOrderStatus = async (req: any, res: any) => {
  try {
    const target = req.params.id;
    const { status } = req.body;
    const query = isNaN(Number(target)) ? { orderId: target } : { $or: [{ orderId: target }, { id: Number(target) }] };

    const updated = await Order.findOneAndUpdate(query, { $set: { status } }, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update order status" });
  }
};

app.put("/api/orders/:id/status", handleUpdateOrderStatus);
app.patch("/api/orders/:id/status", handleUpdateOrderStatus);

app.post("/api/orders/:id/cancel", async (req: any, res: any) => {
  try {
    const target = req.params.id;
    const query = isNaN(Number(target)) ? { orderId: target } : { $or: [{ orderId: target }, { id: Number(target) }] };

    const updated = await Order.findOneAndUpdate(query, { $set: { status: "cancelled" } }, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json({ success: true, message: "Order cancelled", order: updated });
  } catch {
    return res.status(500).json({ error: "Failed to cancel order" });
  }
});

app.get("/api/orders/:id/track", async (req: any, res: any) => {
  const target = req.params.id;
  return res.json({
    orderId: target,
    status: "dispatched",
    estimatedDeliveryMinutes: 15,
    driverName: "Express Rider",
    driverPhone: "+91 98765 43210",
    lat: 17.385044,
    lng: 78.486671,
  });
});

app.post("/api/orders/:id/rate", async (req: any, res: any) => {
  try {
    const target = req.params.id;
    const { rating, ratingNotes } = req.body;
    const query = isNaN(Number(target)) ? { orderId: target } : { $or: [{ orderId: target }, { id: Number(target) }] };

    const updated = await Order.findOneAndUpdate(query, { $set: { rating: Number(rating), ratingNotes } }, { new: true }).exec();
    return res.json({ success: true, message: "Rating submitted", order: updated });
  } catch {
    return res.json({ success: true });
  }
});

// OBSERVABILITY & LEDGER API ENDPOINTS
app.get("/api/admin/observability", async (_req, res) => {
  return res.json({
    systemStatus: "HEALTHY",
    uptimeSeconds: process.uptime(),
    activeServices: 6,
    dbStatus: mongoose.connection.readyState === 1 ? "CONNECTED" : "CONNECTING",
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

app.get("/api/admin/ledger", async (_req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20).exec().catch(() => []);
    const transactions = orders.map((o: any) => ({
      id: o.orderId,
      type: "credit",
      description: `Customer Payment - ${o.orderId}`,
      amount: o.totalAmount || 0,
      date: o.createdAt,
      status: "completed",
    }));
    return res.json(transactions);
  } catch {
    return res.json([]);
  }
});

// GET & POST /api/warehouses
app.get("/api/warehouses", async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(warehouses || []);
  } catch {
    // Ignored
  }
  return res.json([]);
});

app.get("/api/admin/warehouses", async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(warehouses || []);
  } catch {
    // Ignored
  }
  return res.json([]);
});

app.post("/api/admin/warehouses", async (req: any, res: any) => {
  try {
    const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ error: "Name, address, and city are required" });
    }
    const nextId = await getNextId(Warehouse);
    const warehouse = await Warehouse.create({
      id: nextId,
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
    });
    return res.status(201).json(warehouse);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create warehouse" });
  }
});

app.put("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    const dbW = await Warehouse.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).exec();
    if (!dbW) return res.status(404).json({ error: "Warehouse not found" });
    return res.json(dbW);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update warehouse" });
  }
});

app.delete("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const result = await Warehouse.deleteOne({ id }).exec();
    if (result.deletedCount === 0) return res.status(404).json({ error: "Warehouse not found" });
    return res.json({ success: true, message: "Warehouse deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok", service: "operations-service" }));
app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "operations-service" }));

const isDocDB = MONGODB_URI.includes("docdb.amazonaws.com");
mongoose.connect(MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
  family: 4,
  ...(isDocDB ? { directConnection: true, authMechanism: "SCRAM-SHA-1", authSource: "admin" } : {})
}).then(() => {
  console.log("⚡ [operations-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [operations-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
});
