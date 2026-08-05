import 'dotenv/config';
import { db, productsTable, inventoryTable, vendorQuotationsTable } from "./lib/db.js";

async function main() {
  const products = await db.select().from(productsTable);
  const inventory = await db.select().from(inventoryTable);
  const quotations = await db.select().from(vendorQuotationsTable);

  console.log("=== PRODUCTS ===");
  console.log(JSON.stringify(products, null, 2));

  console.log("=== INVENTORY ===");
  console.log(JSON.stringify(inventory, null, 2));

  console.log("=== QUOTATIONS ===");
  console.log(JSON.stringify(quotations, null, 2));
}

main().catch(console.error);
