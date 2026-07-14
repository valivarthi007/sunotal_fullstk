import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const vendorsTable = pgTable("vendors", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    location: text("location").notNull(),
    produce: text("produce").notNull(),
    email: text("email"),
    farmSize: text("farm_size"),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
        .notNull()
        .default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertVendorSchema = createInsertSchema(vendorsTable).omit({
    id: true,
    createdAt: true,
    status: true,
    notes: true,
});
