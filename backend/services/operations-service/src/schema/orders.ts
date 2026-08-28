import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { productsTable } from "./products.js";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: 'cascade' }),
  totalAmount: real("total_amount").notNull(),
  discountAmount: real("discount_amount").notNull().default(0),
  deliveryFee: real("delivery_fee").notNull().default(0),
  gstAmount: real("gst_amount").notNull().default(0),
  finalAmount: real("final_amount").notNull(),
  status: text("status", { enum: ["pending", "processing", "shipped", "delivered", "cancelled"] })
    .notNull()
    .default("processing"),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid", "refunded"] })
    .notNull()
    .default("unpaid"),
  paymentMethod: text("payment_method", { enum: ["card", "upi", "netbanking", "po"] })
    .notNull()
    .default("card"),
  shippingAddress: text("shipping_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  deliverySlot: text("delivery_slot").default("Express 2-Hour Delivery"),
  customerLat: real("customer_lat").default(12.9716),
  customerLng: real("customer_lng").default(77.5946),
  driverName: text("driver_name").default("Ramesh Kumar"),
  driverPhone: text("driver_phone").default("+91 98765 43210"),
  vehicleNo: text("vehicle_no").default("EV-DEL-4412"),
  corporateGstin: text("corporate_gstin"),
  corporatePoRef: text("corporate_po_ref"),
  trackingNumber: text("tracking_number"),
  estimatedDelivery: text("estimated_delivery"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: 'cascade' }),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: 'cascade' }),
  productName: text("product_name").notNull(),
  unitPrice: real("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: real("subtotal").notNull(),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
