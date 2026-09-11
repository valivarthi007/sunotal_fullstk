import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

export const app = express();
const PORT = Number(process.env.PORT ?? 5007);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const SupportTicketSchema = new mongoose.Schema(
  {
    id: { type: Number },
    ticketId: { type: String, required: true },
    role: { type: String, required: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    senderPhone: { type: String },
    category: { type: String, required: true },
    orderId: { type: String },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: "open" },
    resolution: { type: String },
    resolvedBy: { type: String },
  },
  { timestamps: true }
);

const SupportTicket: any = mongoose.models.SupportTicket || mongoose.model("SupportTicket", SupportTicketSchema);


const inMemoryTickets: any[] = [];

// GET /api/support/tickets
app.get("/api/support/tickets", async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { role, category, status, search } = req.query;
      const filter: any = {};
      if (role) filter.role = role;
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (search) filter.subject = { $regex: search, $options: "i" };

      const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });
      if (tickets && tickets.length > 0) return res.json(tickets);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryTickets);
});

// POST /api/support/tickets
app.post("/api/support/tickets", async (req: any, res: any) => {
  const { role = "user", senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body;

  if (!senderName || !senderEmail || !subject || !description || !category) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  const ticketId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const ticket = {
    id: inMemoryTickets.length + 101,
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
    createdAt: new Date().toISOString(),
  };

  inMemoryTickets.unshift(ticket);

  if (mongoose.connection.readyState === 1) {
    try {
      await SupportTicket.create(ticket);
    } catch {
      // Ignored
    }
  }

  return res.status(201).json(ticket);
});

// PUT /api/support/tickets/:id/resolve
app.put("/api/support/tickets/:id/resolve", async (req: any, res: any) => {
  const { id } = req.params;
  const { resolution = "", status = "resolved", resolvedBy = "" } = req.body;

  let ticket = inMemoryTickets.find((t) => t.ticketId === String(id) || t.id === Number(id));
  if (ticket) {
    ticket.status = status;
    ticket.resolution = resolution;
    ticket.resolvedBy = resolvedBy;
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const dbT = await SupportTicket.findOneAndUpdate(
        { ticketId: String(id) },
        { $set: { status, resolution, resolvedBy } },
        { new: true }
      );
      if (dbT) ticket = dbT;
    } catch {
      // Ignored
    }
  }

  if (!ticket) {
    return res.status(200).json({ ticketId: String(id), status, resolution, resolvedBy });
  }

  return res.json(ticket);
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "support-service" }));

mongoose.connect(MONGODB_URI, { tlsAllowInvalidCertificates: true, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }).then(() => {
  console.log("⚡ [support-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [support-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [support-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [support-service] Running on port ${PORT}`));
});


