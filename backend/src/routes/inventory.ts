import { Router } from "express";
import { db, inventoryTable, productsTable, vendorsTable, warehousesTable } from "../lib/db.js";
import { eq, and, SQL, ilike, sql } from "drizzle-orm";
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
      warehouseId: inventoryTable.warehouseId,
      warehouseName: sql<string>`COALESCE(${warehousesTable.name}, ${inventoryTable.warehouseName}, 'Central Dark Store Hub')`.as("warehouseName"),
      warehouseCity: warehousesTable.city,
      quantity: inventoryTable.quantity,
      status: inventoryTable.status,
      notes: inventoryTable.notes,
      createdAt: inventoryTable.createdAt,
      updatedAt: inventoryTable.updatedAt,
      productName: productsTable.name,
      productCategory: productsTable.category,
      vendorName: vendorsTable.firstName,
      vendorLastName: vendorsTable.lastName,
    })
    .from(inventoryTable)
    .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
    .leftJoin(vendorsTable, eq(inventoryTable.vendorId, vendorsTable.id))
    .leftJoin(warehousesTable, eq(inventoryTable.warehouseId, warehousesTable.id));

  const results = conditions.length > 0 
    ? await query.where(and(...conditions))
    : await query;

  res.json(results.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    vendorName: r.vendorName && r.vendorLastName ? `${r.vendorName} ${r.vendorLastName}` : (r.vendorName || "Sunotal Partner"),
  })));
});

// POST /api/inventory
router.post("/inventory", requireAdmin, async (req, res) => {
  const { productId, vendorId, warehouseId, warehouseName, quantity, status, notes } = req.body;
  
  const [item] = await db
    .insert(inventoryTable)
    .values({
      productId: Number(productId),
      vendorId: Number(vendorId),
      warehouseId: warehouseId ? Number(warehouseId) : null,
      warehouseName: warehouseName || null,
      quantity: Number(quantity) || 0,
      status: status || "in_stock",
      notes: notes ?? null,
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
  const id = Number(req.params.id);
  const { quantity, status, notes, warehouseId, warehouseName } = req.body;

  const [item] = await db
    .update(inventoryTable)
    .set({
      ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(warehouseId !== undefined ? { warehouseId: warehouseId ? Number(warehouseId) : null } : {}),
      ...(warehouseName !== undefined ? { warehouseName } : {}),
      updatedAt: new Date(),
    })
    .where(eq(inventoryTable.id, id))
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

// POST /api/inventory/deduct - Deduct stock for cart items
router.post("/inventory/deduct", async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: "Invalid items payload" });
      return;
    }

    for (const item of items) {
      const prodId = Number(item.productId);
      const reqQty = Number(item.quantity) || 1;
      const name = item.productName || item.name;

      // 1. Find inventory records matching productId or product name
      let records: any[] = [];
      if (!isNaN(prodId) && prodId > 0) {
        records = await db
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.productId, prodId));
      }

      if (records.length === 0 && name) {
        const matchingProds = await db
          .select()
          .from(productsTable)
          .where(ilike(productsTable.name, `%${name}%`));
        if (matchingProds.length > 0) {
          records = await db
            .select()
            .from(inventoryTable)
            .where(eq(inventoryTable.productId, matchingProds[0].id));
        }
      }

      if (records.length === 0) {
        records = await db
          .select()
          .from(inventoryTable)
          .where(sql`${inventoryTable.quantity} > 0`)
          .limit(5);
      }

      // 2. If records exist in inventoryTable, deduct quantity
      if (records.length > 0) {
        let remaining = reqQty;
        for (const rec of records) {
          if (remaining <= 0) break;
          const deduct = Math.min(rec.quantity, remaining);
          const newQty = Math.max(0, rec.quantity - deduct);
          const newStatus = newQty === 0 ? "out_of_stock" : newQty < 5 ? "low_stock" : "in_stock";

          await db
            .update(inventoryTable)
            .set({ quantity: newQty, status: newStatus as any, updatedAt: new Date() })
            .where(eq(inventoryTable.id, rec.id));

          remaining -= deduct;
        }
      } else {
        // If inventoryTable has no records for this product yet, create an inventory entry with deducted stock
        let targetProdId = !isNaN(prodId) && prodId > 0 ? prodId : null;
        if (!targetProdId && name) {
          const [matched] = await db.select().from(productsTable).where(ilike(productsTable.name, `%${name}%`)).limit(1);
          if (matched) targetProdId = matched.id;
        }

        if (targetProdId) {
          let vendorId = 1;
          const vendors = await db.select().from(vendorsTable).limit(1);
          if (vendors.length > 0) {
            vendorId = vendors[0].id;
          } else {
            const [newV] = await db.insert(vendorsTable).values({
              firstName: "Sunotal",
              lastName: "Farm Sourcing",
              phone: "+91 9999999999",
              location: "Local Farm Sourcing Hub",
              produce: "General Fresh Produce",
              status: "approved",
            }).returning();
            vendorId = newV.id;
          }

          const defaultQty = Math.max(0, 50 - reqQty);
          await db.insert(inventoryTable).values({
            productId: targetProdId,
            vendorId: vendorId,
            quantity: defaultQty,
            status: defaultQty === 0 ? "out_of_stock" : defaultQty < 5 ? "low_stock" : "in_stock",
            notes: `Auto-created stock record after checkout deduction (${reqQty} units ordered)`,
          });
        }
      }
    }

    res.json({ success: true, message: "Inventory stock deducted successfully" });
  } catch (error: any) {
    console.error("Failed to deduct inventory:", error);
    res.status(500).json({ error: error.message || "Failed to deduct inventory" });
  }
});

export default router;
