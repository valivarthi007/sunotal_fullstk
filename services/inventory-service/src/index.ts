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


app.get("/api/inventory", async (_req, res) => {
  try {
    const items = await Inventory.find();
    return res.json(items);
  } catch {
    return res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.post("/api/inventory/deduct", async (req: any, res: any) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid payload" });
  }
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
  return res.json({ success: true });
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "inventory-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true }).then(() => {
  console.log("⚡ [inventory-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [inventory-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [inventory-service] Running on port ${PORT}`));
});
