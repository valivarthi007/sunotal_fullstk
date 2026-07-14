import { Router } from "express";
import { db, vendorsTable } from "../lib/db.js";
import { eq, ilike, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import { ListVendorsQueryParams, CreateVendorBody, UpdateVendorBody, GetVendorParams, UpdateVendorParams, DeleteVendorParams, } from "../lib/schemas.js";
const router = Router();
function formatVendor(v) {
    return {
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        phone: v.phone,
        location: v.location,
        produce: v.produce,
        email: v.email,
        farmSize: v.farmSize,
        status: v.status,
        notes: v.notes,
        createdAt: v.createdAt.toISOString(),
    };
}
// GET /api/vendors
router.get("/vendors", async (req, res) => {
    const parsed = ListVendorsQueryParams.safeParse(req.query);
    const { status, search } = parsed.success ? parsed.data : {};
    const conditions = [];
    if (status)
        conditions.push(eq(vendorsTable.status, status));
    if (search) {
        conditions.push(ilike(vendorsTable.firstName, `%${search}%`));
    }
    const vendors = conditions.length > 0
        ? await db.select().from(vendorsTable).where(and(...conditions))
        : await db.select().from(vendorsTable);
    res.json(vendors.map(formatVendor));
});
// POST /api/vendors
router.post("/vendors", async (req, res) => {
    const parsed = CreateVendorBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
    }
    const data = parsed.data;
    const [vendor] = await db
        .insert(vendorsTable)
        .values({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        location: data.location,
        produce: data.produce,
        email: data.email ?? null,
        farmSize: data.farmSize ?? null,
        status: "pending",
    })
        .returning();
    res.status(201).json(formatVendor(vendor));
});
// GET /api/vendors/:id
router.get("/vendors/:id", async (req, res) => {
    const parsed = GetVendorParams.safeParse(req.params);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid id" });
        return;
    }
    const [vendor] = await db
        .select()
        .from(vendorsTable)
        .where(eq(vendorsTable.id, parsed.data.id))
        .limit(1);
    if (!vendor) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    res.json(formatVendor(vendor));
});
// PUT /api/vendors/:id
router.put("/vendors/:id", requireAdmin, async (req, res) => {
    const paramsParsed = UpdateVendorParams.safeParse(req.params);
    if (!paramsParsed.success) {
        res.status(400).json({ error: "Invalid id" });
        return;
    }
    const bodyParsed = UpdateVendorBody.safeParse(req.body);
    if (!bodyParsed.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
    }
    const data = bodyParsed.data;
    const [vendor] = await db
        .update(vendorsTable)
        .set({
        ...data,
        email: data.email ?? null,
        farmSize: data.farmSize ?? null,
        notes: data.notes ?? null,
    })
        .where(eq(vendorsTable.id, paramsParsed.data.id))
        .returning();
    if (!vendor) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    res.json(formatVendor(vendor));
});
// DELETE /api/vendors/:id
router.delete("/vendors/:id", requireAdmin, async (req, res) => {
    const parsed = DeleteVendorParams.safeParse(req.params);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid id" });
        return;
    }
    const result = await db
        .delete(vendorsTable)
        .where(eq(vendorsTable.id, parsed.data.id))
        .returning();
    if (result.length === 0) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    res.status(204).end();
});
export default router;
