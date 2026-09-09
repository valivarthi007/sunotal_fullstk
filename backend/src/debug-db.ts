import 'dotenv/config';
import mongoose from "mongoose";
import { Product, Inventory, VendorQuotation } from "./lib/db.js";

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";
  await mongoose.connect(MONGODB_URI);

  const products = await Product.find();
  const inventory = await Inventory.find();
  const quotations = await VendorQuotation.find();

  console.log("=== PRODUCTS ===");
  console.log(JSON.stringify(products, null, 2));

  console.log("=== INVENTORY ===");
  console.log(JSON.stringify(inventory, null, 2));

  console.log("=== QUOTATIONS ===");
  console.log(JSON.stringify(quotations, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
