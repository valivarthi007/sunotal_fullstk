import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const app = express();
const PORT = Number(process.env.PORT ?? 5004);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    role: { type: String, enum: ["user", "admin", "vendor", "delivery"], default: "user" },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

const User: any = mongoose.models.User || mongoose.model("User", UserSchema);

mongoose.set("bufferCommands", false);

const inMemoryUsers: any[] = [
  { id: 1, name: "Admin User", email: "admin@sunotal.com", role: "admin", active: true, phone: "+91 98765 00001", city: "Hyderabad" },
];

// GET /api/users
app.get("/api/users", async (req: any, res: any) => {
  const searchQuery = (req.query.search || "").toString().toLowerCase().trim();
  try {
    if (mongoose.connection.readyState === 1) {
      const filter: any = {};
      if (searchQuery) {
        filter.$or = [
          { name: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
          { phone: { $regex: searchQuery, $options: "i" } },
        ];
      }
      const users = await User.find(filter, "-passwordHash").sort({ createdAt: -1 });
      if (users && users.length > 0) return res.json(users);
    }
  } catch {
    // Fallback
  }

  let filtered = inMemoryUsers;
  if (searchQuery) {
    filtered = inMemoryUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchQuery) ||
        u.email?.toLowerCase().includes(searchQuery) ||
        u.phone?.toLowerCase().includes(searchQuery)
    );
  }
  return res.json(filtered);
});

// GET /api/users/:id
app.get("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ id: targetId }, "-passwordHash");
      if (user) return res.json(user);
    }
  } catch {
    // Fallback
  }
  const user = inMemoryUsers.find((u) => u.id === targetId);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

// POST /api/users
app.post("/api/users", async (req: any, res: any) => {
  const { name, email, phone, city, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await User.countDocuments();
      const newUser = await User.create({
        id: count + 1,
        name,
        email: cleanEmail,
        passwordHash: "$2b$10$Hhn8rK6hQDLDbYSjo8kqeevw.DHzDTaWY.D9VCPajRbCeS6piXECy",
        role: role || "user",
        active: true,
        phone: phone || null,
        city: city || null,
      });
      return res.status(201).json(newUser);
    }
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }
  }

  const existing = inMemoryUsers.find((u) => u.email === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const newUser = {
    id: inMemoryUsers.length + 1,
    name,
    email: cleanEmail,
    role: role || "user",
    active: true,
    phone: phone || null,
    city: city || null,
    createdAt: new Date().toISOString(),
  };
  inMemoryUsers.push(newUser);
  return res.status(201).json(newUser);
});

// PUT & PATCH /api/users/:id
const handleUpdateUser = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  try {
    if (mongoose.connection.readyState === 1) {
      const updateFields: any = {};
      if (payload.name !== undefined) updateFields.name = payload.name;
      if (payload.phone !== undefined) updateFields.phone = payload.phone;
      if (payload.city !== undefined) updateFields.city = payload.city;
      if (payload.role !== undefined) updateFields.role = payload.role;
      if (payload.active !== undefined) updateFields.active = payload.active;

      const updated = await User.findOneAndUpdate(
        { id: targetId },
        { $set: updateFields },
        { new: true, select: "-passwordHash" }
      );
      if (updated) return res.json(updated);
    }
  } catch {
    // Fallback
  }

  const user = inMemoryUsers.find((u) => u.id === targetId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.city !== undefined) user.city = payload.city;
  if (payload.role !== undefined) user.role = payload.role;
  if (payload.active !== undefined) user.active = payload.active;

  return res.json(user);
};

app.put("/api/users/:id", handleUpdateUser);
app.patch("/api/users/:id", handleUpdateUser);

// POST & PATCH /api/users/:id/status
const handleUserStatus = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const { active, data } = req.body || {};
  const newActive = active !== undefined ? active : (data?.active !== undefined ? data.active : true);

  try {
    if (mongoose.connection.readyState === 1) {
      const updated = await User.findOneAndUpdate(
        { id: targetId },
        { $set: { active: newActive } },
        { new: true, select: "-passwordHash" }
      );
      if (updated) return res.json(updated);
    }
  } catch {
    // Fallback
  }

  const user = inMemoryUsers.find((u) => u.id === targetId);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.active = newActive;
  return res.json(user);
};

app.post("/api/users/:id/status", handleUserStatus);
app.patch("/api/users/:id/status", handleUserStatus);

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    if (mongoose.connection.readyState === 1) {
      await User.deleteOne({ id: targetId });
      return res.json({ success: true, message: "User deleted successfully" });
    }
  } catch {
    // Fallback
  }

  const index = inMemoryUsers.findIndex((u) => u.id === targetId);
  if (index !== -1) {
    inMemoryUsers.splice(index, 1);
  }
  return res.json({ success: true, message: "User deleted successfully" });
});

async function seedDefaultUsers() {
  try {
    const seedAccounts = [
      { id: 1, name: "Admin User", email: "admin@sunotal.com", pass: "admin123", role: "admin", phone: "+91 98765 00001", city: "Hyderabad" },
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
        console.log(`🌱 [user-service] Seeded user: ${acc.email} (${acc.role})`);
      } else {
        await User.updateOne({ email: acc.email }, { $set: { passwordHash, role: acc.role, active: true } });
      }
    }
  } catch (err: any) {
    console.warn("⚠️ [user-service] User seed warning:", err.message);
  }
}

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "user-service" }));

mongoose.connect(MONGODB_URI, { tlsAllowInvalidCertificates: true, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }).then(async () => {
  console.log("⚡ [user-service] Connected to MongoDB / AWS DocumentDB");
  await seedDefaultUsers();
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [user-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] Running on port ${PORT}`));
});
