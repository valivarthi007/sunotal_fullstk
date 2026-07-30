import { Router } from "express";
import { db, categoriesTable, productsTable } from "../lib/db.js";
import { eq, asc } from "drizzle-orm";
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

// GET /api/categories
router.get("/categories", async (_req, res) => {
  try {
    const dbCategories = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.id));
    
    // Also check categories used in products table to avoid missing any
    const productRows = await db.select({ category: productsTable.category }).from(productsTable);
    const productCategories = Array.from(new Set(productRows.map((r) => r.category).filter(Boolean)));

    let combinedMap = new Map<string, { id: number; name: string; icon?: string | null }>();

    // Add defaults
    for (const cat of DEFAULT_CATEGORIES) {
      combinedMap.set(cat.name.toLowerCase(), cat);
    }

    // Add DB categories
    for (const cat of dbCategories) {
      combinedMap.set(cat.name.toLowerCase(), {
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "📦",
      });
    }

    // Add product categories not yet in map
    let autoId = 100;
    for (const catName of productCategories) {
      if (!combinedMap.has(catName.toLowerCase())) {
        combinedMap.set(catName.toLowerCase(), {
          id: ++autoId,
          name: catName,
          icon: "📦",
        });
      }
    }

    res.json(Array.from(combinedMap.values()));
  } catch (err) {
    console.error("Failed to list categories:", err);
    // Fallback to default list if DB query fails or table missing
    res.json(DEFAULT_CATEGORIES);
  }
});

// POST /api/categories (Admin)
router.post("/categories", requireAdmin, async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid category data" });
    return;
  }

  const { name, icon } = parsed.data;

  try {
    // Check if category already exists (case-insensitive)
    const existing = await db.select().from(categoriesTable);
    const match = existing.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (match) {
      res.json({
        id: match.id,
        name: match.name,
        icon: match.icon || icon || "📦",
      });
      return;
    }

    const [category] = await db
      .insert(categoriesTable)
      .values({
        name: name.trim(),
        icon: icon?.trim() || "📦",
      })
      .returning();

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

// DELETE /api/categories/:id (Admin)
router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }

  try {
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.status(204).end();
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
