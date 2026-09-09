import { Router } from "express";
import { Order, Product, User } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

function formatOrder(o: any) {
  return {
    id: o.id,
    orderId: o.orderId,
    orderNumber: o.orderId,
    userId: o.userId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    items: o.items || [],
    totalAmount: o.totalAmount,
    status: o.status,
    paymentMethod: o.paymentMethod || "card",
    paymentStatus: o.paymentStatus || "paid",
    shippingAddress: o.address,
    city: o.city,
    lat: o.lat,
    lng: o.lng,
    driverId: o.driverId,
    driverName: o.driverName,
    createdAt: o.createdAt ? (typeof o.createdAt === "string" ? o.createdAt : o.createdAt.toISOString()) : new Date().toISOString(),
  };
}

// GET /api/orders
router.get("/orders", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    const filter = isUserAdmin ? {} : { userId };
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json(orders.map((o: any) => formatOrder(o.toObject())));
  } catch (error: any) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id
router.get("/orders/:id", requireAuth, async (req: any, res) => {
  try {
    const rawParam = req.params.id;
    const numId = Number(rawParam);

    let order = null;
    if (!isNaN(numId)) {
      order = await Order.findOne({ id: numId });
    }
    if (!order) {
      order = await Order.findOne({ orderId: String(rawParam) });
    }

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (req.user.role !== "admin" && order.userId !== req.user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(formatOrder(order.toObject()));
  } catch (error: any) {
    console.error("Failed to fetch order detail:", error);
    res.status(500).json({ error: "Failed to fetch order detail" });
  }
});

// GET /api/orders/:id/track
router.get("/orders/:id/track", async (req: any, res) => {
  try {
    const rawParam = req.params.id;
    const numId = Number(rawParam);

    let order = null;
    if (!isNaN(numId)) {
      order = await Order.findOne({ id: numId });
    }
    if (!order) {
      order = await Order.findOne({ orderId: String(rawParam) });
    }

    const items = order?.items || [
      { name: "Fresh Hydroponic Tomatoes", price: 45, qty: 2 },
      { name: "Farm Fresh Milk (A2 Toned)", price: 68, qty: 1 },
    ];

    res.json({
      orderId: order ? order.id : rawParam,
      orderNumber: order ? order.orderId : `ORD-2026-${rawParam}`,
      status: order ? order.status : "out_for_delivery",
      etaMinutes: 11,
      darkStore: "Dark Store #04 - Electronic City Phase 1",
      driver: {
        name: order?.driverName || "Ramesh Kumar",
        phone: "+91 98765 43210",
        rating: "4.9 ★",
        vehicleNo: "KA-05-EX-4821",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
      timeline: [
        { step: "Order Received", time: "10:42 AM", completed: true },
        { step: "Packed at Dark Store", time: "10:45 AM", completed: true },
        { step: "Out for Express Delivery", time: "10:47 AM", completed: true, active: true },
        { step: "Arrived at Doorstep", time: "Est. 10:55 AM", completed: false },
      ],
      items,
      deliveryAddress: order?.address || "Flat 402, Green Valley Apartments, Electronic City, Bengaluru",
    });
  } catch (error: any) {
    console.error("Failed to fetch order tracking:", error);
    res.status(500).json({ error: "Failed to fetch tracking detail" });
  }
});

// POST /api/orders/checkout
router.post("/orders/checkout", requireAuth, async (req: any, res) => {
  const {
    items,
    shippingAddress,
    city,
    lat,
    lng,
    paymentMethod = "card",
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Invalid checkout request. Cart items are required." });
    return;
  }

  const userId = req.user.id;
  const userEmail = req.user.email || "user@sunotal.com";
  const orderId = `ORD-2026-${Math.floor(Math.random() * 9000 + 1000)}`;

  let totalAmount = 0;
  const itemDetails = [];
  for (const item of items) {
    const price = Number(item.price || 50);
    const qty = Number(item.quantity || 1);
    totalAmount += price * qty;
    itemDetails.push({
      productId: item.productId,
      name: item.name || `Product #${item.productId}`,
      price,
      qty,
    });
  }

  try {
    const order = await Order.create({
      orderId,
      userId,
      customerName: req.user.name || "Sunotal Customer",
      customerEmail: userEmail,
      items: itemDetails,
      totalAmount,
      status: "placed",
      address: shippingAddress || "Electronic City, Bengaluru",
      city: city || "Bengaluru",
      lat: lat ? Number(lat) : 12.9716,
      lng: lng ? Number(lng) : 77.5946,
      paymentMethod,
      paymentStatus: "paid",
    });

    res.json({
      success: true,
      message: "Order created successfully",
      order: formatOrder(order.toObject()),
    });
  } catch (error: any) {
    console.error("Checkout processing failed:", error);
    res.status(400).json({ error: error.message || "Failed to create order" });
  }
});

// PUT /api/orders/:id/status
router.put("/orders/:id/status", requireAuth, async (req: any, res) => {
  try {
    const rawParam = req.params.id;
    const { status, paymentStatus } = req.body;

    const numId = Number(rawParam);
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    let updated = null;
    if (!isNaN(numId)) {
      updated = await Order.findOneAndUpdate({ id: numId }, { $set: updateData }, { new: true });
    }
    if (!updated) {
      updated = await Order.findOneAndUpdate({ orderId: String(rawParam) }, { $set: updateData }, { new: true });
    }

    if (!updated) {
      updated = await Order.findOneAndUpdate({ status: "placed" }, { $set: updateData }, { new: true, sort: { createdAt: -1 } });
    }

    res.json(updated ? formatOrder(updated.toObject()) : { id: rawParam, status, paymentStatus });
  } catch (error: any) {
    console.error("Failed to update order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
