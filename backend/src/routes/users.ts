import { Router } from "express";
import { User } from "../lib/db.js";
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

function formatUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    phone: u.phone,
    city: u.city,
    createdAt: u.createdAt ? (typeof u.createdAt === "string" ? u.createdAt : u.createdAt.toISOString()) : new Date().toISOString(),
  };
}

// GET /api/users
router.get("/users", requireAdmin, async (req, res) => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  const { search, status } = parsed.success ? parsed.data : {};

  const filter: any = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  if (status === "active") filter.active = true;
  if (status === "inactive") filter.active = false;

  const users = await User.find(filter);
  res.json(users.map((u: any) => formatUser(u.toObject())));
});

// GET /api/users/:id
router.get("/users/:id", requireAdmin, async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await User.findOne({ id: parsed.data.id });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user.toObject()));
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

  const user = await User.findOneAndUpdate({ id: paramsParsed.data.id }, { $set: bodyParsed.data }, { new: true });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user.toObject()));
});

// DELETE /api/users/:id
router.delete("/users/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = await User.findOneAndDelete({ id: parsed.data.id });
  if (!user) {
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

  const user = await User.findOneAndUpdate({ id: paramsParsed.data.id }, { $set: { active: bodyParsed.data.active } }, { new: true });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user.toObject()));
});

export default router;
