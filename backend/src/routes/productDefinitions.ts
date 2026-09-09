import { Router } from "express";
import { Product } from "../lib/db.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

// GET /api/product-definitions
router.get("/product-definitions", async (req, res) => {
  try {
    const products = await Product.find({}, "id name category createdAt");
    res.json(products.map((p: any) => ({ id: p.id, name: p.name, category: p.category, createdAt: p.createdAt })));
  } catch (error) {
    console.error("Failed to list product definitions:", error);
    res.status(500).json({ error: "Failed to list product definitions" });
  }
});

// POST /api/product-definitions
router.post("/product-definitions", requireAdmin, async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    res.status(400).json({ error: "Name and Category are required." });
    return;
  }

  try {
    const existing = await Product.findOne({ name: name.trim() });
    if (existing) {
      res.status(409).json({ error: "Product name already exists in catalog definitions." });
      return;
    }

    const newProd = await Product.create({
      name: name.trim(),
      category: category.trim(),
      unit: "1 kg",
      price: 50,
      originalPrice: 60,
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    });

    res.status(201).json({ id: newProd.id, name: newProd.name, category: newProd.category, createdAt: newProd.createdAt });
  } catch (error) {
    console.error("Failed to create product definition:", error);
    res.status(500).json({ error: "Failed to create product definition" });
  }
});

// DELETE /api/product-definitions/:id
router.delete("/product-definitions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await Product.findOneAndDelete({ id: Number(id) });
    res.status(200).json({ success: true, message: "Product definition deleted successfully." });
  } catch (error) {
    console.error("Failed to delete product definition:", error);
    res.status(500).json({ error: "Failed to delete product definition" });
  }
});

export default router;
