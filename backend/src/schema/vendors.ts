import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: 'cascade' }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  location: text("location").notNull(),
  produce: text("produce").notNull(),
  email: text("email"),
  farmSize: text("farm_size"),
  aadhar: text("aadhar"),
  gstin: text("gstin"),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendorQuotationsTable = pgTable("vendor_quotations", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  aadhar: text("aadhar").notNull(),
  gstin: text("gstin"),
  category: text("category").notNull(),
  produce: text("produce").notNull(),
  quantity: integer("quantity").notNull().default(0),
  price: real("price").notNull().default(0),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  paymentStatus: text("payment_status", { enum: ["unpaid", "processing", "paid"] })
    .notNull()
    .default("unpaid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: 'cascade' }),
  quotationId: integer("quotation_id")
    .notNull()
    .references(() => vendorQuotationsTable.id, { onDelete: 'cascade' }),
  invoiceNumber: text("invoice_number").notNull(),
  s3Url: text("s3_url").notNull(),
  amount: real("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({
  id: true,
  createdAt: true,
  status: true,
  notes: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
export type VendorQuotation = typeof vendorQuotationsTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;

