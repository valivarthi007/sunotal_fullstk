import { Router } from "express";
import { db, productDefinitionsTable } from "../lib/db.js";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import { insertProductDefinitionSchema } from "../schema/productDefinitions.js";

const router = Router();

// GET /api/product-definitions
router.get("/product-definitions", async (req, res) => {
  try {
    const list = await db.select().from(productDefinitionsTable);
    res.json(list);
  } catch (error) {
    console.error("Failed to list product definitions:", error);
    res.status(500).json({ error: "Failed to list product definitions" });
  }
});

// POST /api/product-definitions - Admin only
router.post("/product-definitions", requireAdmin, async (req, res) => {
  const parsed = insertProductDefinitionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product definition fields. Name and Category are required." });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(productDefinitionsTable)
      .where(eq(productDefinitionsTable.name, parsed.data.name))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Product name already exists in catalog definitions." });
      return;
    }

    const [newDef] = await db
      .insert(productDefinitionsTable)
      .values(parsed.data)
      .returning();

    res.status(201).json(newDef);
  } catch (error) {
    console.error("Failed to create product definition:", error);
    res.status(500).json({ error: "Failed to create product definition" });
  }
});

// DELETE /api/product-definitions/:id - Admin only
router.delete("/product-definitions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await db
      .select()
      .from(productDefinitionsTable)
      .where(eq(productDefinitionsTable.id, Number(id)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Product definition not found." });
      return;
    }

    await db.delete(productDefinitionsTable).where(eq(productDefinitionsTable.id, Number(id)));
    res.status(200).json({ success: true, message: "Product definition deleted successfully." });
  } catch (error) {
    console.error("Failed to delete product definition:", error);
    res.status(500).json({ error: "Failed to delete product definition" });
  }
});

export default router;
