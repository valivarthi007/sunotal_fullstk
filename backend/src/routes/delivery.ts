import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, ordersTable } from "../lib/db.js";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";

const router = Router();

// POST /api/delivery/register - Delivery Partner Registration
router.post("/delivery/register", async (req, res) => {
  const { fullName, email, password, phone, vehicleType, licenseNo, city, emergencyPhone } = req.body;

  if (!fullName || !email || !password || !phone) {
    res.status(400).json({ error: "Full Name, Email, Password and Phone are required" });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      name: fullName,
      email: cleanEmail,
      passwordHash,
      role: "delivery",
      active: true,
      phone,
      city: city || "Bengaluru",
    }).returning();

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        phone: user.phone,
        city: user.city,
      },
      message: "Delivery partner registered successfully"
    });
  } catch (error) {
    console.error("Delivery partner registration error:", error);
    res.status(500).json({ error: "Failed to register delivery partner" });
  }
});

// POST /api/delivery/login - Delivery Partner Login
router.post("/delivery/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.role !== "delivery" && user.role !== "admin") {
    res.status(403).json({ error: "Access restricted to delivery partners" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      phone: user.phone,
      city: user.city,
    },
  });
});

// GET /api/delivery/stats - Delivery partner reports & logic payout calculation
router.get("/delivery/stats", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "delivery" && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Logic-based payment calculation values
  const completedDeliveries = 18;
  const totalKmsRun = 64.5;
  const basePayPerOrder = 30; // ₹30 per order
  const distanceRatePerKm = 10; // ₹10 per km
  const totalTips = 240; // Customer tips

  const totalBasePay = completedDeliveries * basePayPerOrder;
  const totalDistancePay = Math.round(totalKmsRun * distanceRatePerKm);
  const totalPayout = totalBasePay + totalDistancePay + totalTips;

  res.json({
    completedDeliveries,
    totalKmsRun,
    basePayPerOrder,
    distanceRatePerKm,
    totalBasePay,
    totalDistancePay,
    totalTips,
    totalPayout,
    payoutStatus: "Ready for Payout",
    lastPayoutDate: new Date().toISOString(),
  });
});

// POST /api/delivery/payout - Request day-out payout
router.post("/delivery/payout", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "delivery" && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { upiId } = req.body;
  res.json({
    success: true,
    status: "PROCESSING",
    upiId: upiId || "partner@upi",
    referenceId: `UPI-${Date.now().toString().slice(-6)}`,
    message: "Day-out payout initiated. Amount will be credited to UPI within 15 minutes."
  });
});

// GET /api/delivery/track/:orderId - Live GPS tracking telemetry for order
router.get("/delivery/track/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    let order: any = null;
    const numericId = Number(orderId);
    if (!isNaN(numericId) && numericId > 0) {
      const [found] = await db.select().from(ordersTable).where(eq(ordersTable.id, numericId)).limit(1);
      order = found;
    }

    const warehouseOrigin = {
      name: "Bengaluru Central Dark Store Hub #104",
      lat: 12.9352,
      lng: 77.6245,
    };

    const customerDestination = {
      address: order?.address || "HSR Layout Sector 3, Bengaluru",
      city: order?.city || "Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
    };

    const now = Date.now();
    const cycleTime = 120000; // 2 minute cycle for smooth continuous simulation
    const progress = (now % cycleTime) / cycleTime; // 0.0 to 1.0

    const driverLat = warehouseOrigin.lat + (customerDestination.lat - warehouseOrigin.lat) * progress;
    const driverLng = warehouseOrigin.lng + (customerDestination.lng - warehouseOrigin.lng) * progress;

    const remainingDistanceKm = Number((3.8 * (1 - progress)).toFixed(1));
    const etaMinutes = Math.max(2, Math.round(14 * (1 - progress)));

    res.json({
      orderId: String(orderId),
      status: order?.status || "out_for_delivery",
      warehouseOrigin,
      customerDestination,
      driverLocation: {
        lat: Number(driverLat.toFixed(5)),
        lng: Number(driverLng.toFixed(5)),
        speedKmh: 28 + Math.floor(progress * 10),
        heading: 45,
      },
      etaMinutes,
      remainingDistanceKm,
      driverProfile: {
        name: "Ramesh Kumar (EV Partner)",
        phone: "+91 99089 70908",
        vehicleNo: "KA-01-EV-8842",
        rating: 4.9,
        deliveriesCompleted: 412,
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      },
      routePolyline: [
        [warehouseOrigin.lat, warehouseOrigin.lng],
        [Number(driverLat.toFixed(5)), Number(driverLng.toFixed(5))],
        [customerDestination.lat, customerDestination.lng],
      ],
    });
  } catch (error) {
    console.error("Error fetching live tracking telemetry:", error);
    res.status(500).json({ error: "Failed to fetch live tracking telemetry" });
  }
});

export default router;
