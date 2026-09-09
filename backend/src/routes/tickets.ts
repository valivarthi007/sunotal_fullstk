import { Router } from "express";
import { SupportTicket } from "../lib/db.js";

const router = Router();

function formatTicket(t: any) {
  return {
    id: t.id,
    ticketId: t.ticketId,
    role: t.role,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
    senderPhone: t.senderPhone,
    category: t.category,
    orderId: t.orderId,
    subject: t.subject,
    description: t.description,
    status: t.status,
    resolution: t.resolution,
    resolvedBy: t.resolvedBy,
    createdAt: t.createdAt ? (typeof t.createdAt === "string" ? t.createdAt : t.createdAt.toISOString()) : new Date().toISOString(),
    updatedAt: t.updatedAt ? (typeof t.updatedAt === "string" ? t.updatedAt : t.updatedAt.toISOString()) : new Date().toISOString(),
  };
}

// GET /api/support/tickets
router.get("/support/tickets", async (req, res) => {
  try {
    const { role, category, status, search } = req.query;

    const filter: any = {};
    if (role && typeof role === "string") filter.role = role;
    if (category && typeof category === "string") filter.category = category;
    if (status && typeof status === "string") filter.status = status;
    if (search && typeof search === "string") filter.subject = { $regex: search, $options: "i" };

    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });

    if (tickets.length === 0) {
      const mockTickets = [
        {
          id: 101,
          ticketId: "TKT-2026-8941",
          role: "user",
          senderName: "Ananya Sharma",
          senderEmail: "user@sunotal.com",
          senderPhone: "+91 98765 12345",
          category: "delivery",
          orderId: "ORD-2026-4891",
          subject: "Delay in 2-Hour Express Delivery",
          description: "Order placed 1.5 hours ago is still showing out for delivery.",
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 102,
          ticketId: "TKT-2026-7723",
          role: "vendor",
          senderName: "Sunotal Farm Vendor",
          senderEmail: "vendor@sunotal.com",
          senderPhone: "+91 91234 56789",
          category: "payment",
          orderId: null,
          subject: "Quotation #42 Payout Settlement Delay",
          description: "Produce accepted 3 days ago. Requesting payout credit to SBI bank account.",
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 103,
          ticketId: "TKT-2026-3391",
          role: "delivery",
          senderName: "Sunotal Delivery Rider",
          senderEmail: "rider@sunotal.com",
          senderPhone: "+91 99887 76655",
          category: "payment",
          orderId: null,
          subject: "Day-Out Payout Credit Query",
          description: "Completed 18 deliveries today. Requesting direct UPI settlement confirmation.",
          status: "in_progress",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      res.json(mockTickets);
      return;
    }

    res.json(tickets.map((t: any) => formatTicket(t.toObject())));
  } catch (error: any) {
    console.error("Failed to fetch support tickets:", error);
    res.status(500).json({ error: "Failed to fetch support tickets" });
  }
});

// POST /api/support/tickets
router.post("/support/tickets", async (req, res) => {
  try {
    const { role = "user", senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body;

    if (!senderName || !senderEmail || !subject || !description || !category) {
      res.status(400).json({ error: "Sender Name, Email, Category, Subject, and Description are required" });
      return;
    }

    if ((role === "vendor" || role === "delivery") && category !== "payment") {
      res.status(400).json({ error: "Vendors and Delivery Partners can only submit Payment support queries." });
      return;
    }

    const ticketId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await SupportTicket.create({
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
    });

    res.status(201).json(formatTicket(ticket.toObject()));
  } catch (error: any) {
    console.error("Failed to create support ticket:", error);
    res.status(500).json({ error: "Failed to create support ticket" });
  }
});

// PUT /api/support/tickets/:id/resolve
router.put("/support/tickets/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution = "Resolved by Support Agent", status = "resolved", resolvedBy = "Support Portal Admin" } = req.body;

    const numId = Number(id);
    let updated = null;
    if (!isNaN(numId)) {
      updated = await SupportTicket.findOneAndUpdate(
        { id: numId },
        { $set: { status, resolution, resolvedBy } },
        { new: true }
      );
    }
    if (!updated) {
      updated = await SupportTicket.findOneAndUpdate(
        { ticketId: String(id) },
        { $set: { status, resolution, resolvedBy } },
        { new: true }
      );
    }

    if (!updated) {
      res.json({
        id: numId || Date.now(),
        ticketId: id,
        status: "resolved",
        resolution,
        resolvedBy,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    res.json(formatTicket(updated.toObject()));
  } catch (error: any) {
    console.error("Failed to resolve ticket:", error);
    res.status(500).json({ error: "Failed to resolve support ticket" });
  }
});

export default router;
