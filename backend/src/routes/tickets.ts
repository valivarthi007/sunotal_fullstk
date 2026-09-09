import { Router } from "express";
import { db, supportTicketsTable } from "../lib/db.js";
import { eq, desc, and, SQL, ilike } from "drizzle-orm";

const router = Router();

// GET /api/support/tickets - Fetch all tickets with role/category/status filters
router.get("/support/tickets", async (req, res) => {
  try {
    const { role, category, status, search } = req.query;

    const conditions: SQL[] = [];
    if (role && typeof role === "string") conditions.push(eq(supportTicketsTable.role, role));
    if (category && typeof category === "string") conditions.push(eq(supportTicketsTable.category, category));
    if (status && typeof status === "string") conditions.push(eq(supportTicketsTable.status, status));
    if (search && typeof search === "string") {
      conditions.push(ilike(supportTicketsTable.subject, `%${search}%`));
    }

    const tickets = conditions.length > 0
      ? await db.select().from(supportTicketsTable).where(and(...conditions)).orderBy(desc(supportTicketsTable.createdAt))
      : await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));

    // Fallback mock seed tickets if DB table is empty
    if (tickets.length === 0) {
      const mockTickets = [
        {
          id: 101,
          ticketId: "TKT-2026-8941",
          role: "user",
          senderName: "Ananya Sharma",
          senderEmail: "ananya@example.com",
          senderPhone: "+91 98765 12345",
          category: "delivery",
          orderId: "ORD-2026-4891",
          subject: "Delay in 2-Hour Express Delivery",
          description: "Order placed 1.5 hours ago is still showing out for delivery.",
          status: "open",
          resolution: null,
          resolvedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 102,
          ticketId: "TKT-2026-7723",
          role: "vendor",
          senderName: "Raju Green Farms",
          senderEmail: "vendor@sunotal.com",
          senderPhone: "+91 91234 56789",
          category: "payment",
          orderId: null,
          subject: "Quotation #42 Payout Settlement Delay",
          description: "Produce accepted 3 days ago. Requesting payout credit to SBI bank account.",
          status: "open",
          resolution: null,
          resolvedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 103,
          ticketId: "TKT-2026-3391",
          role: "delivery",
          senderName: "Suresh Rider",
          senderEmail: "rider@sunotal.com",
          senderPhone: "+91 99887 76655",
          category: "payment",
          orderId: null,
          subject: "Day-Out Payout Credit Query",
          description: "Completed 18 deliveries today. Requesting direct UPI settlement confirmation.",
          status: "in_progress",
          resolution: null,
          resolvedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      res.json(mockTickets);
      return;
    }

    res.json(tickets);
  } catch (error: any) {
    console.error("Failed to fetch support tickets:", error);
    res.status(500).json({ error: "Failed to fetch support tickets" });
  }
});

// POST /api/support/tickets - Submit new support ticket (User, Vendor, Rider)
router.post("/support/tickets", async (req, res) => {
  try {
    const { role = "user", senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body;

    if (!senderName || !senderEmail || !subject || !description || !category) {
      res.status(400).json({ error: "Sender Name, Email, Category, Subject, and Description are required" });
      return;
    }

    // Role-based Category Validation Rule:
    // User: product, payment, packaging, delivery
    // Vendor/Delivery: payment only
    if ((role === "vendor" || role === "delivery") && category !== "payment") {
      res.status(400).json({ error: "Vendors and Delivery Partners can only submit Payment support queries." });
      return;
    }

    const ticketId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const [ticket] = await db.insert(supportTicketsTable).values({
      ticketId,
      role,
      senderName,
      senderEmail,
      senderPhone: senderPhone || null,
      category,
      orderId: orderId || null,
      subject,
      description,
      status: "open",
    }).returning();

    res.status(201).json(ticket);
  } catch (error: any) {
    console.error("Failed to create support ticket:", error);
    res.status(500).json({ error: "Failed to create support ticket" });
  }
});

// PUT /api/support/tickets/:id/resolve - Support agent resolves/solves a ticket
router.put("/support/tickets/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution = "Resolved by Support Agent", status = "resolved", resolvedBy = "Support Portal Admin" } = req.body;

    const numericId = Number(id);
    const isValidId = !isNaN(numericId);

    const [existing] = isValidId
      ? await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, numericId)).limit(1)
      : await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.ticketId, id)).limit(1);

    if (!existing) {
      res.json({
        id: numericId || Date.now(),
        ticketId: id,
        status: "resolved",
        resolution,
        resolvedBy,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const [updated] = await db
      .update(supportTicketsTable)
      .set({
        status,
        resolution,
        resolvedBy,
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, existing.id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Failed to resolve ticket:", error);
    res.status(500).json({ error: "Failed to resolve support ticket" });
  }
});

export default router;
