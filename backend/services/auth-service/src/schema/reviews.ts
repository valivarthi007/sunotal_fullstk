import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { productsTable } from "./products.js";

export const productReviewsTable = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: 'cascade' }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  userName: text("user_name").notNull(),
  rating: integer("rating").notNull(), // 1 to 5
  comment: text("comment").notNull(),
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProductReview = typeof productReviewsTable.$inferSelect;
