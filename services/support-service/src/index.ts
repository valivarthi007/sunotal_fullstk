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
    id: { type: Number, unique: true, required: true },
    ticketId: { type: String, required: true, unique: true },
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

async function getNextId(Model: any): Promise<number> {
  try {
    const highest = await Model.findOne({}, { id: 1 }).sort({ id: -1 }).exec();
    if (highest && typeof highest.id === "number" && !isNaN(highest.id)) {
      return highest.id + 1;
    }
  } catch {
    // Ignored
  }
  return 1;
}

// GET /api/support/tickets
app.get("/api/support/tickets", async (req: any, res: any) => {
  try {
    const { role, category, status, search } = req.query;
    const filter: any = {};
    if (role) filter.role = role;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.subject = { $regex: search, $options: "i" };

    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).exec().catch(() => []);
    return res.json(tickets || []);
  } catch (err: any) {
    return res.json([]);
  }
});

// POST /api/support/tickets
app.post("/api/support/tickets", async (req: any, res: any) => {
  const { role = "user", senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body;

  if (!senderName || !senderEmail || !subject || !description || !category) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  try {
    const ticketId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextId = await getNextId(SupportTicket);
    const ticket = await SupportTicket.create({
      id: nextId,
      ticketId,
      role,
      senderName,
      senderEmail: senderEmail.trim().toLowerCase(),
      senderPhone: senderPhone || null,
      category,
      orderId: orderId || null,
      subject,
      description,
      status: "open",
    });
    return res.status(201).json(ticket);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create support ticket" });
  }
});

// PUT /api/support/tickets/:id/resolve
app.put("/api/support/tickets/:id/resolve", async (req: any, res: any) => {
  const { id } = req.params;
  const { resolution = "", status = "resolved", resolvedBy = "" } = req.body;

  try {
    const query = isNaN(Number(id)) ? { ticketId: String(id) } : { $or: [{ ticketId: String(id) }, { id: Number(id) }] };
    const dbT = await SupportTicket.findOneAndUpdate(
      query,
      { $set: { status, resolution, resolvedBy } },
      { new: true }
    ).exec();

    if (!dbT) {
      return res.status(404).json({ error: "Support ticket not found" });
    }
    return res.json(dbT);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to resolve support ticket" });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "support-service" }));

const isDocDB = MONGODB_URI.includes("docdb.amazonaws.com");
mongoose.connect(MONGODB_URI, {
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  ...(isDocDB ? { directConnection: true } : {})
}).then(() => {
  console.log("⚡ [support-service] Connected to MongoDB / AWS DocumentDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [support-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [support-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [support-service] Running on port ${PORT}`));
});
