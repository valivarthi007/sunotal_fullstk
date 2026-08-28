import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  paymentId: text("payment_id").notNull().unique(),
  paymentMethod: text("payment_method", { enum: ["card", "upi", "netbanking", "po"] }).notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status", { enum: ["captured", "failed", "pending"] }).notNull().default("captured"),
  transactionSignature: text("transaction_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
