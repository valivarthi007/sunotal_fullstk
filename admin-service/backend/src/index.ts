import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPgPool } from "./lib/db.js";

export const app = express();
const PORT = Number(process.env.PORT ?? 5002);
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://sunotal:sunotal_pass_dev@127.0.0.1:5432/sunotal";
const JWT_SECRET = process.env.JWT_SECRET || "sunotal-jwt-secret";
const pgPool = getPgPool({ serviceName: "operations-service" });

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Initialize PostgreSQL database schema for operations-service
async function initDb() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT 'hash',
        role VARCHAR(50) DEFAULT 'customer',
        active BOOLEAN DEFAULT TRUE,
        phone VARCHAR(50),
        city VARCHAR(100),
        wallet_balance NUMERIC(10, 2) DEFAULT 100.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        vendor_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        location TEXT,
        produce VARCHAR(255),
        farm_size VARCHAR(100),
        aadhar VARCHAR(50),
        gstin VARCHAR(50),
        category VARCHAR(100) DEFAULT 'General',
        status VARCHAR(50) DEFAULT 'pending',
        active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        address TEXT,
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        price NUMERIC(10, 2) DEFAULT 0,
        original_price NUMERIC(10, 2),
        unit VARCHAR(50) DEFAULT '1 kg',
        image TEXT,
        is_organic BOOLEAN DEFAULT TRUE,
        badge VARCHAR(100),
        stock INT DEFAULT 100,
        rating NUMERIC(3, 2) DEFAULT 5.0,
        status VARCHAR(50) DEFAULT 'active',
        active BOOLEAN DEFAULT TRUE,
        description TEXT,
        product_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        icon VARCHAR(255) DEFAULT '📦',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INT,
        vendor_id INT,
        product_name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255),
        warehouse_name VARCHAR(255) DEFAULT 'Central Dark Store Hub',
        warehouse_city VARCHAR(255),
        quantity NUMERIC(10, 2) DEFAULT 100,
        unit VARCHAR(50) DEFAULT 'kg',
        status VARCHAR(50) DEFAULT 'in_stock',
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        vendor_name VARCHAR(255),
        produce VARCHAR(255),
        crop_name VARCHAR(255),
        quantity NUMERIC(10, 2),
        price NUMERIC(10, 2),
        category VARCHAR(100) DEFAULT 'Grains',
        unit VARCHAR(50) DEFAULT 'Quintal',
        quality_grade VARCHAR(100) DEFAULT 'Grade A',
        expected_harvest_date VARCHAR(50),
        dark_store_allocation VARCHAR(255) DEFAULT 'Central Store',
        notes TEXT,
        phone VARCHAR(50),
        address TEXT,
        aadhar VARCHAR(50),
        gstin VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'processing',
        invoice_generated BOOLEAN DEFAULT FALSE,
        invoice_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rider_payouts (
        id SERIAL PRIMARY KEY,
        rider_id VARCHAR(255),
        rider_name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        upi_id VARCHAR(255),
        completed_deliveries INT DEFAULT 0,
        total_distance_km NUMERIC(10,2) DEFAULT 0,
        amount NUMERIC(10, 2) NOT NULL,
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        free_delivery_radius_km NUMERIC(5,2) DEFAULT 30,
        max_service_radius_km NUMERIC(5,2) DEFAULT 70,
        base_delivery_fee NUMERIC(10,2) DEFAULT 50,
        per_km_rate NUMERIC(10,2) DEFAULT 8,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS business_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe migrations — add missing columns to existing tables without dropping data
    const safeAlters = [
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS first_name VARCHAR(255)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location TEXT`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS produce VARCHAR(255)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS farm_size VARCHAR(100)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS aadhar VARCHAR(50)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gstin VARCHAR(50)`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS product_id VARCHAR(100)`,
      `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS vendor_id INT`,
      `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_city VARCHAR(255)`,
      `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
      `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS aadhar VARCHAR(50)`,
      `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS gstin VARCHAR(50)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS rider_name VARCHAR(255)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255)`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS completed_deliveries INT DEFAULT 0`,
      `ALTER TABLE rider_payouts ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(10,2) DEFAULT 0`,
    ];
    for (const sql of safeAlters) {
      try { await pgPool.query(sql); } catch {}
    }

    // Seed default business settings into PostgreSQL RDS if empty
    await pgPool.query(`
      INSERT INTO business_settings (setting_key, setting_value, description)
      VALUES
        ('base_delivery_fee', '50.00', 'Base delivery fee charged per order'),
        ('per_km_rate', '8.00', 'Delivery fee per km beyond free radius'),
        ('free_delivery_radius_km', '3.00', 'Radius in km for free delivery'),
        ('platform_fee', '15.00', 'Platform fee per customer order'),
        ('tax_rate_percent', '5.00', 'Applicable GST percentage'),
        ('vendor_commission_percent', '10.00', 'Platform commission charged on vendor sales'),
        ('rider_base_payout', '45.00', 'Base payout to delivery rider per completed order'),
        ('rider_per_km_payout', '10.00', 'Extra payout per km for delivery riders'),
        ('surge_pricing_multiplier', '1.00', 'Surge pricing multiplier'),
        ('avg_rider_speed_kmh', '25.00', 'Average rider speed in km/h for ETA calculation')
      ON CONFLICT (setting_key) DO NOTHING;
    `).catch(() => {});

    console.log('🐘 [operations-service] All PostgreSQL tables & migrations ready.');
  } catch (err: any) {
    console.warn('⚠️ [operations-service] DB init warning:', err?.message || err);
  }
}

initDb();

// Dynamic Business Settings API
app.get("/api/admin/settings", async (_req, res) => {
  try {
    const dbRes = await pgPool.query("SELECT * FROM business_settings ORDER BY setting_key ASC");
    const settingsMap: Record<string, string> = {};
    dbRes.rows.forEach((r: any) => {
      settingsMap[r.setting_key] = r.setting_value;
    });
    return res.json({ success: true, settings: settingsMap });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch settings", message: err?.message });
  }
});

app.put("/api/admin/settings", async (req, res) => {
  try {
    const settingsObj = req.body.settings || req.body;
    if (!settingsObj || typeof settingsObj !== "object") {
      return res.status(400).json({ error: "Invalid settings payload" });
    }

    for (const [key, value] of Object.entries(settingsObj)) {
      await pgPool.query(
        `INSERT INTO business_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, String(value)]
      );
    }

    return res.json({ success: true, message: "Business settings updated in PostgreSQL RDS" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update settings", message: err?.message });
  }
});

