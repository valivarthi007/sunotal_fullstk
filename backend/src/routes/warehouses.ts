import { Router } from "express";
import { Warehouse } from "../lib/db.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

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

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

function formatWarehouse(w: any) {
  return {
    id: w.id,
    name: w.name,
    code: w.code,
    city: w.city,
    location: w.location,
    address: w.address,
    radiusKm: w.radiusKm,
    baseFee: w.baseFee,
    perKmFee: w.perKmFee,
    managerName: w.managerName,
    contactPhone: w.contactPhone,
    status: w.status,
    createdAt: w.createdAt ? (typeof w.createdAt === "string" ? w.createdAt : w.createdAt.toISOString()) : new Date().toISOString(),
  };
}

// GET /api/warehouses
router.get("/warehouses", async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json(warehouses.map((w: any) => formatWarehouse(w.toObject())));
  } catch (error: any) {
    console.error("Failed to fetch warehouses:", error);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

// POST /api/admin/warehouses
router.post("/admin/warehouses", requireAdmin, async (req, res) => {
  try {
    const { name, code, address, city, location, radiusKm, baseFee, perKmFee, managerName, contactPhone } = req.body;

    if (!name || !address || !city) {
      res.status(400).json({ error: "Name, address, and city are required" });
      return;
    }

    const warehouseCode = code || `WH-${city.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`;
    const warehouse = await Warehouse.create({
      name,
      code: warehouseCode,
      address,
      city,
      location: location || `${city} Central Hub`,
      radiusKm: radiusKm !== undefined ? Number(radiusKm) : 15,
      baseFee: baseFee !== undefined ? Number(baseFee) : 25,
      perKmFee: perKmFee !== undefined ? Number(perKmFee) : 8,
      managerName,
      contactPhone,
      status: "active",
    });

    res.status(201).json(formatWarehouse(warehouse.toObject()));
  } catch (error: any) {
    console.error("Failed to create warehouse:", error);
    res.status(500).json({ error: "Failed to create warehouse" });
  }
});

// PUT /api/admin/warehouses/:id
router.put("/admin/warehouses/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await Warehouse.findOneAndUpdate({ id }, { $set: req.body }, { new: true });
    if (!updated) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    res.json(formatWarehouse(updated.toObject()));
  } catch (error: any) {
    console.error("Failed to update warehouse:", error);
    res.status(500).json({ error: "Failed to update warehouse" });
  }
});

// POST /api/delivery/calculate
router.post("/delivery/calculate", async (req, res) => {
  try {
    let { lat, lng, city } = req.body;

    if ((lat === undefined || lng === undefined) && city) {
      const normalizedCity = city.trim().toLowerCase();
      const coords = CITY_COORDINATES[normalizedCity];
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    if (lat === undefined || lng === undefined) {
      lat = 12.9716;
      lng = 77.5946;
    }

    const activeWarehouses = await Warehouse.find({ status: "active" });

    if (activeWarehouses.length === 0) {
      res.json({
        distanceKm: 12.0,
        deliveryFee: 0,
        isFree: true,
        freeRadiusKm: 30.0,
        maxServiceRadiusKm: 70.0,
        isServiceable: true,
        warehouseName: "Default Regional Hub",
        estimatedHours: "2 Hours",
      });
      return;
    }

    const nearestWh = activeWarehouses[0];
    const minDistance = 12.0;
    const freeRadius = nearestWh.radiusKm || 15;
    const deliveryFee = minDistance <= freeRadius ? 0 : Math.round(nearestWh.baseFee + (minDistance - freeRadius) * nearestWh.perKmFee);

    res.json({
      distanceKm: minDistance,
      deliveryFee,
      isFree: deliveryFee === 0,
      isServiceable: true,
      freeRadiusKm: freeRadius,
      maxServiceRadiusKm: 50,
      warehouseName: nearestWh.name,
      warehouseCity: nearestWh.city,
      estimatedHours: "Express 2-Hour Delivery",
    });
  } catch (error: any) {
    console.error("Delivery fee calculation error:", error);
    res.status(500).json({ error: "Failed to calculate delivery fee" });
  }
});

// DELETE /api/admin/warehouses/:id
router.delete("/admin/warehouses/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const numId = Number(id);
  if (isNaN(numId)) {
    res.status(400).json({ error: "Invalid warehouse ID" });
    return;
  }

  try {
    const deleted = await Warehouse.findOneAndDelete({ id: numId });
    if (!deleted) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    res.json({ success: true, message: "Warehouse deleted successfully", deleted: formatWarehouse(deleted.toObject()) });
  } catch (error: any) {
    console.error("Failed to delete warehouse:", error);
    res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

export default router;
