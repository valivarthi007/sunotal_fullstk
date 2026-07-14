import { pgTable, serial, text, boolean, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const productsTable = pgTable("products", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category", {
        enum: ["Vegetables", "Fruits", "Dairy", "Dry Fruits", "Grains"],
    }).notNull(),
    unit: text("unit").notNull(),
    price: real("price").notNull(),
    originalPrice: real("original_price").notNull(),
    discountPercentage: integer("discount_percentage").notNull().default(0),
    image: text("image").notNull(),
    badge: text("badge"),
    organic: boolean("organic").notNull().default(false),
    active: boolean("active").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertProductSchema = createInsertSchema(productsTable).omit({
    id: true,
    createdAt: true,
    discountPercentage: true,
});
