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

const Product: any = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Vendor: any = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
const Warehouse: any = mongoose.models.Warehouse || mongoose.model("Warehouse", WarehouseSchema);
const User: any = mongoose.models.User || mongoose.model("User", UserSchema);
const Category: any = mongoose.models.Category || mongoose.model("Category", CategorySchema);
const Quotation: any = mongoose.models.Quotation || mongoose.model("Quotation", QuotationSchema);

const defaultCategories = [
  { id: 1, name: "Vegetables", icon: "🥦" },
  { id: 2, name: "Fruits", icon: "🍎" },
  { id: 3, name: "Dairy", icon: "🥛" },
  { id: 4, name: "Dry Fruits", icon: "🥜" },
  { id: 5, name: "Grains", icon: "🌾" },
];

// GET /api/admin/stats
app.get("/api/admin/stats", async (_req, res) => {
  try {
    let totalUsers = 0;
    let totalVendors = 0;
    let totalProducts = 0;
    let totalDarkStores = 0;
    let activeVendors = 0;
    let users: any[] = [];
    let vendors: any[] = [];
    let products: any[] = [];

    try {
      [totalUsers, totalVendors, totalProducts, totalDarkStores, activeVendors, users, vendors, products] = await Promise.all([
        User.countDocuments().exec().catch(() => 0),
        Vendor.countDocuments().exec().catch(() => 0),
        Product.countDocuments().exec().catch(() => 0),
        Warehouse.countDocuments().exec().catch(() => 0),
        Vendor.countDocuments({ status: { $in: ["approved", "active"] } }).exec().catch(() => 0),
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
      totalOrders: 0,
      totalRevenue: 0,
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
  } catch (err: any) {
    return res.json([]);
  }
});

app.get("/api/vendors/quotations", async (_req, res) => {
  try {
    const quotes = await Quotation.find().sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(quotes || []);
  } catch (err: any) {
    return res.json([]);
  }
});

app.post("/api/vendors/quotations", async (req: any, res: any) => {
  const { vendorName, cropName, quantity, price } = req.body;
  if (!cropName || !quantity || !price) {
    return res.status(400).json({ error: "Missing required quotation fields" });
  }

  try {
    const count = await Quotation.countDocuments();
    const newQuote = await Quotation.create({
      id: count + 1,
      vendorName: vendorName || "Local Farm Vendor",
      cropName,
      quantity: Number(quantity),
      price: Number(price),
      status: "pending",
      paymentStatus: "processing",
    });
    return res.status(201).json(newQuote);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create quotation" });
  }
});

// POST /api/admin/login
app.post("/api/admin/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const user: any = await User.findOne({ email: cleanEmail });
    if (user && user.role === "admin") {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (isMatch) {
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      }
    }
    return res.status(401).json({ error: "Invalid admin credentials" });
  } catch (err: any) {
    return res.status(500).json({ error: "Authentication error" });
  }
});

// GET /api/categories
app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await Category.find().sort({ id: 1 });
    if (categories && categories.length > 0) return res.json(categories);
    return res.json(defaultCategories);
  } catch (err: any) {
    return res.json(defaultCategories);
  }
});

// POST /api/categories
app.post("/api/categories", async (req: any, res: any) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });
    const count = await Category.countDocuments();
    const cat = await Category.create({ id: count + 1, name, icon: icon || "📦" });
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create category" });
  }
});

// DELETE /api/categories/:id
app.delete("/api/categories/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    await Category.deleteOne({ id });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete category" });
  }
});

// GET /api/products
app.get("/api/products", async (req: any, res: any) => {
  try {
    const filter = req.query.all === "true" ? {} : { active: true };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json(products || []);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
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

    const count = await Product.countDocuments();
    const product = await Product.create({
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
    const updated = await Product.findOneAndUpdate(
      { id: targetId },
      { $set: payload },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Product not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update product" });
  }
};

app.put("/api/products/:id", handleUpdateProduct);
app.patch("/api/products/:id", handleUpdateProduct);

// DELETE /api/products/:id
app.delete("/api/products/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const result = await Product.deleteOne({ id: targetId });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Product not found" });
    return res.json({ success: true, message: "Product deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// GET /api/vendors
app.get("/api/vendors", async (_req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    return res.json(vendors || []);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// POST /api/vendors
app.post("/api/vendors", async (req: any, res: any) => {
  try {
    const { firstName, lastName, phone, location, produce, email, bankName, accountNumber, ifscCode, branchName, accountHolderName } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ error: "First name and phone are required" });
    }

    const count = await Vendor.countDocuments();
    const vendor = await Vendor.create({
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
    const updated = await Vendor.findOneAndUpdate(
      { id: targetId },
      { $set: payload },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Vendor not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update vendor" });
  }
};

app.put("/api/vendors/:id", handleUpdateVendor);
app.patch("/api/vendors/:id", handleUpdateVendor);

// DELETE /api/vendors/:id
app.delete("/api/vendors/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const result = await Vendor.deleteOne({ id: targetId });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Vendor not found" });
    return res.json({ success: true, message: "Vendor deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// Warehouses endpoints
app.get("/api/warehouses", async (_req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true });
    return res.json(warehouses || []);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

app.get("/api/admin/warehouses", async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    return res.json(warehouses || []);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

app.post("/api/admin/warehouses", async (req: any, res: any) => {
  try {
    const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ error: "Name, address, and city are required" });
    }
    const count = await Warehouse.countDocuments();
    const warehouse = await Warehouse.create({
      id: count + 1,
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
    const { id } = req.params;
    const updateData = req.body;
    const dbW = await Warehouse.findOneAndUpdate(
      { id: Number(id) },
      { $set: updateData },
      { new: true }
    );
    if (!dbW) return res.status(404).json({ error: "Warehouse not found" });
    return res.json(dbW);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update warehouse" });
  }
});

app.delete("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await Warehouse.deleteOne({ id: Number(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Warehouse not found" });
    return res.json({ success: true, message: "Warehouse deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok", service: "operations-service" }));
app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "operations-service" }));

mongoose.connect(MONGODB_URI, { tlsAllowInvalidCertificates: true, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }).then(() => {
  console.log("⚡ [operations-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [operations-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
});
