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
    id: { type: Number, unique: true },
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


// POST /api/auth/register
app.post("/api/auth/register", async (req: any, res: any) => {
  const { name, email, password, phone, city } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const count = await User.countDocuments();
  const user = await User.create({
    id: count + 1,
    name,
    email: cleanEmail,
    passwordHash,
    role: "user",
    active: true,
    phone: phone || null,
    city: city || null,
  });

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.status(201).json({ token, user });
});

// POST /api/auth/login
app.post("/api/auth/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user });
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "auth-service" }));

async function seedDefaultUsers() {
  try {
    const seedAccounts = [
      { id: 1, name: "Admin User", email: "admin@sunotal.com", pass: "admin123", role: "admin", phone: "+91 98765 00001", city: "Hyderabad" },
      { id: 2, name: "Sunotal Customer", email: "user@sunotal.com", pass: "user123", role: "user", phone: "+91 98765 00002", city: "Bengaluru" },
      { id: 3, name: "Farm Vendor", email: "vendor@sunotal.com", pass: "vendor123", role: "vendor", phone: "+91 98765 00003", city: "Mysuru" },
      { id: 4, name: "Delivery Rider", email: "rider@sunotal.com", pass: "rider123", role: "delivery", phone: "+91 98765 00004", city: "Bengaluru" },
    ];

    for (const acc of seedAccounts) {
      const existing = await User.findOne({ email: acc.email });
      const passwordHash = await bcrypt.hash(acc.pass, 10);
      if (!existing) {
        await User.create({
          id: acc.id,
          name: acc.name,
          email: acc.email,
          passwordHash,
          role: acc.role,
          active: true,
          phone: acc.phone,
          city: acc.city,
        });
        console.log(`🌱 Seeded user: ${acc.email} (${acc.role})`);
      } else {
        // Guarantee password hash is always up to date
        await User.updateOne({ email: acc.email }, { $set: { passwordHash, role: acc.role, active: true } });
      }
    }
  } catch (err: any) {
    console.warn("⚠️ User seed warning:", err.message);
  }
}

mongoose.connect(MONGODB_URI, { tlsInsecure: true }).then(async () => {
  console.log("⚡ [auth-service] Connected to MongoDB");
  await seedDefaultUsers();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ [auth-service] Running on port ${PORT}`);
  });
}).catch((err) => {
  console.warn("⚠️ [auth-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [auth-service] Running on port ${PORT}`));
});

