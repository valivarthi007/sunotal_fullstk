import { Router } from "express";
import { db, inventoryTable, productsTable, ordersTable, orderItemsTable } from "../lib/db.js";
import { eq, and, asc, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

// GET /api/orders - Fetch user order history with full items breakdown
router.get("/orders", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const isUserAdmin = req.user.role === "admin";

    // Admins see all orders; regular users see their own orders
    const orders = isUserAdmin
      ? await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt))
      : await db.select().from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(desc(ordersTable.createdAt));

    // Attach order items for each order
    const result = [];
    for (const order of orders) {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      result.push({
        ...order,
        items,
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id - Fetch single order detail
router.get("/orders/:id", requireAuth, async (req: any, res) => {
  try {
    const orderId = Number(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Verify ownership (unless admin)
    if (req.user.role !== "admin" && order.userId !== req.user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

    res.json({
      ...order,
      items,
    });
  } catch (error: any) {
    console.error("Failed to fetch order detail:", error);
    res.status(500).json({ error: "Failed to fetch order detail" });
  }
});

// POST /api/orders/checkout - Real inventory deduction & DB order creation
router.post("/orders/checkout", requireAuth, async (req: any, res) => {
  const {
    items,
    shippingAddress,
    city,
    state,
    pincode,
    deliveryFee = 0,
    corporateGstin,
    corporatePoRef,
    paymentMethod = "card",
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Invalid checkout request. Cart items are required." });
    return;
  }

  const userId = req.user.id;
  const orderNum = `SUN-2026-${Math.floor(Math.random() * 9000 + 1000)}`;

  try {
    let newOrder: any = null;
    let orderItemsCreated: any[] = [];

    await db.transaction(async (tx) => {
      let subtotal = 0;

      // 1. Process items and verify/deduct inventory via FIFO
      const itemDetails = [];
      for (const item of items) {
        const prodId = Number(item.productId);
        const reqQty = Number(item.quantity);

        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, prodId)).limit(1);
        const prodName = product ? product.name : `Product #${prodId}`;
        const prodPrice = product ? product.price : (item.price || 50);

        const itemSubtotal = prodPrice * reqQty;
        subtotal += itemSubtotal;

        itemDetails.push({
          productId: prodId,
          productName: prodName,
          unitPrice: prodPrice,
          quantity: reqQty,
          subtotal: itemSubtotal,
        });

        // Deduct inventory stock if stock records exist
        const stockRecords = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.productId, prodId))
          .orderBy(asc(inventoryTable.createdAt));

        let remainingToDeduct = reqQty;
        for (const record of stockRecords) {
          if (remainingToDeduct <= 0) break;

          if (record.quantity >= remainingToDeduct) {
            const newQty = record.quantity - remainingToDeduct;
            const newStatus = newQty === 0 ? "out_of_stock" : newQty < 5 ? "low_stock" : "in_stock";
            await tx
              .update(inventoryTable)
              .set({ quantity: newQty, status: newStatus as any, updatedAt: new Date() })
              .where(eq(inventoryTable.id, record.id));
            remainingToDeduct = 0;
          } else {
            remainingToDeduct -= record.quantity;
            await tx
              .update(inventoryTable)
              .set({ quantity: 0, status: "out_of_stock", updatedAt: new Date() })
              .where(eq(inventoryTable.id, record.id));
          }
        }
      }

      // 2. Calculate taxes and totals
      const gstAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST on produce
      const finalAmount = Math.round((subtotal + gstAmount + Number(deliveryFee)) * 100) / 100;
      const estDelivery = Number(deliveryFee) === 0 ? "Express 2-Hour Delivery" : "Standard 24-Hour Delivery";

      // 3. Create persistent order record
      const [order] = await tx
        .insert(ordersTable)
        .values({
          orderNumber: orderNum,
          userId,
          totalAmount: subtotal,
          discountAmount: 0,
          deliveryFee: Number(deliveryFee),
          gstAmount,
          finalAmount,
          status: "processing",
          paymentStatus: "unpaid",
          paymentMethod: paymentMethod as any,
          shippingAddress: shippingAddress || "Corporate Hub, Electronic City",
          city: city || "Bengaluru",
          state: state || "Karnataka",
          pincode: pincode || "560100",
          corporateGstin: corporateGstin || null,
          corporatePoRef: corporatePoRef || null,
          trackingNumber: `TRK-${Date.now().toString().slice(-8)}`,
          estimatedDelivery: estDelivery,
        })
        .returning();

      newOrder = order;

      // 4. Create order items records
      for (const itemDetail of itemDetails) {
        const [createdItem] = await tx
          .insert(orderItemsTable)
          .values({
            orderId: order.id,
            productId: itemDetail.productId,
            productName: itemDetail.productName,
            unitPrice: itemDetail.unitPrice,
            quantity: itemDetail.quantity,
            subtotal: itemDetail.subtotal,
          })
          .returning();
        orderItemsCreated.push(createdItem);
      }
    });

    res.json({
      success: true,
      message: "Order created successfully",
      order: {
        ...newOrder,
        items: orderItemsCreated,
      },
    });
  } catch (error: any) {
    console.error("Checkout processing failed:", error);
    res.status(400).json({ error: error.message || "Failed to create order" });
  }
});

// PUT /api/orders/:id/status - Admin status updater
router.put("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status, paymentStatus } = req.body;

    const [updated] = await db
      .update(ordersTable)
      .set({
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Failed to update order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// POST /api/orders/:id/cancel - Order cancellation with inventory restoration
router.post("/orders/:id/cancel", requireAuth, async (req: any, res) => {
  try {
    const orderId = Number(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (req.user.role !== "admin" && order.userId !== req.user.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (order.status === "cancelled" || order.status === "delivered") {
      res.status(400).json({ error: `Cannot cancel order in status '${order.status}'` });
      return;
    }

    // Restore stock and update status
    await db.transaction(async (tx) => {
      const items = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

      for (const item of items) {
        const stockRecords = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.productId, item.productId))
          .limit(1);

        if (stockRecords.length > 0) {
          const rec = stockRecords[0];
          await tx
            .update(inventoryTable)
            .set({ quantity: rec.quantity + item.quantity, status: "in_stock", updatedAt: new Date() })
            .where(eq(inventoryTable.id, rec.id));
        }
      }

      await tx
        .update(ordersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));
    });

    res.json({ success: true, message: "Order cancelled and stock restored successfully" });
  } catch (error: any) {
    console.error("Failed to cancel order:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

export default router;
