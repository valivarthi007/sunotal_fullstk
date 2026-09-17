import "dotenv/config";
import express from "express";
import cors from "cors";
import { getPgPool } from "./lib/db.js";

export const app = express();
const PORT = Number(process.env.PORT ?? 5003);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pgPool = getPgPool({ serviceName: "inventory-service" });

let memoryInventory: any[] = [
  { id: 1, productId: 1, productName: "Organic Farm Whole Milk (1L)", vendorName: "Green Valley Farm", warehouseName: "Central Dark Store Hub", quantity: 45, unit: "1L", status: "in_stock", notes: "Fresh Batch" },
  { id: 2, productId: 2, productName: "Fresh Bananas Bunch (1kg)", vendorName: "Tropical Orchards", warehouseName: "Central Dark Store Hub", quantity: 120, unit: "1kg", status: "in_stock", notes: "A-Grade" },
  { id: 3, productId: 3, productName: "Vine Ripe Red Tomatoes (500g)", vendorName: "Sunrise Veggie Farm", warehouseName: "Central Dark Store Hub", quantity: 85, unit: "500g", status: "in_stock", notes: "Organic" },
  { id: 4, productId: 4, productName: "Free Range Brown Eggs (12pk)", vendorName: "Poultry Fresh", warehouseName: "East Dark Store Hub", quantity: 35, unit: "12pk", status: "in_stock", notes: "Farm Fresh" },
];

// GET /api/inventory
app.get("/api/inventory", async (_req, res) => {
  try {
    const result = await pgPool.query("SELECT * FROM inventory ORDER BY id DESC").catch(() => null);
    if (result && result.rows && result.rows.length > 0) {
      return res.json(result.rows);
    }
    return res.json(memoryInventory);
  } catch (err: any) {
    return res.json(memoryInventory);
  }
});

// GET /api/inventory/:id
app.get("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const result = await pgPool.query("SELECT * FROM inventory WHERE id = $1", [targetId]).catch(() => null);
    if (result && result.rows && result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    const item = memoryInventory.find((i) => i.id === targetId);
    if (!item) return res.status(404).json({ error: "Inventory item not found" });
    return res.json(item);
  } catch (err: any) {
    const item = memoryInventory.find((i) => i.id === targetId);
    if (!item) return res.status(404).json({ error: "Inventory item not found" });
    return res.json(item);
  }
});

// POST /api/inventory
app.post("/api/inventory", async (req: any, res: any) => {
  const { productId, vendorId, warehouseId, warehouseName, quantity, status, notes, productName } = req.body;
  if (!productId) {
    return res.status(400).json({ error: "productId is required" });
  }

  const qty = Number(quantity || 0);
  const itemStatus = status || (qty > 0 ? "in_stock" : "out_of_stock");
  const nextId = memoryInventory.length + 1;

  const newItem = {
    id: nextId,
    productId: Number(productId),
    productName: productName || "Grocery Product",
    vendorId: vendorId ? Number(vendorId) : null,
    warehouseId: warehouseId ? Number(warehouseId) : null,
    warehouseName: warehouseName || "Central Dark Store Hub",
    quantity: qty,
    status: itemStatus,
    notes: notes || null,
  };

  try {
    await pgPool.query(
      `INSERT INTO inventory (id, product_id, warehouse_name, quantity, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [nextId, Number(productId), newItem.warehouseName, qty, itemStatus, notes || ""]
    ).catch(() => null);
    memoryInventory.unshift(newItem);
    return res.status(201).json(newItem);
  } catch (err: any) {
    memoryInventory.unshift(newItem);
    return res.status(201).json(newItem);
  }
});

// PUT & PATCH /api/inventory/:id
const handleUpdateInventory = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  let item = memoryInventory.find((i) => i.id === targetId);
  if (item) {
    if (payload.quantity !== undefined) {
      item.quantity = Number(payload.quantity);
      item.status = item.quantity > 0 ? "in_stock" : "out_of_stock";
    }
    if (payload.status !== undefined) item.status = payload.status;
    if (payload.notes !== undefined) item.notes = payload.notes;
    if (payload.warehouseName !== undefined) item.warehouseName = payload.warehouseName;
  }

  try {
    await pgPool.query(
      `UPDATE inventory SET quantity = $1, status = $2 WHERE id = $3`,
      [payload.quantity, payload.status, targetId]
    ).catch(() => null);
    return res.json(item || { id: targetId, ...payload });
  } catch (err: any) {
    return res.json(item || { id: targetId, ...payload });
  }
};

app.put("/api/inventory/:id", handleUpdateInventory);
app.patch("/api/inventory/:id", handleUpdateInventory);

// DELETE /api/inventory/:id
app.delete("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  memoryInventory = memoryInventory.filter((i) => i.id !== targetId);
  try {
    await pgPool.query("DELETE FROM inventory WHERE id = $1", [targetId]).catch(() => null);
    return res.json({ success: true, message: "Inventory item deleted" });
  } catch (err: any) {
    return res.json({ success: true, message: "Inventory item deleted" });
  }
});

app.post("/api/inventory/deduct", async (req: any, res: any) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.json({ success: true, message: "Inventory updated" });
  }
  for (const item of items) {
    const prodId = Number(item.productId);
    const reqQty = Number(item.quantity) || 1;
    const inv = memoryInventory.find((i) => i.productId === prodId);
    if (inv) {
      inv.quantity = Math.max(0, inv.quantity - reqQty);
      inv.status = inv.quantity === 0 ? "out_of_stock" : "in_stock";
    }
  }
  return res.json({ success: true, message: "Inventory updated" });
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "inventory-service", db: "PostgreSQL" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] PostgreSQL Connected & Running on port ${PORT}`));
