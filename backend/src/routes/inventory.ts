import { Router } from "express";
import { db, inventoryTable, productsTable, vendorsTable } from "../lib/db.js";
import { eq, and, SQL } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import {
  ListInventoryQueryParams,
  CreateInventoryBody,
  UpdateInventoryBody,
  UpdateInventoryParams,
  DeleteInventoryParams,
} from "../lib/schemas.js";

const router = Router();

// GET /api/inventory
router.get("/inventory", requireAdmin, async (req, res) => {
  const parsed = ListInventoryQueryParams.safeParse(req.query);
  const { status, vendorId, productId } = parsed.success ? parsed.data : {};

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(inventoryTable.status, status as any));
  if (vendorId) conditions.push(eq(inventoryTable.vendorId, vendorId));
  if (productId) conditions.push(eq(inventoryTable.productId, productId));

  const query = db
    .select({
      id: inventoryTable.id,
      productId: inventoryTable.productId,
      vendorId: inventoryTable.vendorId,
      quantity: inventoryTable.quantity,
      status: inventoryTable.status,
      notes: inventoryTable.notes,
      createdAt: inventoryTable.createdAt,
      updatedAt: inventoryTable.updatedAt,
      productName: productsTable.name,
      vendorName: vendorsTable.firstName,
      vendorLastName: vendorsTable.lastName,
    })
    .from(inventoryTable)
    .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
    .leftJoin(vendorsTable, eq(inventoryTable.vendorId, vendorsTable.id));

  const results = conditions.length > 0 
    ? await query.where(and(...conditions))
    : await query;

  res.json(results.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    vendorName: r.vendorName && r.vendorLastName ? `${r.vendorName} ${r.vendorLastName}` : r.vendorName,
  })));
});

// POST /api/inventory
router.post("/inventory", requireAdmin, async (req, res) => {
  const parsed = CreateInventoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  const [item] = await db
    .insert(inventoryTable)
    .values({
      productId: data.productId,
      vendorId: data.vendorId,
      quantity: data.quantity,
      status: data.status || "in_stock",
      notes: data.notes ?? null,
    })
    .returning();

  res.status(201).json({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });
});

// PUT /api/inventory/:id
router.put("/inventory/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateInventoryParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateInventoryBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const data = bodyParsed.data;
  const [item] = await db
    .update(inventoryTable)
    .set({
      ...data,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(inventoryTable.id, paramsParsed.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  res.json({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });
});

// DELETE /api/inventory/:id
router.delete("/inventory/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteInventoryParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await db
    .delete(inventoryTable)
    .where(eq(inventoryTable.id, parsed.data.id))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  res.status(204).end();
});

export default router;
