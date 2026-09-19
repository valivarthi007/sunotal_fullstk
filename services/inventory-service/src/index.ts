import "dotenv/config";
import express from "express";
import cors from "cors";
import { getPgPool } from "./lib/db.js";

export const app = express();
const PORT = Number(process.env.PORT ?? 5003);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pgPool = getPgPool({ serviceName: "inventory-service" });

// Initialize PostgreSQL schema and seed default inventory
async function initDb() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(255),
        vendor_name VARCHAR(255) DEFAULT 'Direct Source Vendor',
        vendor_id INT,
        warehouse_id INT,
        warehouse_name VARCHAR(255) DEFAULT 'Central Dark Store Hub',
        quantity INT NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'kg',
        status VARCHAR(50) DEFAULT 'in_stock',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default inventory only if table is empty
    const countRes = await pgPool.query('SELECT COUNT(*) FROM inventory');
    const count = Number(countRes.rows[0].count);
    if (count === 0) {
      const defaults = [
        { productId: 1, productName: "Organic Farm Whole Milk (1L)", vendorName: "Green Valley Farm", warehouseName: "Central Dark Store Hub", quantity: 45, unit: "1L", notes: "Fresh Batch" },
        { productId: 2, productName: "Fresh Bananas Bunch (1kg)", vendorName: "Tropical Orchards", warehouseName: "Central Dark Store Hub", quantity: 120, unit: "1kg", notes: "A-Grade" },
        { productId: 3, productName: "Vine Ripe Red Tomatoes (500g)", vendorName: "Sunrise Veggie Farm", warehouseName: "Central Dark Store Hub", quantity: 85, unit: "500g", notes: "Organic" },
        { productId: 4, productName: "Free Range Brown Eggs (12pk)", vendorName: "Poultry Fresh", warehouseName: "East Dark Store Hub", quantity: 35, unit: "12pk", notes: "Farm Fresh" },
      ];
      for (const item of defaults) {
        const qty = item.quantity;
        await pgPool.query(
          `INSERT INTO inventory (product_id, product_name, vendor_name, warehouse_name, quantity, unit, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
          [item.productId, item.productName, item.vendorName, item.warehouseName, qty, item.unit, qty > 0 ? 'in_stock' : 'out_of_stock', item.notes]
        );
      }
      console.log('🐘 [inventory-service] PostgreSQL seeded with default inventory.');
    } else {
      console.log(`🐘 [inventory-service] PostgreSQL connected with ${count} inventory records.`);
    }
  } catch (err: any) {
    console.warn('⚠️ [inventory-service] DB init warning:', err?.message || err);
  }
}

initDb();

// GET /api/inventory
app.get("/api/inventory", async (_req, res) => {
  try {
    const result = await pgPool.query("SELECT * FROM inventory ORDER BY id DESC");
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(503).json({ error: "Could not fetch inventory. Database unavailable." });
  }
});

// GET /api/inventory/:id
app.get("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const result = await pgPool.query("SELECT * FROM inventory WHERE id = $1", [targetId]);
    if (result.rows && result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    return res.status(404).json({ error: "Inventory item not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch inventory item", message: err?.message });
  }
});

// POST /api/inventory
app.post("/api/inventory", async (req: any, res: any) => {
  const { productId, vendorId, warehouseId, warehouseName, quantity, status, notes, productName, vendorName, unit } = req.body;
  if (!productId) {
    return res.status(400).json({ error: "productId is required" });
  }

  const qty = Number(quantity || 0);
  const itemStatus = status || (qty > 0 ? "in_stock" : "out_of_stock");

  try {
    const dbRes = await pgPool.query(
      `INSERT INTO inventory (product_id, product_name, vendor_name, vendor_id, warehouse_id, warehouse_name, quantity, unit, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [Number(productId), productName || "Grocery Product", vendorName || "Direct Source Vendor", vendorId ? Number(vendorId) : null, warehouseId ? Number(warehouseId) : null, warehouseName || "Central Dark Store Hub", qty, unit || "kg", itemStatus, notes || null]
    );
    return res.status(201).json(dbRes.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to add inventory item", message: err?.message });
  }
});

// PUT & PATCH /api/inventory/:id
const handleUpdateInventory = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  const qty = payload.quantity !== undefined ? Number(payload.quantity) : undefined;
  const autoStatus = qty !== undefined ? (qty > 0 ? "in_stock" : "out_of_stock") : undefined;
  const itemStatus = payload.status || autoStatus;

  try {
    const dbRes = await pgPool.query(
      `UPDATE inventory SET
        quantity = COALESCE($1, quantity),
        status = COALESCE($2, status),
        warehouse_name = COALESCE($3, warehouse_name),
        notes = COALESCE($4, notes),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [qty, itemStatus, payload.warehouseName, payload.notes, targetId]
    );
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(dbRes.rows[0]);
    }
    return res.status(404).json({ error: "Inventory item not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update inventory", message: err?.message });
  }
};

app.put("/api/inventory/:id", handleUpdateInventory);
app.patch("/api/inventory/:id", handleUpdateInventory);

// DELETE /api/inventory/:id
app.delete("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const dbRes = await pgPool.query("DELETE FROM inventory WHERE id = $1 RETURNING id", [targetId]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json({ success: true, message: "Inventory item deleted" });
    }
    return res.status(404).json({ error: "Inventory item not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete inventory item", message: err?.message });
  }
});

// POST /api/inventory/deduct — Updates DB quantity
app.post("/api/inventory/deduct", async (req: any, res: any) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.json({ success: true, message: "Nothing to deduct" });
  }

  const client = await pgPool.connect().catch(() => null);
  if (!client) {
    return res.status(503).json({ error: "Database unavailable for inventory deduction" });
  }

  try {
    await client.query('BEGIN');
    for (const item of items) {
      const prodId = Number(item.productId);
      const reqQty = Number(item.quantity) || 1;
      await client.query(
        `UPDATE inventory SET
           quantity = GREATEST(0, quantity - $1),
           status = CASE WHEN GREATEST(0, quantity - $1) = 0 THEN 'out_of_stock' ELSE 'in_stock' END,
           updated_at = NOW()
         WHERE product_id = $2`,
        [reqQty, prodId]
      );
    }
    await client.query('COMMIT');
    return res.json({ success: true, message: "Inventory updated" });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: "Failed to deduct inventory", message: err?.message });
  } finally {
    client.release();
  }
});

// POST /api/inventory/reserve — PostgreSQL transaction-based race-safe reservation
app.post("/api/inventory/reserve", async (req: any, res: any) => {
  const { items, reservationId = `RES-${Date.now()}` } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Reservation items array required" });
  }

  const client = await pgPool.connect().catch(() => null);
  if (!client) {
    return res.status(503).json({ error: "Database unavailable for inventory reservation" });
  }

  const reserved: any[] = [];
  const failed: any[] = [];

  try {
    await client.query('BEGIN');

    for (const item of items) {
      const prodId = Number(item.productId || item.id || 0);
      const reqQty = Number(item.quantity || 1);

      // Lock row for update to prevent race conditions
      const lockRes = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 OR id = $1 FOR UPDATE',
        [prodId]
      );

      const inv = lockRes.rows[0];
      if (inv && Number(inv.quantity) >= reqQty) {
        await client.query(
          `UPDATE inventory SET
             quantity = quantity - $1,
             status = CASE WHEN quantity - $1 <= 0 THEN 'out_of_stock' ELSE 'in_stock' END,
             updated_at = NOW()
           WHERE id = $2`,
          [reqQty, inv.id]
        );
        reserved.push({ productId: prodId, reservedQty: reqQty, remaining: Number(inv.quantity) - reqQty });
      } else {
        failed.push({ productId: prodId, requested: reqQty, available: inv ? Number(inv.quantity) : 0 });
      }
    }

    if (failed.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: "Stock reservation failed for one or more items",
        failed,
      });
    }

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      reservationId,
      holdDurationSeconds: 600,
      expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
      reserved,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => null);
    return res.status(500).json({ error: "Reservation transaction failed", message: err?.message });
  } finally {
    client.release();
  }
});

// POST /api/inventory/release — Atomic release/rollback of reserved stock
app.post("/api/inventory/release", async (req: any, res: any) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Release items array required" });
  }

  const client = await pgPool.connect().catch(() => null);
  if (!client) {
    return res.status(503).json({ error: "Database unavailable for inventory release" });
  }

  try {
    await client.query('BEGIN');
    for (const item of items) {
      const prodId = Number(item.productId || item.id || 0);
      const reqQty = Number(item.quantity || 1);
      await client.query(
        `UPDATE inventory SET
           quantity = quantity + $1,
           status = 'in_stock',
           updated_at = NOW()
         WHERE product_id = $2 OR id = $2`,
        [reqQty, prodId]
      );
    }
    await client.query('COMMIT');
    return res.json({ success: true, message: "Inventory released successfully" });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => null);
    return res.status(500).json({ error: "Inventory release failed", message: err?.message });
  } finally {
    client.release();
  }
});

// GET /api/inventory/low-stock-alerts — Queries DB directly
app.get("/api/inventory/low-stock-alerts", async (_req, res) => {
  const threshold = 15;
  try {
    const dbRes = await pgPool.query('SELECT * FROM inventory WHERE quantity <= $1 ORDER BY quantity ASC', [threshold]);
    return res.json({
      threshold,
      totalAlerts: dbRes.rows.length,
      items: dbRes.rows,
    });
  } catch (err: any) {
    return res.status(503).json({ error: "Could not fetch low-stock alerts. Database unavailable." });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "inventory-service", db: "PostgreSQL" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] PostgreSQL Connected & Running on port ${PORT}`));
