import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const usersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    active: boolean("active").notNull().default(true),
    phone: text("phone"),
    city: text("city"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertUserSchema = createInsertSchema(usersTable).omit({
    id: true,
    createdAt: true,
});
