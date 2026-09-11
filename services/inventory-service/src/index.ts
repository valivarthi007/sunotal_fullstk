import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

export const app = express();
const PORT = Number(process.env.PORT ?? 5003);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const InventorySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    productId: { type: Number, required: true },
    vendorId: { type: Number },
    warehouseId: { type: Number },
    warehouseName: { type: String },
    quantity: { type: Number, default: 0 },
    status: { type: String, default: "in_stock" },
    notes: { type: String },
  },
  { timestamps: true }
);

const Inventory: any = mongoose.models.Inventory || mongoose.model("Inventory", InventorySchema);

mongoose.set("bufferCommands", false);

const defaultCategories = [
  { id: 1, name: "Vegetables", icon: "🥦" },
  { id: 2, name: "Fruits", icon: "🍎" },
  { id: 3, name: "Dairy", icon: "🥛" },
  { id: 4, name: "Dry Fruits", icon: "🥜" },
  { id: 5, name: "Grains", icon: "🌾" },
];

const inMemoryInventory: any[] = [];

// Fallback handlers if ALB forwards products/categories/vendors to inventory-service
app.get("/api/categories", (_req, res) => res.json(defaultCategories));
app.get("/api/products", (_req, res) => res.json([]));
app.get("/api/vendors", (_req, res) => res.json([]));

// GET /api/inventory
app.get("/api/inventory", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const items = await Inventory.find().sort({ createdAt: -1 });
      if (items && items.length > 0) return res.json(items);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryInventory);
});

// GET /api/inventory/:id
app.get("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    if (mongoose.connection.readyState === 1) {
      const item = await Inventory.findOne({ id: targetId });
      if (item) return res.json(item);
    }
  } catch {
    // Fallback
  }
  const item = inMemoryInventory.find((i) => i.id === targetId);
  if (!item) return res.status(404).json({ error: "Inventory item not found" });
  return res.json(item);
});

// POST /api/inventory
app.post("/api/inventory", async (req: any, res: any) => {
  const { productId, vendorId, warehouseId, warehouseName, quantity, status, notes } = req.body;
  if (!productId) {
    return res.status(400).json({ error: "productId is required" });
  }

  const qty = Number(quantity || 0);
  const itemStatus = status || (qty > 0 ? "in_stock" : "out_of_stock");

  try {
    if (mongoose.connection.readyState === 1) {
      const count = await Inventory.countDocuments();
      const newInventory = await Inventory.create({
        id: count + 1,
        productId: Number(productId),
        vendorId: vendorId ? Number(vendorId) : null,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        warehouseName: warehouseName || null,
        quantity: qty,
        status: itemStatus,
        notes: notes || null,
      });
      return res.status(201).json(newInventory);
    }
  } catch {
    // Fallback
  }

  const newItem = {
    id: inMemoryInventory.length + 1,
    productId: Number(productId),
    vendorId: vendorId ? Number(vendorId) : null,
    warehouseId: warehouseId ? Number(warehouseId) : null,
    warehouseName: warehouseName || null,
    quantity: qty,
    status: itemStatus,
    notes: notes || null,
    createdAt: new Date().toISOString(),
  };
  inMemoryInventory.unshift(newItem);
  return res.status(201).json(newItem);
});

// PUT & PATCH /api/inventory/:id
const handleUpdateInventory = async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  const updateData = req.body || {};
  const payload = updateData.data || updateData;

  const updateFields: any = {};
  if (payload.quantity !== undefined) {
    updateFields.quantity = Number(payload.quantity);
    if (!payload.status) {
      updateFields.status = updateFields.quantity > 0 ? "in_stock" : "out_of_stock";
    }
  }
  if (payload.status !== undefined) updateFields.status = payload.status;
  if (payload.notes !== undefined) updateFields.notes = payload.notes;
  if (payload.warehouseName !== undefined) updateFields.warehouseName = payload.warehouseName;

  try {
    if (mongoose.connection.readyState === 1) {
      const updated = await Inventory.findOneAndUpdate(
        { id: targetId },
        { $set: updateFields },
        { new: true }
      );
      if (updated) return res.json(updated);
    }
  } catch {
    // Fallback
  }

  const item = inMemoryInventory.find((i) => i.id === targetId);
  if (!item) return res.status(404).json({ error: "Inventory item not found" });

  if (payload.quantity !== undefined) item.quantity = Number(payload.quantity);
  if (payload.status !== undefined) item.status = payload.status;
  if (payload.notes !== undefined) item.notes = payload.notes;
  if (payload.warehouseName !== undefined) item.warehouseName = payload.warehouseName;

  return res.json(item);
};

app.put("/api/inventory/:id", handleUpdateInventory);
app.patch("/api/inventory/:id", handleUpdateInventory);

// DELETE /api/inventory/:id
app.delete("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    if (mongoose.connection.readyState === 1) {
      await Inventory.deleteOne({ id: targetId });
      return res.json({ success: true, message: "Inventory item deleted" });
    }
  } catch {
    // Fallback
  }

  const index = inMemoryInventory.findIndex((i) => i.id === targetId);
  if (index !== -1) {
    inMemoryInventory.splice(index, 1);
  }
  return res.json({ success: true, message: "Inventory item deleted" });
});

app.post("/api/inventory/deduct", async (req: any, res: any) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.json({ success: true, message: "Inventory updated" });
  }
  if (mongoose.connection.readyState === 1) {
    try {
      for (const item of items) {
        const prodId = Number(item.productId);
        const reqQty = Number(item.quantity) || 1;
        if (!isNaN(prodId)) {
          const rec: any = await Inventory.findOne({ productId: prodId });
          if (rec) {
            const newQty = Math.max(0, rec.quantity - reqQty);
            await Inventory.updateOne({ id: rec.id }, { $set: { quantity: newQty, status: newQty === 0 ? "out_of_stock" : "in_stock" } });
          }
        }
      }
    } catch {
      // Ignored
    }
  }
  return res.json({ success: true, message: "Inventory updated" });
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "inventory-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true, serverSelectionTimeoutMS: 3000 }).then(() => {
  console.log("⚡ [inventory-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [inventory-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
});
