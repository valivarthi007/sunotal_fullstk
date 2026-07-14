import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, productsTable, vendorsTable } from "../lib/db.js";
import { eq } from "drizzle-orm";
import { signToken, requireAdmin } from "../lib/auth.js";
import { AdminLoginBody } from "../lib/schemas.js";
const router = Router();
// POST /api/admin/login
router.post("/admin/login", async (req, res) => {
    const parsed = AdminLoginBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
    }
    const { email, password } = parsed.data;
    const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
    if (!user || user.role !== "admin") {
        res.status(401).json({ error: "Invalid credentials or not an admin" });
        return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
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
// GET /api/admin/stats
router.get("/admin/stats", requireAdmin, async (req, res) => {
    const [products, vendors, users] = await Promise.all([
        db.select().from(productsTable),
        db.select().from(vendorsTable),
        db.select().from(usersTable),
    ]);
    const totalProducts = products.length;
    const totalVendors = vendors.length;
    const totalUsers = users.length;
    const activeVendors = vendors.filter((v) => v.status === "approved").length;
    // Category breakdown
    const catMap = {};
    for (const p of products) {
        catMap[p.category] = (catMap[p.category] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(catMap).map(([category, count]) => ({
        category,
        count,
    }));
    // Recent 5 vendors and users
    const recentVendors = vendors
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
    }));
    const recentUsers = users
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        phone: u.phone,
        city: u.city,
        createdAt: u.createdAt.toISOString(),
    }));
    res.json({
        totalProducts,
        totalVendors,
        totalUsers,
        activeVendors,
        recentVendors,
        recentUsers,
        categoryBreakdown,
    });
});
export default router;
