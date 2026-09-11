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
    id: { type: Number, unique: true, required: true },
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

// GET /api/users
app.get("/api/users", async (req: any, res: any) => {
  const searchQuery = (req.query.search || "").toString().toLowerCase().trim();
  try {
    const filter: any = {};
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { phone: { $regex: searchQuery, $options: "i" } },
      ];
    }
    const users = await User.find(filter, "-passwordHash").sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(users || []);
  } catch (err: any) {
    console.error("Error fetching users:", err);
    return res.json([]);
  }
});

// GET /api/users/:id
app.get("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const user = await User.findOne({ id: targetId }, "-passwordHash").exec();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users
app.post("/api/users", async (req: any, res: any) => {
  const { name, email, phone, city, role, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const existing = await User.findOne({ email: cleanEmail }).exec().catch(() => null);
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password || "user123", 10);
    const nextId = await getNextId(User);
    const newUser = await User.create({
      id: nextId,
      name,
      email: cleanEmail,
      passwordHash,
      role: role || "user",
      active: true,
      phone: phone || null,
      city: city || null,
    });
    return res.status(201).json(newUser);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("Error creating user:", err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT & PATCH /api/users/:id
const handleUpdateUser = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  try {
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
    ).exec();
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json(updated);
  } catch (err: any) {
    console.error("Error updating user:", err);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

app.put("/api/users/:id", handleUpdateUser);
app.patch("/api/users/:id", handleUpdateUser);

// POST & PATCH /api/users/:id/status
const handleUserStatus = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const { active, data } = req.body || {};
  const newActive = active !== undefined ? active : (data?.active !== undefined ? data.active : true);

  try {
    const updated = await User.findOneAndUpdate(
      { id: targetId },
      { $set: { active: newActive } },
      { new: true, select: "-passwordHash" }
    ).exec();
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update status" });
  }
};

app.post("/api/users/:id/status", handleUserStatus);
app.patch("/api/users/:id/status", handleUserStatus);

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const result = await User.deleteOne({ id: targetId }).exec();
    if (result.deletedCount === 0) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "user-service" }));

const isDocDB = MONGODB_URI.includes("docdb.amazonaws.com");
mongoose.connect(MONGODB_URI, {
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  ...(isDocDB ? { directConnection: true } : {})
}).then(() => {
  console.log("⚡ [user-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [user-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] Running on port ${PORT}`));
});
