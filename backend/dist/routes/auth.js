import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "../lib/db.js";
import { eq } from "drizzle-orm";
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
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
        name,
        email,
        passwordHash,
        role: "user",
        active: true,
        phone: phone ?? null,
        city: city ?? null,
    }).returning();
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
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }
    if (!user.active) {
        res.status(401).json({ error: "Account is disabled" });
        return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
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
            createdAt: user.createdAt.toISOString(),
        },
    });
});
// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
    const { userId } = req.user;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
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
        createdAt: user.createdAt.toISOString(),
    });
});
export default router;
