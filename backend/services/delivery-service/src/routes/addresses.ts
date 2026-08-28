import { Router } from "express";
import { db, userAddressesTable } from "../lib/db.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/user/addresses - List user saved addresses
router.get("/user/addresses", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const addresses = await db
      .select()
      .from(userAddressesTable)
      .where(eq(userAddressesTable.userId, userId))
      .orderBy(desc(userAddressesTable.isDefault), desc(userAddressesTable.createdAt));

    res.json(addresses);
  } catch (error: any) {
    console.error("Failed to fetch user addresses:", error);
    res.status(500).json({ error: "Failed to fetch user addresses" });
  }
});

// POST /api/user/addresses - Save new map-pinned address
router.post("/user/addresses", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { tag = "home", houseNo, street, landmark, city, state, pincode, latitude, longitude, isDefault = false } = req.body;

    if (!houseNo || !street || !city || !state || !pincode || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: "HouseNo, street, city, state, pincode, latitude, and longitude are required" });
      return;
    }

    // If setting default, unset existing default
    if (isDefault) {
      await db.update(userAddressesTable).set({ isDefault: false }).where(eq(userAddressesTable.userId, userId));
    }

    const [newAddress] = await db
      .insert(userAddressesTable)
      .values({
        userId,
        tag: tag as any,
        houseNo,
        street,
        landmark: landmark || null,
        city,
        state,
        pincode,
        latitude: Number(latitude),
        longitude: Number(longitude),
        isDefault: Boolean(isDefault),
      })
      .returning();

    res.status(201).json(newAddress);
  } catch (error: any) {
    console.error("Failed to save address:", error);
    res.status(500).json({ error: "Failed to save address" });
  }
});

// DELETE /api/user/addresses/:id - Remove saved address
router.delete("/user/addresses/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const addressId = Number(req.params.id);

    await db
      .delete(userAddressesTable)
      .where(and(eq(userAddressesTable.id, addressId), eq(userAddressesTable.userId, userId)));

    res.json({ success: true, message: "Address deleted" });
  } catch (error: any) {
    console.error("Failed to delete address:", error);
    res.status(500).json({ error: "Failed to delete address" });
  }
});

// PUT /api/user/addresses/:id/default - Set default address
router.put("/user/addresses/:id/default", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const addressId = Number(req.params.id);

    await db.update(userAddressesTable).set({ isDefault: false }).where(eq(userAddressesTable.userId, userId));

    const [updated] = await db
      .update(userAddressesTable)
      .set({ isDefault: true })
      .where(and(eq(userAddressesTable.id, addressId), eq(userAddressesTable.userId, userId)))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Failed to set default address:", error);
    res.status(500).json({ error: "Failed to set default address" });
  }
});

export default router;
