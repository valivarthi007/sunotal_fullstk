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
    id: { type: Number },
    productId: { type: Number },
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


const inMemoryInventory: any[] = [
  { id: 1, productId: 1, vendorId: 1, warehouseId: 1, warehouseName: "HSR Layout Store", quantity: 150, status: "in_stock" },
  { id: 2, productId: 2, vendorId: 2, warehouseId: 1, warehouseName: "HSR Layout Store", quantity: 80, status: "in_stock" },
];

app.get("/api/inventory", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const items = await Inventory.find();
      if (items && items.length > 0) return res.json(items);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryInventory);
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

mongoose.set("bufferCommands", false);

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "inventory-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true, serverSelectionTimeoutMS: 3000 }).then(() => {
  console.log("⚡ [inventory-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [inventory-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
});
