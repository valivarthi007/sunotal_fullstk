import { pgTable, serial, text, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const userAddressesTable = pgTable("user_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  tag: text("tag", { enum: ["home", "work", "office", "other"] }).notNull().default("home"),
  houseNo: text("house_no").notNull(),
  street: text("street").notNull(),
  landmark: text("landmark"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UserAddress = typeof userAddressesTable.$inferSelect;
