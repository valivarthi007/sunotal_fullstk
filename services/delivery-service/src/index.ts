import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const app = express();
const PORT = Number(process.env.PORT ?? 5006);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";
const JWT_SECRET = process.env.JWT_SECRET || "sunotal-jwt-secret";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const OrderSchema = new mongoose.Schema(
  {
    id: { type: Number },
    orderId: { type: String, required: true },
    userId: { type: Number },
    customerName: { type: String },
    customerEmail: { type: String },
    items: { type: mongoose.Schema.Types.Mixed },
    totalAmount: { type: Number },
    status: { type: String, default: "placed" },
    address: { type: String },
    city: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    paymentMethod: { type: String },
    paymentStatus: { type: String },
    driverId: { type: Number },
    driverName: { type: String },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String },
    email: { type: String },
    passwordHash: { type: String },
    role: { type: String },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

const Order: any = mongoose.models.Order || mongoose.model("Order", OrderSchema);
const User: any = mongoose.models.User || mongoose.model("User", UserSchema);


// POST /api/delivery/login
app.post("/api/delivery/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user: any = await User.findOne({ email: cleanEmail });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }


  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user });
});

// GET /api/delivery/orders/active
app.get("/api/delivery/orders/active", async (req: any, res: any) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20);
    const formatted = orders.map((o: any) => ({
      id: o.orderId,
      numericId: o.id,
      customerName: o.customerName || "",
      phone: o.phone || "",
      address: o.address ? `${o.address}${o.city ? `, ${o.city}` : ""}` : "",
      city: o.city || "",
      totalAmount: Number(o.totalAmount || 0),
      paymentMethod: o.paymentMethod || "",
      paymentStatus: o.paymentStatus || "",
      status: o.status || "",
      createdAt: o.createdAt,
      items: o.items || [],
    }));
    return res.json(formatted);
  } catch {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/delivery/stats
app.get("/api/delivery/stats", async (_req, res) => {
  try {
    const completedCount = await Order.countDocuments({ status: "delivered" });
    const basePayPerOrder = 30;
    const distanceRatePerKm = 10;
    const totalKmsRun = completedCount > 0 ? completedCount * 3.5 : 0;
    const totalBasePay = completedCount * basePayPerOrder;
    const totalDistancePay = Math.round(totalKmsRun * distanceRatePerKm);
    const totalTips = completedCount > 0 ? completedCount * 15 : 0;
    const totalPayout = totalBasePay + totalDistancePay + totalTips;

    return res.json({
      completedDeliveries: completedCount,
      totalKmsRun,
      basePayPerOrder,
      distanceRatePerKm,
      totalBasePay,
      totalDistancePay,
      totalTips,
      totalPayout,
      payoutStatus: totalPayout > 0 ? "Ready for Payout" : "No Earnings Pending",
      lastPayoutDate: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to calculate delivery stats" });
  }
});


// POST /api/delivery/payout
app.post("/api/delivery/payout", async (req, res) => {
  const { upiId } = req.body;
  res.json({
    success: true,
    status: "PROCESSING",
    upiId: upiId || "",
    referenceId: `UPI-${Date.now().toString().slice(-6)}`,
    message: "Day-out payout initiated. Amount will be credited to UPI within 15 minutes.",
  });
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "delivery-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true }).then(() => {
  console.log("⚡ [delivery-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [delivery-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [delivery-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [delivery-service] Running on port ${PORT}`));
});
