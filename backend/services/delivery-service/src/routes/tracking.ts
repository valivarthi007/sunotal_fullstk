import { Router } from "express";
import { db, ordersTable, warehousesTable } from "../lib/db.js";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/delivery/slots - Return available delivery windows
router.get("/delivery/slots", (req, res) => {
  const slots = [
    { id: "express_2hr", name: "Express 2-Hour Delivery", price: 0, tag: "RECOMMENDED", description: "Delivered within 120 minutes of packing" },
    { id: "today_morning", name: "Today Morning (7:00 AM - 9:00 AM)", price: 0, tag: "POPULAR", description: "Farm fresh morning harvest" },
    { id: "today_evening", name: "Today Evening (5:00 PM - 7:00 PM)", price: 0, tag: "CONVENIENT", description: "Post-work delivery window" },
    { id: "tomorrow_morning", name: "Tomorrow Morning (7:00 AM - 9:00 AM)", price: 0, tag: "EARLY HARVEST", description: "Plucked fresh tomorrow dawn" },
  ];
  res.json(slots);
});

// GET /api/delivery/track/:orderId - Return live driver GPS tracking telemetry & vector route
router.get("/delivery/track/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    // 1. Fetch order details
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderId))
      .limit(1);

    // Fallback coordinates
    const customerLat = order ? (order.customerLat || 12.9716) : 12.9716;
    const customerLng = order ? (order.customerLng || 77.5946) : 77.5946;

    // Origin Warehouse: Indiranagar Hub
    const originLat = 12.9783;
    const originLng = 77.6408;

    // Calculate elapsed time progression for driver simulation
    const now = Date.now();
    const elapsedMinutes = ((now / 1000) % 300) / 10; // 0 to 30 cycle
    const progressFraction = Math.min(0.85, Math.max(0.15, elapsedMinutes / 30));

    // Interpolate driver current GPS coordinates along vector route
    const currentDriverLat = originLat + (customerLat - originLat) * progressFraction;
    const currentDriverLng = originLng + (customerLng - originLng) * progressFraction;

    const remainingKm = Math.round((1 - progressFraction) * 8.4 * 10) / 10;
    const etaMinutes = Math.max(4, Math.round(remainingKm * 3.5));

    res.json({
      orderId,
      status: order ? order.status : "processing",
      warehouseOrigin: {
        name: "Bengaluru Central Fulfillment Hub",
        lat: originLat,
        lng: originLng,
      },
      customerDestination: {
        address: order ? order.shippingAddress : "Electronic City Phase 1",
        city: order ? order.city : "Bengaluru",
        lat: customerLat,
        lng: customerLng,
      },
      driverLocation: {
        lat: currentDriverLat,
        lng: currentDriverLng,
        speedKmh: 28,
        heading: 142,
      },
      etaMinutes,
      remainingDistanceKm: remainingKm,
      driverProfile: {
        name: order?.driverName || "Ramesh Kumar",
        phone: order?.driverPhone || "+91 98765 43210",
        vehicleNo: order?.vehicleNo || "EV-DEL-4412",
        rating: 4.9,
        deliveriesCompleted: 1420,
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      },
      routePolyline: [
        [originLat, originLng],
        [originLat - 0.005, originLng - 0.002],
        [currentDriverLat, currentDriverLng],
        [customerLat, customerLng],
      ],
    });
  } catch (error: any) {
    console.error("Delivery tracking error:", error);
    res.status(500).json({ error: "Failed to fetch delivery tracking data" });
  }
});

export default router;
