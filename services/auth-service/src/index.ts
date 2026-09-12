import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const app = express();
const PORT = Number(process.env.PORT ?? 5001);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";
const JWT_SECRET = process.env.JWT_SECRET || "sunotal-jwt-secret";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "vendor", "delivery"], default: "user" },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

const User: any = mongoose.models.User || mongoose.model("User", UserSchema);

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

async function findUserByEmail(email: string) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === "admin@sunotal.com") {
    return {
      id: 1,
      name: "Admin User",
      email: "admin@sunotal.com",
      role: "admin",
      active: true,
      phone: "+91 98765 00001",
      city: "Hyderabad",
    };
  }

  try {
    const dbUser = await User.findOne({ email: cleanEmail }).exec();
    if (dbUser) return dbUser;
  } catch (err: any) {
    console.error("DB findUserByEmail error:", err.message);
  }

  return null;
}

// POST /api/auth/register
app.post("/api/auth/register", async (req: any, res: any) => {
  const { name, email, password, phone, city } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const existing = await User.findOne({ email: cleanEmail }).exec().catch(() => null);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextId = await getNextId(User);
    const user = await User.create({
      id: nextId,
      name,
      email: cleanEmail,
      passwordHash,
      role: "user",
      active: true,
      phone: phone || null,
      city: city || null,
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    console.error("Error in registration:", err);
    return res.status(500).json({ error: err.message || "Failed to register user" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req: any, res: any) => {
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
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isBcryptMatch = user.passwordHash ? await bcrypt.compare(password, user.passwordHash).catch(() => false) : false;
    if (!isBcryptMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    console.error("Error in login:", err);
    return res.status(401).json({ error: "Invalid email or password" });
  }
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
    const user = await findUserByEmail(cleanEmail);
    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const isBcryptMatch = user.passwordHash ? await bcrypt.compare(password, user.passwordHash).catch(() => false) : false;
    if (!isBcryptMatch) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    console.error("Error in admin login:", err);
    return res.status(401).json({ error: "Invalid admin credentials" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.email === "admin@sunotal.com") {
      return res.json({
        id: 1,
        name: "Admin User",
        email: "admin@sunotal.com",
        role: "admin",
        active: true,
        user: { id: 1, name: "Admin User", email: "admin@sunotal.com", role: "admin" }
      });
    }

    const user = await findUserByEmail(decoded.email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active ?? true,
      phone: user.phone,
      city: user.city,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "auth-service" }));

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
  console.log("⚡ [auth-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [auth-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [auth-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [auth-service] Running on port ${PORT}`));
});
