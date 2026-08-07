import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productDefinitionsTable = pgTable("product_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductDefinitionSchema = createInsertSchema(productDefinitionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertProductDefinition = z.infer<typeof insertProductDefinitionSchema>;
export type ProductDefinition = typeof productDefinitionsTable.$inferSelect;
