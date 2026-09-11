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
    id: { type: Number, unique: true, required: true },
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

async function getNextId(Model: any): Promise<number> {
  try {
    const highest = await Model.findOne({}, { id: 1 }).sort({ id: -1 }).exec();
    if (highest && typeof highest.id === "number" && !isNaN(highest.id)) {
      return highest.id + 1;
    }
  } catch {
    // Ignored
  }
  return 1;
}

// GET /api/inventory
app.get("/api/inventory", async (_req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(items || []);
  } catch (err: any) {
    console.error("Error fetching inventory:", err);
    return res.json([]);
  }
});

// GET /api/inventory/:id
app.get("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const item = await Inventory.findOne({ id: targetId }).exec();
    if (!item) return res.status(404).json({ error: "Inventory item not found" });
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch inventory item" });
  }
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
    const nextId = await getNextId(Inventory);
    const newInventory = await Inventory.create({
      id: nextId,
      productId: Number(productId),
      vendorId: vendorId ? Number(vendorId) : null,
      warehouseId: warehouseId ? Number(warehouseId) : null,
      warehouseName: warehouseName || null,
      quantity: qty,
      status: itemStatus,
      notes: notes || null,
    });
    return res.status(201).json(newInventory);
  } catch (err: any) {
    console.error("Error creating inventory:", err);
    return res.status(500).json({ error: "Failed to create inventory item" });
  }
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
    const updated = await Inventory.findOneAndUpdate(
      { id: targetId },
      { $set: updateFields },
      { new: true }
    ).exec();
    if (!updated) return res.status(404).json({ error: "Inventory item not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update inventory item" });
  }
};

app.put("/api/inventory/:id", handleUpdateInventory);
app.patch("/api/inventory/:id", handleUpdateInventory);

// DELETE /api/inventory/:id
app.delete("/api/inventory/:id", async (req: any, res: any) => {
  const targetId = Number(req.params.id);
  try {
    const result = await Inventory.deleteOne({ id: targetId }).exec();
    if (result.deletedCount === 0) return res.status(404).json({ error: "Inventory item not found" });
    return res.json({ success: true, message: "Inventory item deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete inventory item" });
  }
});

app.post("/api/inventory/deduct", async (req: any, res: any) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.json({ success: true, message: "Inventory updated" });
  }
  try {
    for (const item of items) {
      const prodId = Number(item.productId);
      const reqQty = Number(item.quantity) || 1;
      if (!isNaN(prodId)) {
        const rec: any = await Inventory.findOne({ productId: prodId }).exec();
        if (rec) {
          const newQty = Math.max(0, rec.quantity - reqQty);
          await Inventory.updateOne({ id: rec.id }, { $set: { quantity: newQty, status: newQty === 0 ? "out_of_stock" : "in_stock" } }).exec();
        }
      }
    }
    return res.json({ success: true, message: "Inventory updated" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to deduct inventory" });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "inventory-service" }));

const isDocDB = MONGODB_URI.includes("docdb.amazonaws.com");
mongoose.connect(MONGODB_URI, {
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  ...(isDocDB ? { directConnection: true } : {})
}).then(() => {
  console.log("⚡ [inventory-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [inventory-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
});
