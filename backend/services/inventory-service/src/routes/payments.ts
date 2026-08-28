import { Router } from "express";
import { db, paymentsTable, ordersTable } from "../lib/db.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// POST /api/payments/verify - Verify test payment token & OTP
router.post("/payments/verify", requireAuth, async (req, res) => {
  const { orderId, paymentMethod, paymentId, otp, amount } = req.body;

  if (!orderId || !paymentMethod) {
    res.status(400).json({ error: "orderId and paymentMethod are required" });
    return;
  }

  // Simulated OTP check for Cards: '123456' succeeds, any other code triggers decline
  if (paymentMethod === "card" && otp && otp !== "123456") {
    res.status(400).json({ error: "Invalid 3D Secure OTP authentication code. Payment declined." });
    return;
  }

  try {
    const txId = paymentId || `pay_test_${Math.floor(Math.random() * 90000000 + 10000000)}`;

    // 1. Record payment transaction
    const [paymentRecord] = await db
      .insert(paymentsTable)
      .values({
        orderId: Number(orderId),
        paymentId: txId,
        paymentMethod: paymentMethod as any,
        amount: Number(amount || 0),
        status: "captured",
        transactionSignature: `sig_sunotal_test_${Date.now()}`,
      })
      .returning();

    // 2. Update order paymentStatus to 'paid'
    await db
      .update(ordersTable)
      .set({
        paymentStatus: "paid",
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, Number(orderId)));

    res.json({
      success: true,
      message: "Payment captured successfully",
      paymentId: txId,
      status: "captured",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ error: "Failed to verify test payment transaction" });
  }
});

export default router;
