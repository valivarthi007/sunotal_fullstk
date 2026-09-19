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

// GET /api/users
app.get("/api/users", async (req: any, res: any) => {
  const searchQuery = (req.query.search || "").toString().toLowerCase().trim();
  try {
    let queryStr = "SELECT id, name, email, role, active, phone, city, wallet_balance, created_at FROM users ORDER BY id ASC";
    const params: any[] = [];

    if (searchQuery) {
      queryStr = `SELECT id, name, email, role, active, phone, city, wallet_balance, created_at FROM users
                  WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 OR (phone IS NOT NULL AND phone LIKE $1)
                  ORDER BY id ASC`;
      params.push(`%${searchQuery}%`);
    }

    const dbRes = await pgPool.query(queryStr, params);
    return res.json(dbRes.rows);
  } catch (err: any) {
    return res.status(503).json({ error: "Could not fetch users. Database unavailable." });
  }
});

// GET /api/users/:id
app.get("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pgPool.query(
      "SELECT id, name, email, role, active, phone, city, wallet_balance, created_at FROM users WHERE id = $1",
      [targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(dbRes.rows[0]);
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch user", message: err?.message });
  }
});

// POST /api/users
app.post("/api/users", async (req: any, res: any) => {
  const { name, email, phone, city, role, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password || "user123", 10);

  try {
    // Check for duplicate
    const existing = await pgPool.query("SELECT id FROM users WHERE LOWER(email) = $1", [cleanEmail]);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const dbRes = await pgPool.query(
      `INSERT INTO users (name, email, password_hash, role, active, phone, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, active, phone, city, created_at`,
      [name, cleanEmail, passwordHash, role || "customer", true, phone || null, city || null]
    );
    return res.status(201).json(dbRes.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create user", message: err?.message });
  }
});

// PUT & PATCH /api/users/:id
const handleUpdateUser = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  try {
    const dbRes = await pgPool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        city = COALESCE($3, city),
        role = COALESCE($4, role),
        active = COALESCE($5, active)
       WHERE id = $6
       RETURNING id, name, email, role, active, phone, city, created_at`,
      [payload.name, payload.phone, payload.city, payload.role, payload.active, targetId]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(dbRes.rows[0]);
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update user", message: err?.message });
  }
};

app.put("/api/users/:id", handleUpdateUser);
app.patch("/api/users/:id", handleUpdateUser);

// POST & PATCH /api/users/:id/status
const handleUserStatus = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const { active, data } = req.body || {};
  const newActive = active !== undefined ? Boolean(active) : (data?.active !== undefined ? Boolean(data.active) : true);

  try {
    const dbRes = await pgPool.query(
      "UPDATE users SET active = $1 WHERE id = $2 RETURNING id, name, email, role, active, phone, city",
      [newActive, targetId]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(dbRes.rows[0]);
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update user status", message: err?.message });
  }
};

app.post("/api/users/:id/status", handleUserStatus);
app.patch("/api/users/:id/status", handleUserStatus);

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pgPool.query("DELETE FROM users WHERE id = $1 RETURNING id", [targetId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, message: "User deleted successfully" });
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete user", message: err?.message });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "user-service", db: "PostgreSQL" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] PostgreSQL Connected & Running on port ${PORT}`));
