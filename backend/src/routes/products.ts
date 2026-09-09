import { Router } from "express";
import { db, productsTable, inventoryTable, vendorsTable, warehousesTable } from "../lib/db.js";
import { eq, ilike, and, desc, asc, SQL, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  ListProductsQueryParams,
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "../lib/schemas.js";

const router = Router();
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || "us-east-1" });

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function formatProduct(p: any, isUnserviceable: boolean = false, distanceKm?: number) {
  const rawStock = Number(p.stock) || 0;
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
    location: p.locations || null,
    stock: effectiveStock,
    inStock: isAvailable,
    stockStatus: isUnserviceable ? "unserviceable_radius" : isAvailable ? "in_stock" : "out_of_stock",
    proximityKm: distanceKm !== undefined ? distanceKm : null,
  };
}

// GET /api/products
router.get("/products", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  const { category, search, organic, sort, all } = parsed.success ? parsed.data : {};

  // Extract user coordinates for dark store proximity stock calculation
  const reqLat = req.query.lat ? Number(req.query.lat) : undefined;
  const reqLng = req.query.lng ? Number(req.query.lng) : undefined;

  let minDistance = 0;
  let isUnserviceable = false;

  if (reqLat !== undefined && reqLng !== undefined && !isNaN(reqLat) && !isNaN(reqLng)) {
    try {
      const activeWarehouses = await db.select().from(warehousesTable).where(eq(warehousesTable.isActive, true));
      if (activeWarehouses.length > 0) {
        let nearest = activeWarehouses[0];
        let minD = haversineDistanceKm(reqLat, reqLng, nearest.latitude, nearest.longitude);
        for (const wh of activeWarehouses) {
          const d = haversineDistanceKm(reqLat, reqLng, wh.latitude, wh.longitude);
          if (d < minD) {
            minD = d;
            nearest = wh;
          }
        }
        minDistance = minD;
        const maxRadius = nearest.maxServiceRadiusKm || 70;
        if (minDistance > maxRadius) {
          isUnserviceable = true;
        }
      }
    } catch (e) {
      console.error("Proximity calculation error:", e);
    }
  }

  const conditions: SQL[] = [];
  if (!all) {
    conditions.push(eq(productsTable.active, true));
  }
  if (category) conditions.push(eq(productsTable.category, category as any));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (organic !== undefined) conditions.push(eq(productsTable.organic, organic));

  const query = db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      category: productsTable.category,
      unit: productsTable.unit,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      discountPercentage: productsTable.discountPercentage,
      image: productsTable.image,
      badge: productsTable.badge,
      organic: productsTable.organic,
      active: productsTable.active,
      description: productsTable.description,
      createdAt: productsTable.createdAt,
      locations: sql<string>`string_agg(DISTINCT ${vendorsTable.location}, ', ')`.as("locations"),
      stock: sql<number>`COALESCE(SUM(${inventoryTable.quantity}), 0)::integer`.as("stock"),
    })
    .from(productsTable)
    .leftJoin(inventoryTable, eq(productsTable.id, inventoryTable.productId))
    .leftJoin(vendorsTable, eq(inventoryTable.vendorId, vendorsTable.id))
    .where(and(...conditions))
    .groupBy(productsTable.id);

  const sortedQuery = sort === "price_asc"
    ? query.orderBy(asc(productsTable.price))
    : sort === "price_desc"
    ? query.orderBy(desc(productsTable.price))
    : sort === "newest"
    ? query.orderBy(desc(productsTable.createdAt))
    : query.orderBy(desc(productsTable.createdAt));

  const products = await sortedQuery;

  res.json(products.map(p => formatProduct(p, isUnserviceable, reqLat !== undefined ? minDistance : undefined)));
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
    .select({
      id: productsTable.id,
      name: productsTable.name,
      category: productsTable.category,
      unit: productsTable.unit,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      discountPercentage: productsTable.discountPercentage,
      image: productsTable.image,
      badge: productsTable.badge,
      organic: productsTable.organic,
      active: productsTable.active,
      description: productsTable.description,
      createdAt: productsTable.createdAt,
      locations: sql<string>`string_agg(DISTINCT ${vendorsTable.location}, ', ')`.as("locations"),
      stock: sql<number>`COALESCE(SUM(${inventoryTable.quantity}), 0)::integer`.as("stock"),
    })
    .from(productsTable)
    .leftJoin(inventoryTable, eq(productsTable.id, inventoryTable.productId))
    .leftJoin(vendorsTable, eq(inventoryTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.id, parsed.data.id))
    .groupBy(productsTable.id)
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

  // 1. Fetch product to check if it exists and retrieve its image
  const [product] = await db
    .select({ image: productsTable.image })
    .from(productsTable)
    .where(eq(productsTable.id, parsed.data.id))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // 2. Trigger Lambda function to delete object from S3 if it exists and is an S3 URL
  if (product.image && (product.image.startsWith("http://") || product.image.startsWith("https://"))) {
    try {
      const url = new URL(product.image);
      const key = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
      const bucket = process.env.S3_BUCKET_NAME || "jcs-raju-sunotal-final";
      const functionName = process.env.DELETE_LAMBDA_FUNCTION_NAME || "sunotal-delete-s3-object";

      console.log(`[Lambda] Triggering ${functionName} for S3 object deletion (bucket: ${bucket}, key: ${key})`);
      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify({ bucket, key }),
      });
      await lambdaClient.send(command);
      console.log(`[Lambda] Successfully invoked deletion Lambda for key: ${key}`);
    } catch (err) {
      console.error("[Lambda] Failed to invoke deletion Lambda:", err);
    }
  }

  // 3. Delete from database
  await db
    .delete(productsTable)
    .where(eq(productsTable.id, parsed.data.id));

  res.status(204).end();
});

export default router;
