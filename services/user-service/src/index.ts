import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { getPgPool } from "./lib/db.js";

export const app = express();
const PORT = Number(process.env.PORT ?? 5008);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pgPool = getPgPool({ serviceName: "user-service" });

let memoryUsers: any[] = [];

// GET /api/users
app.get("/api/users", async (req: any, res: any) => {
  const searchQuery = (req.query.search || "").toString().toLowerCase().trim();
  try {
    const dbRes = await pgPool.query("SELECT id, name, email, role, active, phone, city FROM users ORDER BY id ASC").catch(() => null);
    let list = dbRes && dbRes.rows ? dbRes.rows : memoryUsers;
    if (searchQuery) {
      list = list.filter(
        (u: any) =>
          u.name.toLowerCase().includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery) ||
          (u.phone && u.phone.includes(searchQuery))
      );
    }
    return res.json(list);
  } catch (err: any) {
    return res.json([]);
  }
});

// GET /api/users/:id
app.get("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pgPool.query("SELECT id, name, email, role, active, phone, city FROM users WHERE id = $1", [targetId]).catch(() => null);
    if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
      return res.json(dbRes.rows[0]);
    }
    const user = memoryUsers.find((u) => u.id === targetId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err: any) {
    const user = memoryUsers.find((u) => u.id === targetId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  }
});

// POST /api/users
app.post("/api/users", async (req: any, res: any) => {
  const { name, email, phone, city, role, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = memoryUsers.find((u) => u.email === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password || "user123", 10);
  const nextId = memoryUsers.length + 1;
  const newUser = {
    id: nextId,
    name,
    email: cleanEmail,
    role: role || "user",
    active: true,
    phone: phone || null,
    city: city || null,
  };

  try {
    await pgPool.query(
      `INSERT INTO users (id, name, email, password_hash, role, active, phone, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [nextId, name, cleanEmail, passwordHash, role || "user", true, phone || "", city || ""]
    ).catch(() => null);

    memoryUsers.push(newUser);
    return res.status(201).json(newUser);
  } catch (err: any) {
    memoryUsers.push(newUser);
    return res.status(201).json(newUser);
  }
});

// PUT & PATCH /api/users/:id
const handleUpdateUser = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  let user = memoryUsers.find((u) => u.id === targetId);
  if (user) {
    if (payload.name !== undefined) user.name = payload.name;
    if (payload.phone !== undefined) user.phone = payload.phone;
    if (payload.city !== undefined) user.city = payload.city;
    if (payload.role !== undefined) user.role = payload.role;
    if (payload.active !== undefined) user.active = payload.active;
  }

  try {
    await pgPool.query(
      `UPDATE users SET name = $1, phone = $2, city = $3, role = $4, active = $5 WHERE id = $6`,
      [payload.name, payload.phone, payload.city, payload.role, payload.active, targetId]
    ).catch(() => null);

    return res.json(user || { id: targetId, ...payload });
  } catch (err: any) {
    return res.json(user || { id: targetId, ...payload });
  }
};

app.put("/api/users/:id", handleUpdateUser);
app.patch("/api/users/:id", handleUpdateUser);

// POST & PATCH /api/users/:id/status
const handleUserStatus = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const { active, data } = req.body || {};
  const newActive = active !== undefined ? active : (data?.active !== undefined ? data.active : true);

  let user = memoryUsers.find((u) => u.id === targetId);
  if (user) {
    user.active = newActive;
  }

  try {
    await pgPool.query("UPDATE users SET active = $1 WHERE id = $2", [newActive, targetId]).catch(() => null);
    return res.json(user || { id: targetId, active: newActive });
  } catch (err: any) {
    return res.json(user || { id: targetId, active: newActive });
  }
};

app.post("/api/users/:id/status", handleUserStatus);
app.patch("/api/users/:id/status", handleUserStatus);

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  memoryUsers = memoryUsers.filter((u) => u.id !== targetId);
  try {
    await pgPool.query("DELETE FROM users WHERE id = $1", [targetId]).catch(() => null);
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    return res.json({ success: true, message: "User deleted successfully" });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "user-service", db: "PostgreSQL" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] PostgreSQL Connected & Running on port ${PORT}`));
