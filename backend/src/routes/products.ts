import { Router } from "express";
import { Product, Warehouse, Inventory, Vendor } from "../lib/db.js";
import { getCache, setCache, invalidateCache } from "../lib/redis.js";
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

function formatProduct(p: any, isUnserviceable: boolean = false, distanceKm?: number) {
  const rawStock = Number(p.stock) || 50;
  const effectiveStock = isUnserviceable ? 0 : rawStock;
  const isAvailable = effectiveStock > 0;

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
    createdAt: p.createdAt ? (typeof p.createdAt === "string" ? p.createdAt : p.createdAt.toISOString()) : new Date().toISOString(),
    location: p.location || "Bengaluru Sourcing Hub",
    stock: effectiveStock,
    inStock: isAvailable,
    stockStatus: isUnserviceable ? "unserviceable_radius" : isAvailable ? "in_stock" : "out_of_stock",
    proximityKm: distanceKm !== undefined ? distanceKm : null,
  };
}

// GET /api/products (with Redis Caching)
router.get("/products", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  const { category, search, organic, sort, all } = parsed.success ? parsed.data : {};

  const cacheKey = `products:${category || 'all'}:${search || ''}:${organic}:${sort}:${all}`;
  const cached = await getCache<any[]>(cacheKey);
  if (cached && !search) {
    res.json(cached);
    return;
  }

  const filter: any = {};
  if (!all) filter.active = true;
  if (category) filter.category = category;
  if (organic !== undefined) filter.organic = organic;
  if (search) filter.name = { $regex: search, $options: "i" };

  let query = Product.find(filter);

  if (sort === "price_asc") query = query.sort({ price: 1 });
  else if (sort === "price_desc") query = query.sort({ price: -1 });
  else query = query.sort({ createdAt: -1 });

  const rawProducts = await query;
  const formatted = rawProducts.map((p: any) => formatProduct(p.toObject()));

  // Cache catalog for 300 seconds if no search term
  if (!search) {
    await setCache(cacheKey, formatted, 300);
  }

  res.json(formatted);
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

  const product = await Product.create({
    ...data,
    discountPercentage,
    badge: data.badge ?? null,
    organic: data.organic ?? false,
    active: data.active ?? true,
    description: data.description ?? null,
  });

  await invalidateCache("products:*");

  res.status(201).json(formatProduct(product.toObject()));
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const product = await Product.findOne({ id: parsed.data.id });
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product.toObject()));
});

// PUT /api/products/:id
router.put("/products/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateProductParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
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

  const updateData: any = { ...data };
  if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage;

  const product = await Product.findOneAndUpdate({ id: paramsParsed.data.id }, { $set: updateData }, { new: true });

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await invalidateCache("products:*");
  res.json(formatProduct(product.toObject()));
});

// DELETE /api/products/:id
router.delete("/products/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteProductParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const product = await Product.findOneAndDelete({ id: parsed.data.id });
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await invalidateCache("products:*");
  res.status(204).end();
});

export default router;
