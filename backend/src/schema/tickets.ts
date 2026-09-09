import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  role: text("role").notNull(), // 'user' | 'vendor' | 'delivery'
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderPhone: text("sender_phone"),
  category: text("category").notNull(), // 'product' | 'payment' | 'packaging' | 'delivery'
  orderId: text("order_id"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'closed'
  resolution: text("resolution"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
