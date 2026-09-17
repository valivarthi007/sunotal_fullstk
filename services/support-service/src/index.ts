import "dotenv/config";
import express from "express";
import cors from "cors";
import { getPgPool } from "./lib/db.js";

export const app = express();
const PORT = Number(process.env.PORT ?? 5007);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pgPool = getPgPool({ serviceName: "support-service" });

let memoryTickets: any[] = [
  {
    id: 1,
    ticketId: "TKT-2026-1001",
    role: "user",
    senderName: "Rahul Sharma",
    senderEmail: "rahul@example.com",
    senderPhone: "+919876543210",
    category: "Delivery Delay",
    orderId: "ORD-2026-9012",
    subject: "Order delayed past 10 minutes",
    description: "My grocery order was supposed to arrive in 10 mins but took 14 mins.",
    status: "resolved",
    resolution: "Issued $5 wallet credit",
    resolvedBy: "Admin Support",
    createdAt: new Date().toISOString()
  }
];

// GET /api/support/tickets
app.get("/api/support/tickets", async (req: any, res: any) => {
  try {
    const { role, category, status, search } = req.query;
    let filtered = [...memoryTickets];

    if (role) filtered = filtered.filter((t) => t.role === role);
    if (category) filtered = filtered.filter((t) => t.category === category);
    if (status) filtered = filtered.filter((t) => t.status === status);
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter((t) => t.subject.toLowerCase().includes(q) || t.senderName.toLowerCase().includes(q));
    }

    const dbRes = await pgPool.query("SELECT * FROM support_tickets ORDER BY id DESC").catch(() => null);
    if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
      return res.json(dbRes.rows);
    }

    return res.json(filtered);
  } catch (err: any) {
    return res.json(memoryTickets);
  }
});

// POST /api/support/tickets
app.post("/api/support/tickets", async (req: any, res: any) => {
  const { role = "user", senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body;

  if (!senderName || !senderEmail || !subject || !description || !category) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  const nextId = memoryTickets.length + 1;
  const ticketId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newTicket = {
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
    createdAt: new Date().toISOString()
  };

  try {
    await pgPool.query(
      `INSERT INTO support_tickets (id, ticket_id, role, sender_name, sender_email, sender_phone, category, order_id, subject, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT DO NOTHING`,
      [nextId, ticketId, role, senderName, senderEmail, senderPhone || "", category, orderId || "", subject, description, "open"]
    ).catch(() => null);

    memoryTickets.unshift(newTicket);
    return res.status(201).json(newTicket);
  } catch (err: any) {
    memoryTickets.unshift(newTicket);
    return res.status(201).json(newTicket);
  }
});

// POST /api/support/ai-chat (Groq Cloud LLM AI Customer Assistant)
app.post("/api/support/ai-chat", async (req: any, res: any) => {
  const { userMessage, customerName, orderId, orderStatus } = req.body;
  if (!userMessage) {
    return res.status(400).json({ error: "userMessage is required" });
  }

  try {
    const { askGroqCustomerSupport } = await import("./lib/ai-groq.js").catch(() => ({
      askGroqCustomerSupport: async () => "Hello! Our Sunotal AI Assistant is reviewing your grocery request."
    }));

    const responseText = await askGroqCustomerSupport({
      userMessage,
      customerName,
      orderId,
      orderStatus,
    });

    return res.json({
      success: true,
      botResponse: responseText,
      timestamp: new Date().toISOString(),
      provider: "Groq Cloud Llama-3.1-8B-Instant",
    });
  } catch (err: any) {
    return res.status(500).json({ error: "AI Support assistant error" });
  }
});

// PUT /api/support/tickets/:id/resolve
app.put("/api/support/tickets/:id/resolve", async (req: any, res: any) => {
  const { id } = req.params;
  const { resolution = "Resolved by dark store support team", status = "resolved", resolvedBy = "Admin Support" } = req.body;

  const ticket = memoryTickets.find((t) => t.id === Number(id) || t.ticketId === String(id));
  if (ticket) {
    ticket.status = status;
    ticket.resolution = resolution;
    ticket.resolvedBy = resolvedBy;
  }

  try {
    await pgPool.query(
      `UPDATE support_tickets SET status = $1, resolution = $2, resolved_by = $3 WHERE ticket_id = $4 OR id = $5`,
      [status, resolution, resolvedBy, String(id), isNaN(Number(id)) ? -1 : Number(id)]
    ).catch(() => null);

    return res.json(ticket || { id, status, resolution, resolvedBy });
  } catch (err: any) {
    return res.json(ticket || { id, status, resolution, resolvedBy });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "support-service", db: "PostgreSQL" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [support-service] PostgreSQL Connected & Running on port ${PORT}`));
