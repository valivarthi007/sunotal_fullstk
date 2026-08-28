import { Router } from "express";
import { db, warehousesTable } from "../lib/db.js";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

// Standard major city fallback coordinates if GPS is unavailable
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "delhi ncr": { lat: 28.6139, lng: 77.2090 },
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
};

/**
 * Haversine formula to compute distance in km between two (lat, lng) points
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/warehouses - List all active warehouses
router.get("/warehouses", async (req, res) => {
  try {
    const warehouses = await db.select().from(warehousesTable).orderBy(desc(warehousesTable.createdAt));
    
    // Seed default warehouse if none exist
    if (warehouses.length === 0) {
      const [defaultWh] = await db
        .insert(warehousesTable)
        .values({
          name: "Bengaluru Central Fulfillment Hub",
          address: "100 Feet Rd, Indiranagar",
          city: "Bengaluru",
          latitude: 12.9716,
          longitude: 77.5946,
          freeDeliveryRadiusKm: 25.0,
          baseDeliveryFee: 50.0,
          perKmRate: 8.0,
          maxServiceRadiusKm: 150.0,
          isActive: true,
        })
        .returning();
      res.json([defaultWh]);
      return;
    }

    res.json(warehouses);
  } catch (error: any) {
    console.error("Failed to fetch warehouses:", error);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

// POST /api/admin/warehouses - Create new warehouse (Admin only)
router.post("/admin/warehouses", requireAdmin, async (req, res) => {
  try {
    const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, baseDeliveryFee, perKmRate } = req.body;

    if (!name || !address || !city || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: "Name, address, city, latitude, and longitude are required" });
      return;
    }

    const [warehouse] = await db
      .insert(warehousesTable)
      .values({
        name,
        address,
        city,
        latitude: Number(latitude),
        longitude: Number(longitude),
        freeDeliveryRadiusKm: freeDeliveryRadiusKm !== undefined ? Number(freeDeliveryRadiusKm) : 25.0,
        baseDeliveryFee: baseDeliveryFee !== undefined ? Number(baseDeliveryFee) : 50.0,
        perKmRate: perKmRate !== undefined ? Number(perKmRate) : 8.0,
        isActive: true,
      })
      .returning();

    res.status(201).json(warehouse);
  } catch (error: any) {
    console.error("Failed to create warehouse:", error);
    res.status(500).json({ error: "Failed to create warehouse" });
  }
});

// PUT /api/admin/warehouses/:id - Update warehouse (Admin only)
router.put("/admin/warehouses/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, baseDeliveryFee, perKmRate, isActive } = req.body;

    const [updated] = await db
      .update(warehousesTable)
      .set({
        name,
        address,
        city,
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
        freeDeliveryRadiusKm: freeDeliveryRadiusKm !== undefined ? Number(freeDeliveryRadiusKm) : undefined,
        baseDeliveryFee: baseDeliveryFee !== undefined ? Number(baseDeliveryFee) : undefined,
        perKmRate: perKmRate !== undefined ? Number(perKmRate) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(warehousesTable.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Failed to update warehouse:", error);
    res.status(500).json({ error: "Failed to update warehouse" });
  }
});

// POST /api/delivery/calculate - Compute distance and dynamic delivery fee
router.post("/delivery/calculate", async (req, res) => {
  try {
    let { lat, lng, city } = req.body;

    // Use city fallback if lat/lng missing
    if ((lat === undefined || lng === undefined) && city) {
      const normalizedCity = city.trim().toLowerCase();
      const coords = CITY_COORDINATES[normalizedCity];
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    // Default to Bengaluru if still undefined
    if (lat === undefined || lng === undefined) {
      lat = 12.9716;
      lng = 77.5946;
    }

    const activeWarehouses = await db
      .select()
      .from(warehousesTable)
      .where(eq(warehousesTable.isActive, true));

    if (activeWarehouses.length === 0) {
      res.json({
        distanceKm: 12.0,
        deliveryFee: 0,
        isFree: true,
        freeRadiusKm: 25.0,
        warehouseName: "Default Regional Hub",
        estimatedHours: "2 Hours",
      });
      return;
    }

    // Find nearest warehouse using Haversine calculation
    let nearestWh = activeWarehouses[0];
    let minDistance = haversineDistanceKm(Number(lat), Number(lng), nearestWh.latitude, nearestWh.longitude);

    for (let i = 1; i < activeWarehouses.length; i++) {
      const d = haversineDistanceKm(Number(lat), Number(lng), activeWarehouses[i].latitude, activeWarehouses[i].longitude);
      if (d < minDistance) {
        minDistance = d;
        nearestWh = activeWarehouses[i];
      }
    }

    const freeRadius = nearestWh.freeDeliveryRadiusKm || 25.0;
    const baseFee = nearestWh.baseDeliveryFee || 50.0;
    const perKm = nearestWh.perKmRate || 8.0;

    let deliveryFee = 0;
    let isFree = false;

    if (minDistance <= freeRadius) {
      deliveryFee = 0;
      isFree = true;
    } else {
      const extraKm = minDistance - freeRadius;
      deliveryFee = Math.round(baseFee + extraKm * perKm);
      isFree = false;
    }

    const estimatedHours = minDistance <= 25 ? "Express 2-Hour Delivery" : "Next-Day Delivery";

    res.json({
      distanceKm: minDistance,
      deliveryFee,
      isFree,
      freeRadiusKm: freeRadius,
      warehouseName: nearestWh.name,
      warehouseCity: nearestWh.city,
      estimatedHours,
    });
  } catch (error: any) {
    console.error("Delivery fee calculation error:", error);
    res.status(500).json({ error: "Failed to calculate delivery fee" });
  }
});

export default router;
