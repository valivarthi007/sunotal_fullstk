import { Router } from "express";
import { db, productsTable } from "../lib/db.js";
import { eq, ilike, and, desc, asc, SQL } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import {
  ListProductsQueryParams,
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "../lib/schemas.js";

const router = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    price: p.price,
    originalPrice: p.originalPrice,
    discountPercentage: p.discountPercentage,
    image: p.image,
    badge: p.badge,
    organic: p.organic,
    active: p.active,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /api/products
router.get("/products", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  const { category, search, organic, sort } = parsed.success ? parsed.data : {};

  const conditions: SQL[] = [eq(productsTable.active, true)];
  if (category) conditions.push(eq(productsTable.category, category as "Vegetables" | "Fruits" | "Dairy" | "Dry Fruits" | "Grains"));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (organic !== undefined) conditions.push(eq(productsTable.organic, organic));

  const query = db.select().from(productsTable).where(and(...conditions));
  const sortedQuery = sort === "price_asc"
    ? query.orderBy(asc(productsTable.price))
    : sort === "price_desc"
    ? query.orderBy(desc(productsTable.price))
    : sort === "newest"
    ? query.orderBy(desc(productsTable.createdAt))
    : query.orderBy(desc(productsTable.createdAt));

  const products = await sortedQuery;

  res.json(products.map(formatProduct));
});

// POST /api/products
router.post("/products", requireAdmin, async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = parsed.data;
  const discountPercentage =
    data.originalPrice > 0
      ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
      : 0;

  const [product] = await db
    .insert(productsTable)
    .values({
      ...data,
      discountPercentage,
      badge: data.badge ?? null,
      organic: data.organic ?? false,
      active: data.active ?? true,
      description: data.description ?? null,
    })
    .returning();

  res.status(201).json(formatProduct(product));
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, parsed.data.id))
    .limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product));
});

// PUT /api/products/:id
router.put("/products/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateProductParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // Allow partial updates: accept any subset of UpdateProductBody fields
  const bodyParsed = UpdateProductBody.partial().safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const data = bodyParsed.data;
  const discountPercentage =
    data.originalPrice !== undefined && data.price !== undefined && data.originalPrice > 0
      ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
      : undefined;

  const updateData: Partial<typeof productsTable.$inferInsert> = {};
  // Only copy fields that are present in the request body
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.badge !== undefined) updateData.badge = data.badge ?? null;
  if (data.organic !== undefined) updateData.organic = data.organic;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.description !== undefined) updateData.description = data.description ?? null;
  if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, paramsParsed.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product));
});

// DELETE /api/products/:id
router.delete("/products/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteProductParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await db
    .delete(productsTable)
    .where(eq(productsTable.id, parsed.data.id))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.status(204).end();
});

export default router;
