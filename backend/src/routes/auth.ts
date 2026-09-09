import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../lib/db.js";
import { signToken, requireAuth } from "../lib/auth.js";
import { RegisterUserBody, LoginUserBody } from "../lib/schemas.js";

const router = Router();

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, email, password, phone, city } = parsed.data;

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: cleanEmail,
    passwordHash,
    role: "user",
    active: true,
    phone: phone || null,
    city: city || null,
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      phone: user.phone,
      city: user.city,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!user.active) {
    res.status(401).json({ error: "Account is disabled. If you registered as a vendor, please wait for admin approval." });
    return;
  }

  // Password Verification Logic (Direct bcrypt + Updated Role Passwords)
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  const isRolePassword =
    (cleanEmail === "admin@sunotal.com" && (password === "admin123" || password === "admin")) ||
    (cleanEmail === "user@sunotal.com" && (password === "user123" || password === "Devops@768")) ||
    (cleanEmail === "vendor@sunotal.com" && (password === "vendor123" || password === "Devops@768")) ||
    (cleanEmail === "rider@sunotal.com" && (password === "rider123" || password === "Devops@768"));

  if (!isMatch && !isRolePassword) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      phone: user.phone,
      city: user.city,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    },
  });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const { userId } = (req as typeof req & { user: { userId: number } }).user;
  const user = await User.findOne({ id: userId });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    phone: user.phone,
    city: user.city,
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
  });
});

export default router;
