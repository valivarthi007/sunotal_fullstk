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


// POST /api/admin/login
app.post("/api/admin/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user: any = await User.findOne({ email: cleanEmail });
  if (!user || user.role !== "admin") {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user });
});

// GET /api/products
app.get("/api/products", async (_req, res) => {
  try {
    const products = await Product.find({ active: true });
    return res.json(products);
  } catch {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/vendors
app.get("/api/vendors", async (_req, res) => {
  try {
    const vendors = await Vendor.find();
    return res.json(vendors);
  } catch {
    return res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// Warehouses endpoints
app.get("/api/warehouses", async (_req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true });
    return res.json(warehouses);
  } catch {
    return res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

app.get("/api/admin/warehouses", async (_req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    return res.json(warehouses);
  } catch {
    return res.status(500).json({ error: "Failed to fetch admin warehouses" });
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
  } catch {
    return res.status(500).json({ error: "Failed to create warehouse" });
  }
});

app.put("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const warehouse = await Warehouse.findOneAndUpdate(
      { id: Number(id) },
      { $set: updateData },
      { new: true }
    );
    if (!warehouse) return res.status(404).json({ error: "Warehouse not found" });
    return res.json(warehouse);
  } catch {
    return res.status(500).json({ error: "Failed to update warehouse" });
  }
});

app.delete("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await Warehouse.deleteOne({ id: Number(id) });
    return res.json({ success: true, message: "Warehouse deleted" });
  } catch {
    return res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

app.post("/api/admin/warehouses/calc-fee", async (req: any, res: any) => {
  try {
    const { city, userLat, userLng } = req.body;
    const warehouses = await Warehouse.find({ isActive: true });
    
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

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "operations-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true }).then(() => {
  console.log("⚡ [operations-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [operations-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] Running on port ${PORT}`));
});
