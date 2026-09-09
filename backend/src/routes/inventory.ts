import { Router } from "express";
import { Inventory, Product, Vendor, Warehouse } from "../lib/db.js";
import { requireAdmin } from "../lib/auth.js";
import {
  ListInventoryQueryParams,
  DeleteInventoryParams,
} from "../lib/schemas.js";

const router = Router();

function formatInventory(i: any) {
  return {
    id: i.id,
    productId: i.productId,
    vendorId: i.vendorId,
    warehouseId: i.warehouseId,
    warehouseName: i.warehouseName || "Central Dark Store Hub",
    quantity: i.quantity,
    status: i.status,
    notes: i.notes,
    createdAt: i.createdAt ? (typeof i.createdAt === "string" ? i.createdAt : i.createdAt.toISOString()) : new Date().toISOString(),
    updatedAt: i.updatedAt ? (typeof i.updatedAt === "string" ? i.updatedAt : i.updatedAt.toISOString()) : new Date().toISOString(),
  };
}

// GET /api/inventory
router.get("/inventory", requireAdmin, async (req, res) => {
  const parsed = ListInventoryQueryParams.safeParse(req.query);
  const { status, vendorId, productId } = parsed.success ? parsed.data : {};

  const filter: any = {};
  if (status) filter.status = status;
  if (vendorId) filter.vendorId = vendorId;
  if (productId) filter.productId = productId;

  const results = await Inventory.find(filter);
  res.json(results.map((r: any) => formatInventory(r.toObject())));
});

// POST /api/inventory
router.post("/inventory", requireAdmin, async (req, res) => {
  const { productId, vendorId, warehouseId, warehouseName, quantity, status, notes } = req.body;

  const item = await Inventory.create({
    productId: Number(productId),
    vendorId: Number(vendorId),
    warehouseId: warehouseId ? Number(warehouseId) : null,
    warehouseName: warehouseName || "Central Dark Store Hub",
    quantity: Number(quantity) || 0,
    status: status || "in_stock",
    notes: notes || null,
  });

  res.status(201).json(formatInventory(item.toObject()));
});

// PUT /api/inventory/:id
router.put("/inventory/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { quantity, status, notes, warehouseId, warehouseName } = req.body;

  const item = await Inventory.findOneAndUpdate(
    { id },
    {
      $set: {
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(warehouseId !== undefined ? { warehouseId: warehouseId ? Number(warehouseId) : null } : {}),
        ...(warehouseName !== undefined ? { warehouseName } : {}),
      },
    },
    { new: true }
  );

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  res.json(formatInventory(item.toObject()));
});

// DELETE /api/inventory/:id
router.delete("/inventory/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteInventoryParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const item = await Inventory.findOneAndDelete({ id: parsed.data.id });
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  res.status(204).end();
});

// POST /api/inventory/deduct
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

      if (!isNaN(prodId) && prodId > 0) {
        const stock = await Inventory.findOne({ productId: prodId });
        if (stock) {
          const newQty = Math.max(0, stock.quantity - reqQty);
          await Inventory.updateOne(
            { id: stock.id },
            { $set: { quantity: newQty, status: newQty === 0 ? "out_of_stock" : "in_stock" } }
          );
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
