import { Router } from "express";
import { db, usersTable } from "../lib/db.js";
import { eq, ilike, SQL, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import {
  ListUsersQueryParams,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
  ToggleUserStatusParams,
  ToggleUserStatusBody,
} from "../lib/schemas.js";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    phone: u.phone,
    city: u.city,
    createdAt: u.createdAt.toISOString(),
  };
}

// GET /api/users
router.get("/users", requireAdmin, async (req, res) => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  const { search, status } = parsed.success ? parsed.data : {};

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
  if (status === "active") conditions.push(eq(usersTable.active, true));
  if (status === "inactive") conditions.push(eq(usersTable.active, false));

  const users =
    conditions.length > 0
      ? await db.select().from(usersTable).where(and(...conditions))
      : await db.select().from(usersTable);

  res.json(users.map(formatUser));
});

// GET /api/users/:id
router.get("/users/:id", requireAdmin, async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.id))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// PUT /api/users/:id
router.put("/users/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateUserParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateUserBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = bodyParsed.data;
  const [user] = await db
    .update(usersTable)
    .set({
      ...data,
      phone: data.phone ?? null,
      city: data.city ?? null,
    })
    .where(eq(usersTable.id, paramsParsed.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// DELETE /api/users/:id
router.delete("/users/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await db
    .delete(usersTable)
    .where(eq(usersTable.id, parsed.data.id))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.status(204).end();
});

// PATCH /api/users/:id/status
router.patch("/users/:id/status", requireAdmin, async (req, res) => {
  const paramsParsed = ToggleUserStatusParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = ToggleUserStatusBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ active: bodyParsed.data.active })
    .where(eq(usersTable.id, paramsParsed.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

export default router;