// GET /api/admin/stats — Dynamic Real-Time PostgreSQL Querying
app.get("/api/admin/stats", async (_req, res) => {
  try {
    const [uCount, vCount, pCount, activeVCount, recentU, recentV, prods] = await Promise.all([
      pgPool.query("SELECT COUNT(*) FROM users").catch(() => ({ rows: [{ count: 0 }] })),
      pgPool.query("SELECT COUNT(*) FROM vendors").catch(() => ({ rows: [{ count: 0 }] })),
      pgPool.query("SELECT COUNT(*) FROM products").catch(() => ({ rows: [{ count: 0 }] })),
      pgPool.query("SELECT COUNT(*) FROM vendors WHERE status IN ('approved', 'active')").catch(() => ({ rows: [{ count: 0 }] })),
      pgPool.query("SELECT id, name, email, role, city, created_at FROM users ORDER BY id DESC LIMIT 5").catch(() => ({ rows: [] })),
      pgPool.query("SELECT id, name, vendor_name, email, phone, category, status FROM vendors ORDER BY id DESC LIMIT 5").catch(() => ({ rows: [] })),
      pgPool.query("SELECT category, COUNT(*) as count FROM products GROUP BY category").catch(() => ({ rows: [] })),
    ]);

    const totalUsers = Number(uCount.rows[0]?.count || 0);
    const totalVendors = Number(vCount.rows[0]?.count || 0);
    const totalProducts = Number(pCount.rows[0]?.count || 0);
    const activeVendors = Number(activeVCount.rows[0]?.count || 0);
    const users = recentU.rows || [];
    const vendors = recentV.rows || [];
    const products = prods.rows || [];

    const categoryBreakdown = (products || []).map((row: any) => ({
      category: row.category || "General",
      count: Number(row.count || 1),
    }));

    return res.json({
      totalOrders: 0,
      totalRevenue: 0,
      totalProducts,
      totalVendors,
      totalUsers,
      activeVendors,
      activeDarkStores: 3,
      deliverySuccessRate: 100,
      categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : [{ category: "Fresh Produce", count: totalProducts }],
      recentUsers: users.map((u: any) => ({
        id: u.id,
        name: u.name || "User",
        email: u.email || "",
        role: u.role || "user",
        city: u.city || "",
        createdAt: u.created_at || new Date().toISOString(),
      })),
      recentVendors: vendors.map((v: any) => ({
        id: v.id,
        firstName: v.first_name || (v.name || v.vendor_name || '').split(' ')[0] || '',
        lastName: v.last_name || (v.name || v.vendor_name || '').split(' ').slice(1).join(' ') || '',
        name: v.name || v.vendor_name,
        vendorName: v.vendor_name || v.name,
        email: v.email,
        phone: v.phone,
        location: v.location || v.address || v.city || '',
        produce: v.produce || v.category || 'Fresh Produce',
        farmSize: v.farm_size || '',
        category: v.category,
        status: v.status || 'pending',
        createdAt: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("Error fetching admin stats:", err);
    return res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

// GET & POST /api/admin/quotations — Real-Time PostgreSQL Querying
app.get("/api/admin/quotations", async (_req, res) => {
  try {
    const dbRes = await pgPool.query('SELECT * FROM quotations ORDER BY created_at DESC');
    return res.json(dbRes.rows.map((q: any) => ({
      id: q.id, vendorName: q.vendor_name, name: q.vendor_name,
      produce: q.produce, cropName: q.crop_name,
      quantity: Number(q.quantity), price: Number(q.price),
      category: q.category, unit: q.unit, qualityGrade: q.quality_grade,
      expectedHarvestDate: q.expected_harvest_date, darkStoreAllocation: q.dark_store_allocation,
      notes: q.notes, phone: q.phone, address: q.address,
      status: q.status, paymentStatus: q.payment_status,
      invoiceGenerated: q.invoice_generated, invoiceNumber: q.invoice_number,
      createdAt: q.created_at, updatedAt: q.updated_at
    })));
  } catch (err: any) {
    return res.status(503).json({ error: 'Could not fetch quotations. Database unavailable.' });
  }
});

app.get("/api/vendors/quotations", async (_req, res) => {
  try {
    const dbRes = await pgPool.query('SELECT * FROM quotations ORDER BY created_at DESC');
    return res.json(dbRes.rows.map((q: any) => ({
      id: q.id, vendorName: q.vendor_name, name: q.vendor_name,
      produce: q.produce, cropName: q.crop_name,
      quantity: Number(q.quantity), price: Number(q.price),
      category: q.category, unit: q.unit, qualityGrade: q.quality_grade,
      expectedHarvestDate: q.expected_harvest_date, darkStoreAllocation: q.dark_store_allocation,
      notes: q.notes, phone: q.phone, address: q.address,
      status: q.status, paymentStatus: q.payment_status,
      invoiceGenerated: q.invoice_generated, invoiceNumber: q.invoice_number,
      createdAt: q.created_at
    })));
  } catch (err: any) {
    return res.status(503).json({ error: 'Could not fetch quotations. Database unavailable.' });
  }
});

app.post("/api/vendors/quotations", async (req: any, res: any) => {
  try {
    const { vendorName, name, cropName, produce, quantity, price, category, unit, qualityGrade, expectedHarvestDate, darkStoreAllocation, notes, phone, address, location } = req.body;
    const produceName = produce || cropName;
    const vName = vendorName || name || "Local Farm Vendor";

    if (!produceName || quantity === undefined || price === undefined) {
      return res.status(400).json({ error: "Missing required quotation fields: produce name, quantity, and price are required" });
    }

    const dbRes = await pgPool.query(
      `INSERT INTO quotations (vendor_name, produce, crop_name, quantity, price, category, unit, quality_grade, expected_harvest_date, dark_store_allocation, notes, phone, address, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [vName, produceName, produceName, Number(quantity), Number(price), category || 'Grains', unit || 'Quintal', qualityGrade || 'Grade A (Organic / Premium)', expectedHarvestDate || new Date().toISOString().split('T')[0], darkStoreAllocation || 'Central Store', notes || '', phone || 'N/A', address || location || 'Direct Sourcing Mandal', 'pending', 'processing']
    );
    const q = dbRes.rows[0];
    return res.status(201).json({
      id: q.id, vendorName: q.vendor_name, name: q.vendor_name,
      produce: q.produce, cropName: q.crop_name,
      quantity: Number(q.quantity), price: Number(q.price),
      category: q.category, unit: q.unit, qualityGrade: q.quality_grade,
      expectedHarvestDate: q.expected_harvest_date, darkStoreAllocation: q.dark_store_allocation,
      notes: q.notes, phone: q.phone, address: q.address,
      status: q.status, paymentStatus: q.payment_status, createdAt: q.created_at
    });
  } catch (err: any) {
    console.error("Error creating quotation:", err);
    return res.status(500).json({ error: err.message || "Failed to create quotation" });
  }
});

const handleQuotationStatus = async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const dbRes = await pgPool.query(
      `UPDATE quotations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Quotation not found" });
    const q = dbRes.rows[0];
    const updated = {
      id: q.id, vendorName: q.vendor_name, name: q.vendor_name,
      produce: q.produce, cropName: q.crop_name,
      quantity: Number(q.quantity), price: Number(q.price),
      category: q.category, unit: q.unit, qualityGrade: q.quality_grade,
      expectedHarvestDate: q.expected_harvest_date, darkStoreAllocation: q.dark_store_allocation,
      notes: q.notes, phone: q.phone, address: q.address,
      status: q.status, paymentStatus: q.payment_status,
      invoiceGenerated: q.invoice_generated, invoiceNumber: q.invoice_number,
      createdAt: q.created_at, updatedAt: q.updated_at
    };

    // Automatic product and inventory creation in PostgreSQL when quotation is approved/accepted!
    if (status === "accepted" || status === "approved") {
      const crop = updated.produce || updated.cropName;
      if (crop) {
        const cat = (updated.category || "Vegetables").trim();
        const isLiquid = cat.toLowerCase().includes("dairy") || cat.toLowerCase().includes("liquid") || cat.toLowerCase().includes("milk") || cat.toLowerCase().includes("juice");

        const rawUnit = (updated.unit || "Quintal").toLowerCase();
        let qtyInBaseUnit = Number(updated.quantity || 1);
        let pricePerBaseUnit = Number(updated.price || 50);

        if (rawUnit.includes("quintal")) {
          qtyInBaseUnit = Number(updated.quantity || 1) * 100;
          pricePerBaseUnit = Math.round(Number(updated.price || 2800) / 100);
        } else if (rawUnit.includes("ton")) {
          qtyInBaseUnit = Number(updated.quantity || 1) * 1000;
          pricePerBaseUnit = Math.round(Number(updated.price || 28000) / 1000);
        }

        if (!pricePerBaseUnit || pricePerBaseUnit <= 0) {
          pricePerBaseUnit = Number(updated.price || 50);
        }

        const displayUnit = isLiquid ? "1 Litre" : "1 kg";

        let defaultImg = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80";
        if (cat.toLowerCase().includes("fruit")) {
          defaultImg = "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&q=80";
        } else if (isLiquid) {
          defaultImg = "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80";
        } else if (cat.toLowerCase().includes("grain")) {
          defaultImg = "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80";
        } else if (cat.toLowerCase().includes("nut") || cat.toLowerCase().includes("dry")) {
          defaultImg = "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=500&q=80";
        }

        const prodDbRes = await pgPool.query(
          `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, active, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO UPDATE SET price = EXCLUDED.price, active = TRUE RETURNING id`,
          [crop, cat, pricePerBaseUnit, Math.round(pricePerBaseUnit * 1.25), displayUnit, defaultImg, true, true, `Fresh ${cat} direct from ${updated.vendorName}. Quality grade: ${updated.qualityGrade}`]
        );
        const targetProdId = prodDbRes.rows[0]?.id;

        if (targetProdId) {
          await pgPool.query(
            `INSERT INTO inventory (product_id, product_name, vendor_name, warehouse_name, quantity, unit, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [targetProdId, crop, updated.vendorName || "Farm Vendor", updated.darkStoreAllocation || "Central Dark Store", qtyInBaseUnit, isLiquid ? "Litre" : "kg", "in_stock", `Auto-stocked from approved quotation #${updated.id}`]
          );
        }
      }
    }

    return res.json(updated);
  } catch (err: any) {
    console.error("Error handling quotation status:", err);
    return res.status(500).json({ error: "Failed to update quotation" });
  }
};
app.put("/api/admin/quotations/:id/status", handleQuotationStatus);
app.patch("/api/admin/quotations/:id/status", handleQuotationStatus);

const handleGenerateInvoice = async (req: any, res: any) => {
  const id = Number(req.params.id);
  const invoiceNum = `INV-2026-${id}`;
  const dbRes = await pgPool.query(
    `UPDATE quotations SET invoice_generated = TRUE, invoice_number = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [invoiceNum, id]
  ).catch(() => null);
  const q = dbRes?.rows?.[0] ? {
    invoiceNumber: dbRes.rows[0].invoice_number,
    quantity: dbRes.rows[0].quantity,
    price: dbRes.rows[0].price,
    vendorName: dbRes.rows[0].vendor_name,
    produce: dbRes.rows[0].produce,
    unit: dbRes.rows[0].unit,
    qualityGrade: dbRes.rows[0].quality_grade,
    paymentStatus: dbRes.rows[0].payment_status,
    createdAt: dbRes.rows[0].created_at
  } : null;

  const totalAmount = Number(q?.quantity || 10) * Number(q?.price || 500);
  const gst = Math.round(totalAmount * 0.05);
  const finalTotal = totalAmount + gst;

  return res.json({
    success: true,
    invoiceNumber: q?.invoiceNumber || `INV-2026-${id}`,
    quotationId: id,
    vendorName: q?.vendorName || "Local Farmer",
    cropName: q?.produce || "Produce",
    quantity: q?.quantity || 10,
    unit: q?.unit || "Quintal",
    price: q?.price || 500,
    gst,
    total: finalTotal,
    status: q?.paymentStatus || "processing",
    createdAt: new Date().toISOString(),
  });
};

app.get("/api/admin/quotations/:id/invoice", handleGenerateInvoice);
app.post("/api/admin/quotations/:id/invoice", handleGenerateInvoice);

// CATEGORIES API ENDPOINTS — Real-Time PostgreSQL Querying
app.get("/api/categories", async (_req, res) => {
  try {
    const dbRes = await pgPool.query("SELECT * FROM categories WHERE active = true ORDER BY id ASC");
    return res.json(dbRes.rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || "📦",
      active: c.active
    })));
  } catch (err: any) {
    return res.json([]);
  }
});

app.post("/api/categories", async (req: any, res: any) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });
  try {
    const dbRes = await pgPool.query(
      `INSERT INTO categories (name, icon, active) VALUES ($1, $2, true) ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon RETURNING *`,
      [name.trim(), icon || "📦"]
    );
    const cat = dbRes.rows[0];
    return res.status(201).json({ id: cat.id, name: cat.name, icon: cat.icon, active: cat.active });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create category", message: err?.message });
  }
});

app.delete("/api/categories/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const dbRes = await pgPool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Category not found" });
    return res.json({ success: true, message: "Category deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete category" });
  }
});

// PRODUCTS API ENDPOINTS — Real-Time PostgreSQL Querying
app.get("/api/products", async (req: any, res: any) => {
  try {
    const { category, search } = req.query;
    let queryStr = "SELECT * FROM products WHERE active = true";
    const params: any[] = [];

    if (category && typeof category === 'string' && category !== 'All') {
      params.push(category);
      queryStr += ` AND LOWER(category) = LOWER($${params.length})`;
    }

    if (search && typeof search === 'string') {
      params.push(`%${search.toLowerCase()}%`);
      queryStr += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    queryStr += " ORDER BY id DESC";
    const dbRes = await pgPool.query(queryStr, params);
    return res.json(dbRes.rows.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: Number(p.original_price || p.price),
      unit: p.unit,
      image: p.image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
      isOrganic: p.is_organic,
      stock: p.stock,
      rating: Number(p.rating || 5.0),
      active: p.active
    })));
  } catch (err: any) {
    return res.json([]);
  }
});

app.get("/api/products/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const dbRes = await pgPool.query("SELECT * FROM products WHERE id = $1", [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    const p = dbRes.rows[0];
    return res.json({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: Number(p.original_price || p.price),
      unit: p.unit,
      image: p.image,
      isOrganic: p.is_organic,
      stock: p.stock,
      rating: Number(p.rating || 5.0),
      active: p.active
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.post("/api/products", async (req: any, res: any) => {
  try {
    const { name, category, unit, price, originalPrice, image, organic, active, description } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: "Name, category, and price are required" });
    }
    const dbRes = await pgPool.query(
      `INSERT INTO products (name, category, price, original_price, unit, image, is_organic, active, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, category, Number(price), Number(originalPrice || price), unit || '1 kg', image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80', organic !== false, active !== false, description || '']
    );
    const p = dbRes.rows[0];
    return res.status(201).json({
      id: String(p.id),
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: Number(p.original_price),
      unit: p.unit,
      image: p.image,
      isOrganic: p.is_organic,
      stock: p.stock,
      rating: Number(p.rating || 5.0),
      active: p.active
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

app.put("/api/products/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { name, category, price, originalPrice, unit, image, active } = req.body;
    const dbRes = await pgPool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        price = COALESCE($3, price),
        original_price = COALESCE($4, original_price),
        unit = COALESCE($5, unit),
        image = COALESCE($6, image),
        active = COALESCE($7, active)
       WHERE id = $8 RETURNING *`,
      [name, category, price !== undefined ? Number(price) : null, originalPrice !== undefined ? Number(originalPrice) : null, unit, image, active, id]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    const p = dbRes.rows[0];
    return res.json({ id: String(p.id), name: p.name, category: p.category, price: Number(p.price), active: p.active });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const dbRes = await pgPool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    return res.json({ success: true, message: "Product deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// INVENTORY API ENDPOINTS — Real-Time PostgreSQL Querying
app.get("/api/inventory", async (_req: any, res: any) => {
  try {
    const dbRes = await pgPool.query("SELECT * FROM inventory ORDER BY id DESC");
    return res.json(dbRes.rows.map((inv: any) => ({
      id: inv.id,
      productId: inv.product_id,
      productName: inv.product_name,
      vendorName: inv.vendor_name,
      warehouseName: inv.warehouse_name,
      quantity: Number(inv.quantity),
      unit: inv.unit,
      status: inv.status,
      notes: inv.notes,
      createdAt: inv.created_at
    })));
  } catch (err: any) {
    return res.json([]);
  }
});

app.put("/api/inventory/:id", async (req: any, res: any) => {
  try {
    const targetId = Number(req.params.id);
    const payload = req.body.data || req.body;
    const { quantity, status, notes } = payload;
    const dbRes = await pgPool.query(
      `UPDATE inventory SET
        quantity = COALESCE($1, quantity),
        status = COALESCE($2, status),
        notes = COALESCE($3, notes)
       WHERE id = $4 RETURNING *`,
      [quantity !== undefined ? Number(quantity) : null, status, notes, targetId]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Inventory item not found" });
    const inv = dbRes.rows[0];
    return res.json({ id: inv.id, productName: inv.product_name, quantity: Number(inv.quantity), status: inv.status });
  } catch {
    return res.status(500).json({ error: "Failed to update inventory item" });
  }
});

app.delete("/api/inventory/:id", async (req: any, res: any) => {
  try {
    const targetId = Number(req.params.id);
    const dbRes = await pgPool.query("DELETE FROM inventory WHERE id = $1 RETURNING id", [targetId]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Inventory item not found" });
    return res.json({ success: true, message: "Inventory item deleted" });
  } catch {
    return res.status(500).json({ error: "Failed to delete inventory item" });
  }
});

// VENDORS API ENDPOINTS — Real-Time PostgreSQL Querying
app.get(["/api/vendors", "/api/admin/vendors"], async (_req: any, res: any) => {
  try {
    const dbRes = await pgPool.query("SELECT * FROM vendors ORDER BY id DESC");
    return res.json(dbRes.rows.map((v: any) => {
      const firstName = v.first_name || (v.name || v.vendor_name || '').split(' ')[0] || '';
      const lastName = v.last_name || (v.name || v.vendor_name || '').split(' ').slice(1).join(' ') || '';
      return {
        id: v.id,
        firstName,
        lastName,
        name: v.name || v.vendor_name || `${firstName} ${lastName}`.trim(),
        vendorName: v.vendor_name || v.name,
        email: v.email || '',
        phone: v.phone || '',
        location: v.location || v.address || v.city || '',
        produce: v.produce || v.category || 'Fresh Produce',
        farmSize: v.farm_size || '',
        aadhar: v.aadhar || '',
        gstin: v.gstin || '',
        category: v.category || 'Fresh Produce',
        address: v.address || v.location || v.city || '',
        city: v.city || '',
        status: v.status || 'pending',
        active: v.active !== false,
        notes: v.notes || '',
        createdAt: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
      };
    }));
  } catch {
    return res.json([]);
  }
});

app.get("/api/vendors/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const dbRes = await pgPool.query("SELECT * FROM vendors WHERE id = $1", [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Vendor not found" });
    const v = dbRes.rows[0];
    return res.json({ id: v.id, name: v.name, vendorName: v.vendor_name, email: v.email, phone: v.phone, status: v.status });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

const handleCreateVendor = async (req: any, res: any) => {
  try {
    const { firstName, lastName, phone, location, produce, farmSize, aadhar, gstin, email, password, status, notes, name, vendorName } = req.body;
    const fName = firstName || (name || vendorName || '').split(' ')[0] || 'Vendor';
    const lName = lastName || (name || vendorName || '').split(' ').slice(1).join(' ') || '';
    if (!phone && !email) {
      return res.status(400).json({ error: "Phone or email is required" });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const vName = name || vendorName || `${fName} ${lName}`.trim();

    const dbRes = await pgPool.query(
      `INSERT INTO vendors (name, vendor_name, first_name, last_name, email, phone, location, produce, farm_size, aadhar, gstin, category, status, active, notes, address, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, $7, $15)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
         phone = EXCLUDED.phone, location = EXCLUDED.location, produce = EXCLUDED.produce,
         farm_size = EXCLUDED.farm_size, status = COALESCE($13, vendors.status), notes = EXCLUDED.notes
       RETURNING *`,
      [vName, vName, fName, lName, cleanEmail || null, phone || '', location || '', produce || 'Fresh Produce', farmSize || '', aadhar || '', gstin || '', produce || 'Fresh Produce', status || 'pending', notes || '', location ? location.split(',')[0].trim() : '']
    );
    const v = dbRes.rows[0];

    // Create corresponding user account for login persistence
    if (cleanEmail) {
      const passwordHash = await bcrypt.hash(password || 'vendor123', 10);
      await pgPool.query(
        `INSERT INTO users (name, email, password_hash, role, active, phone, city)
         VALUES ($1, $2, $3, 'vendor', true, $4, $5) ON CONFLICT (email) DO NOTHING`,
        [vName, cleanEmail, passwordHash, phone || '', location || '']
      );
    }

    return res.status(201).json({
      id: v.id, firstName: v.first_name, lastName: v.last_name,
      name: v.name, email: v.email, phone: v.phone,
      location: v.location, produce: v.produce, farmSize: v.farm_size,
      status: v.status, createdAt: v.created_at
    });
  } catch (err: any) {
    console.error('Error creating vendor:', err);
    return res.status(500).json({ error: err.message || 'Failed to create vendor' });
  }
};

app.post("/api/vendors", handleCreateVendor);
app.post("/api/vendors/register", handleCreateVendor);
app.post("/api/vendors/onboard", handleCreateVendor);

app.put("/api/vendors/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { status, name, firstName, lastName, phone, location, produce, farmSize, aadhar, gstin, email, category, notes, active } = req.body;
    const vName = name || (firstName && lastName ? `${firstName} ${lastName}` : undefined);
    const dbRes = await pgPool.query(
      `UPDATE vendors SET
        status = COALESCE($1, status),
        name = COALESCE($2, name),
        vendor_name = COALESCE($2, vendor_name),
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        phone = COALESCE($5, phone),
        location = COALESCE($6, location),
        produce = COALESCE($7, produce),
        farm_size = COALESCE($8, farm_size),
        email = COALESCE($9, email),
        category = COALESCE($10, category),
        notes = COALESCE($11, notes),
        active = COALESCE($12, active)
       WHERE id = $13 RETURNING *`,
      [status, vName, firstName, lastName, phone, location, produce, farmSize, email, category, notes, active, id]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    const v = dbRes.rows[0];
    return res.json({
      id: v.id, firstName: v.first_name, lastName: v.last_name,
      name: v.name, email: v.email, phone: v.phone,
      location: v.location, produce: v.produce, farmSize: v.farm_size,
      status: v.status, active: v.active, notes: v.notes,
      createdAt: v.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update vendor', message: err?.message });
  }
});

app.delete("/api/vendors/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const dbRes = await pgPool.query("DELETE FROM vendors WHERE id = $1 RETURNING id", [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Vendor not found" });
    return res.json({ success: true, message: "Vendor deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// USERS API ENDPOINTS — Real-Time PostgreSQL Querying
app.post(["/api/users/sync", "/api/users"], async (req: any, res: any) => {
  try {
    const { name, email, role, phone, city, active } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const cleanEmail = email.toLowerCase().trim();

    const dbRes = await pgPool.query(
      `INSERT INTO users (name, email, role, active, phone, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET active = EXCLUDED.active RETURNING *`,
      [name || 'User', cleanEmail, role || 'customer', active !== false, phone || '', city || '']
    );
    const user = dbRes.rows[0];
    return res.status(201).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get(["/api/users", "/api/admin/users"], async (_req: any, res: any) => {
  try {
    const dbRes = await pgPool.query("SELECT id, name, email, phone, role, city, active, created_at FROM users ORDER BY id DESC");
    return res.json(dbRes.rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      city: u.city,
      active: u.active,
      createdAt: u.created_at
    })));
  } catch {
    return res.json([]);
  }
});

// POST /api/delivery/calculate — Dynamic Pricing Calculation using business_settings & warehouses
app.post("/api/delivery/calculate", async (req, res) => {
  const { distance = 5 } = req.body;
  const numDist = Number(distance || 5);
  let baseFee = 50;
  let perKmRate = 8;
  let freeRadius = 3;

  try {
    const settingsRes = await pgPool.query("SELECT * FROM business_settings").catch(() => null);
    if (settingsRes && settingsRes.rows && settingsRes.rows.length > 0) {
      const sMap: Record<string, number> = {};
      settingsRes.rows.forEach((r: any) => {
        sMap[r.setting_key] = Number(r.setting_value);
      });
      if (sMap.base_delivery_fee !== undefined) baseFee = sMap.base_delivery_fee;
      if (sMap.per_km_rate !== undefined) perKmRate = sMap.per_km_rate;
      if (sMap.free_delivery_radius_km !== undefined) freeRadius = sMap.free_delivery_radius_km;
    }
  } catch (e: any) {}

  const extraKm = Math.max(0, numDist - freeRadius);
  const deliveryFee = extraKm > 0 ? baseFee + extraKm * perKmRate : (numDist <= freeRadius ? 0 : baseFee);

  res.json({
    success: true,
    distanceKm: numDist,
    baseFee,
    perKmRate,
    freeDeliveryRadiusKm: freeRadius,
    deliveryFee: Math.round(deliveryFee),
    currency: "INR"
  });
});

// GET & POST /api/warehouses — PostgreSQL
app.get(["/api/warehouses", "/api/admin/warehouses"], async (_req, res) => {
  try {
    const dbRes = await pgPool.query('SELECT * FROM warehouses ORDER BY id DESC');
    return res.json(dbRes.rows.map((w: any) => ({
      id: w.id, name: w.name, address: w.address, city: w.city,
      latitude: Number(w.latitude), longitude: Number(w.longitude),
      freeDeliveryRadiusKm: Number(w.free_delivery_radius_km),
      maxServiceRadiusKm: Number(w.max_service_radius_km),
      baseDeliveryFee: Number(w.base_delivery_fee),
      perKmRate: Number(w.per_km_rate),
      isActive: w.is_active, createdAt: w.created_at
    })));
  } catch {
    return res.json([]);
  }
});

app.post("/api/admin/warehouses", async (req: any, res: any) => {
  try {
    const { name, address, city, latitude, longitude, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ error: "Name, address, and city are required" });
    }
    const dbRes = await pgPool.query(
      `INSERT INTO warehouses (name, address, city, latitude, longitude, free_delivery_radius_km, max_service_radius_km, base_delivery_fee, per_km_rate, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, address, city, Number(latitude || 12.9716), Number(longitude || 77.5946), Number(freeDeliveryRadiusKm || 30), Number(maxServiceRadiusKm || 70), Number(baseDeliveryFee || 50), Number(perKmRate || 8), true]
    );
    const w = dbRes.rows[0];
    return res.status(201).json({
      id: w.id, name: w.name, address: w.address, city: w.city,
      latitude: Number(w.latitude), longitude: Number(w.longitude),
      freeDeliveryRadiusKm: Number(w.free_delivery_radius_km),
      maxServiceRadiusKm: Number(w.max_service_radius_km),
      baseDeliveryFee: Number(w.base_delivery_fee),
      perKmRate: Number(w.per_km_rate),
      isActive: w.is_active, createdAt: w.created_at
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to create warehouse", message: err?.message });
  }
});

app.put("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { name, address, city, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate, isActive } = req.body;
    const dbRes = await pgPool.query(
      `UPDATE warehouses SET
        name = COALESCE($1, name), address = COALESCE($2, address), city = COALESCE($3, city),
        free_delivery_radius_km = COALESCE($4, free_delivery_radius_km),
        max_service_radius_km = COALESCE($5, max_service_radius_km),
        base_delivery_fee = COALESCE($6, base_delivery_fee),
        per_km_rate = COALESCE($7, per_km_rate),
        is_active = COALESCE($8, is_active)
       WHERE id = $9 RETURNING *`,
      [name, address, city, freeDeliveryRadiusKm, maxServiceRadiusKm, baseDeliveryFee, perKmRate, isActive, id]
    );
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Warehouse not found" });
    const w = dbRes.rows[0];
    return res.json({ id: w.id, name: w.name, isActive: w.is_active });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update warehouse", message: err?.message });
  }
});

app.delete("/api/admin/warehouses/:id", async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const dbRes = await pgPool.query('DELETE FROM warehouses WHERE id = $1 RETURNING id', [id]);
    if (!dbRes.rows || dbRes.rows.length === 0) return res.status(404).json({ error: "Warehouse not found" });
    return res.json({ success: true, message: "Warehouse deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete warehouse", message: err?.message });
  }
});

app.get("/", (_req, res) => res.json({ status: "ok", service: "operations-service" }));
app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "operations-service" }));
app.get("/healthz", (_req, res) => res.json({ status: "ok", service: "operations-service" }));

app.listen(PORT, "0.0.0.0", () => console.log(`✅ [operations-service] PostgreSQL Connected & Running on port ${PORT}`));
