import { Router } from "express";
import { Category, Product } from "../lib/db.js";
import { getCache, setCache, invalidateCache } from "../lib/redis.js";
import { requireAdmin } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Vegetables", icon: "🥬" },
  { id: 2, name: "Fruits", icon: "🍎" },
  { id: 3, name: "Dairy", icon: "🥛" },
  { id: 4, name: "Dry Fruits", icon: "🥜" },
  { id: 5, name: "Grains", icon: "🌾" },
];

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  icon: z.string().optional().nullable(),
});

// GET /api/categories (Cached with Redis)
router.get("/categories", async (_req, res) => {
  try {
    const cached = await getCache<any[]>("categories:all");
    if (cached) {
      res.json(cached);
      return;
    }

    const dbCategories = await Category.find().sort({ id: 1 });
    const productCategories = await Product.distinct("category");

    const combinedMap = new Map<string, { id: number; name: string; icon?: string | null }>();

    for (const cat of DEFAULT_CATEGORIES) {
      combinedMap.set(cat.name.toLowerCase(), cat);
    }

    for (const cat of dbCategories) {
      combinedMap.set(cat.name.toLowerCase(), {
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "📦",
      });
    }

    let autoId = 100;
    for (const catName of productCategories) {
      if (catName && !combinedMap.has(String(catName).toLowerCase())) {
        combinedMap.set(String(catName).toLowerCase(), {
          id: ++autoId,
          name: String(catName),
          icon: "📦",
        });
      }
    }

    const result = Array.from(combinedMap.values());
    await setCache("categories:all", result, 600);
    res.json(result);
  } catch (err) {
    console.error("Failed to list categories:", err);
    res.json(DEFAULT_CATEGORIES);
  }
});

// POST /api/categories
router.post("/categories", requireAdmin, async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid category data" });
    return;
  }

  const { name, icon } = parsed.data;

  try {
    const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (existing) {
      res.json({
        id: existing.id,
        name: existing.name,
        icon: existing.icon || icon || "📦",
      });
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      icon: icon?.trim() || "📦",
    });

    await invalidateCache("categories:*");

    res.status(201).json({
      id: category.id,
      name: category.name,
      icon: category.icon,
    });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// DELETE /api/categories/:id
router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }

  try {
    await Category.findOneAndDelete({ id });
    await invalidateCache("categories:*");
    res.status(204).end();
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
