import { Router } from "express";
import { db, inventoryTable, productsTable } from "../lib/db.js";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// POST /api/orders/checkout - Real inventory deduction endpoint
router.post("/orders/checkout", requireAuth, async (req, res) => {
  const { items } = req.body; // Array of { productId: number, quantity: number }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Invalid checkout request. Cart items are required." });
    return;
  }

  try {
    // Perform checking and deduction in a transaction or sequential operations
    await db.transaction(async (tx) => {
      for (const item of items) {
        const prodId = Number(item.productId);
        const reqQty = Number(item.quantity);

        // 1. Fetch active catalog product name
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, prodId)).limit(1);
        const prodName = product ? product.name : `Product #${prodId}`;

        // 2. Fetch all inventory records for this product that have stock
        const stockRecords = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.productId, prodId))
          .orderBy(asc(inventoryTable.createdAt));

        const totalAvailable = stockRecords.reduce((sum, r) => sum + r.quantity, 0);

        if (totalAvailable < reqQty) {
          throw new Error(`Insufficient stock for ${prodName}. Available: ${totalAvailable}, Requested: ${reqQty}`);
        }

        // 3. Deduct stock using FIFO (First In, First Out)
        let remainingToDeduct = reqQty;
        for (const record of stockRecords) {
          if (remainingToDeduct <= 0) break;

          if (record.quantity >= remainingToDeduct) {
            const newQty = record.quantity - remainingToDeduct;
            const newStatus = newQty === 0 ? "out_of_stock" : (newQty < 5 ? "low_stock" : "in_stock");
            
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
    });

    res.json({ success: true, message: "Stock successfully deducted and order placed." });
  } catch (error: any) {
    console.error("Checkout inventory deduction failed:", error);
    res.status(400).json({ error: error.message || "Failed to process stock deduction during checkout" });
  }
});

export default router;
