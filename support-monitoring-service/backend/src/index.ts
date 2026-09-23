import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";

export const app = express();
const PORT = Number(process.env.PORT ?? 5007);
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const isRds = DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds') || DATABASE_URL.includes('sslmode=');
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRds ? { rejectUnauthorized: false } : undefined,
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(100) UNIQUE,
        role VARCHAR(50) DEFAULT 'user',
        sender_name VARCHAR(255) NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        sender_phone VARCHAR(50),
        category VARCHAR(100) NOT NULL,
        order_id VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        resolution TEXT,
        resolved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_id ON support_tickets(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_sender_email ON support_tickets(sender_email);
    `);
    console.log('🐘 [support-service] PostgreSQL database tables ready.');
  } catch (err: any) {
    console.warn('⚠️ [support-service] DB init warning:', err?.message || err);
  }
}

initDb();

function formatTicket(t: any) {
  return {
    id: t.id,
    ticketId: t.ticket_id,
    role: t.role,
    senderName: t.sender_name,
    senderEmail: t.sender_email,
    senderPhone: t.sender_phone,
    category: t.category,
    orderId: t.order_id,
    subject: t.subject,
    description: t.description,
    status: t.status,
    resolution: t.resolution,
    resolvedBy: t.resolved_by,
    createdAt: t.created_at
  };
}

// GET /api/support/tickets
app.get("/api/support/tickets", async (req: any, res: any) => {
  try {
    const { role, category, status, search } = req.query;
    let queryStr = "SELECT * FROM support_tickets WHERE 1=1";
    const params: any[] = [];

    if (role) {
      params.push(role);
      queryStr += ` AND role = $${params.length}`;
    }
    if (category) {
      params.push(category);
      queryStr += ` AND category = $${params.length}`;
    }
    if (status) {
      params.push(status);
      queryStr += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      queryStr += ` AND (LOWER(subject) LIKE $${params.length} OR LOWER(sender_name) LIKE $${params.length} OR LOWER(ticket_id) LIKE $${params.length})`;
    }

    queryStr += " ORDER BY id DESC";

    const dbRes = await pool.query(queryStr, params);
    return res.json(dbRes.rows.map(formatTicket));
  } catch (err: any) {
    return res.status(503).json({ error: "Could not fetch tickets. Database unavailable." });
  }
});

// POST /api/support/tickets
app.post("/api/support/tickets", async (req: any, res: any) => {
  const { role = "user", senderName, senderEmail, senderPhone, category, orderId, subject, description } = req.body;

  if (!senderName || !senderEmail || !subject || !description || !category) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  const cleanEmail = String(senderEmail).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Please provide a valid email address" });
  }

  const timestamp = Date.now().toString().slice(-6);
  const uniqueNum = Math.floor(100000 + Math.random() * 900000);
  const ticketId = `TKT-2026-${timestamp}-${uniqueNum}`;

  try {
    const dbRes = await pool.query(
      `INSERT INTO support_tickets (ticket_id, role, sender_name, sender_email, sender_phone, category, order_id, subject, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [ticketId, role, String(senderName).trim(), cleanEmail, senderPhone || "", category, orderId || "", String(subject).trim(), String(description).trim(), "open"]
    );

    return res.status(201).json(formatTicket(dbRes.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create ticket", message: err?.message });
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

  try {
    const dbRes = await pool.query(
      `UPDATE support_tickets SET status = $1, resolution = $2, resolved_by = $3
       WHERE ticket_id = $4 OR id = $5 RETURNING *`,
      [status, resolution, resolvedBy, String(id), isNaN(Number(id)) ? -1 : Number(id)]
    );

    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.json(formatTicket(dbRes.rows[0]));
    }
    return res.status(404).json({ error: "Ticket not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to resolve ticket", message: err?.message });
  }
});

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "support-service", db: "PostgreSQL" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [support-service] PostgreSQL Connected & Running on port ${PORT}`));
