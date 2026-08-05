import { Router } from "express";
import { db, vendorsTable, usersTable, vendorQuotationsTable, invoicesTable, productsTable, inventoryTable } from "../lib/db.js";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { requireAdmin, requireAuth, signToken } from "../lib/auth.js";
import bcrypt from "bcryptjs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import {
  ListVendorsQueryParams,
  CreateVendorBody,
  UpdateVendorBody,
  GetVendorParams,
  UpdateVendorParams,
  DeleteVendorParams,
} from "../lib/schemas.js";

const router = Router();

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'jcs-raju-sunotal-final';
const REGION = process.env.AWS_REGION || 'us-east-1';

function formatVendor(v: typeof vendorsTable.$inferSelect) {
  return {
    id: v.id,
    userId: v.userId,
    firstName: v.firstName,
    lastName: v.lastName,
    phone: v.phone,
    location: v.location,
    produce: v.produce,
    email: v.email,
    farmSize: v.farmSize,
    aadhar: v.aadhar,
    gstin: v.gstin,
    status: v.status,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
  };
}

// GET /api/vendors
router.get("/vendors", async (req, res) => {
  const parsed = ListVendorsQueryParams.safeParse(req.query);
  const { status, search } = parsed.success ? parsed.data : {};

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(vendorsTable.status, status as "pending" | "approved" | "rejected"));
  if (search) {
    conditions.push(
      ilike(vendorsTable.firstName, `%${search}%`)
    );
  }

  const vendors =
    conditions.length > 0
      ? await db.select().from(vendorsTable).where(and(...conditions))
      : await db.select().from(vendorsTable);

  res.json(vendors.map(formatVendor));
});

// POST /api/vendors/register - Public Vendor Sign-up
router.post("/vendors/register", async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    location,
    farmSize,
    aadhar,
    gstin,
    notes
  } = req.body;

  if (!email || !password || !firstName || !lastName || !phone || !location || !aadhar) {
    res.status(400).json({ error: "Missing required fields for vendor registration" });
    return;
  }

  // Check if user email already exists
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existingUser) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  try {
    // 1. Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      name: `${firstName} ${lastName}`,
      email,
      passwordHash,
      role: "vendor",
      active: false, // Pending admin approval
      phone,
      city: location,
    }).returning();

    // 2. Create Vendor Profile
    await db.insert(vendorsTable).values({
      userId: user.id,
      firstName,
      lastName,
      phone,
      location,
      produce: "Pending Verification",
      email,
      farmSize: farmSize || null,
      aadhar,
      gstin: gstin || null,
      status: "pending",
      notes: notes || null,
    });

    res.status(201).json({ success: true, message: "Vendor application submitted successfully. Pending admin approval." });
  } catch (error) {
    console.error("Vendor registration error:", error);
    res.status(500).json({ error: "Failed to register vendor" });
  }
});

// POST /api/vendors/quotations - Submit new quotation
router.post("/vendors/quotations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden. Only vendors can submit quotations." });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.userId)).limit(1);
  if (!vendor) {
    res.status(404).json({ error: "Vendor profile not found" });
    return;
  }

  if (vendor.status !== "approved") {
    res.status(403).json({ error: "Vendor account is not approved yet" });
    return;
  }

  const { category, produce, quantity, price } = req.body;
  if (!category || !produce || !quantity || !price) {
    res.status(400).json({ error: "Missing required produce quotation fields" });
    return;
  }

  try {
    const [quotation] = await db.insert(vendorQuotationsTable).values({
      vendorId: vendor.id,
      name: `${vendor.firstName} ${vendor.lastName}`,
      address: vendor.location,
      phone: vendor.phone,
      email: vendor.email,
      aadhar: vendor.aadhar || "N/A",
      gstin: vendor.gstin || null,
      category,
      produce,
      quantity: Number(quantity),
      price: Number(price),
      status: "pending",
      paymentStatus: "unpaid",
    }).returning();

    res.status(201).json(quotation);
  } catch (error) {
    console.error("Quotation submission error:", error);
    res.status(500).json({ error: "Failed to submit quotation" });
  }
});

// GET /api/vendors/quotations - Vendor lists own quotations
router.get("/vendors/quotations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.userId)).limit(1);
  if (!vendor) {
    res.status(404).json({ error: "Vendor profile not found" });
    return;
  }

  const quotations = await db.select().from(vendorQuotationsTable).where(eq(vendorQuotationsTable.vendorId, vendor.id));
  res.json(quotations);
});

// GET /api/vendors/invoices - Vendor lists own invoices
router.get("/vendors/invoices", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.userId)).limit(1);
  if (!vendor) {
    res.status(404).json({ error: "Vendor profile not found" });
    return;
  }

  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.vendorId, vendor.id));
  res.json(invoices);
});

// GET /api/admin/quotations - Admin lists all quotations
router.get("/admin/quotations", requireAdmin, async (req, res) => {
  const quotations = await db.select().from(vendorQuotationsTable);
  res.json(quotations);
});

// PUT /api/admin/quotations/:id/status - Admin accepts/rejects a quotation
router.put("/admin/quotations/:id/status", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, productId } = req.body; // option to map to existing product

  if (!["pending", "accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  try {
    const [quotation] = await db.select().from(vendorQuotationsTable).where(eq(vendorQuotationsTable.id, Number(id))).limit(1);
    if (!quotation) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    const [updated] = await db.update(vendorQuotationsTable).set({ status }).where(eq(vendorQuotationsTable.id, Number(id))).returning();

    // If accepted, add to inventory
    if (status === "accepted") {
      let targetProductId = productId ? Number(productId) : null;

      // Auto-create product in catalog if not mapped
      if (!targetProductId) {
        // Check if there is an existing active product with the same name
        const [existingProduct] = await db.select().from(productsTable).where(ilike(productsTable.name, quotation.produce)).limit(1);
        if (existingProduct) {
          targetProductId = existingProduct.id;
        } else {
          // Create product draft
          const [newProduct] = await db.insert(productsTable).values({
            name: quotation.produce,
            category: quotation.category,
            unit: "kg",
            price: Math.round(quotation.price * 1.3), // 30% markup
            originalPrice: Math.round(quotation.price * 1.3),
            image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200", // placeholder fresh grocery image
            active: false, // Draft state by default
            organic: false,
            badge: "Fresh Arrival",
            description: `Freshly supplied ${quotation.produce} from local vendor ${quotation.name}.`,
          }).returning();
          targetProductId = newProduct.id;
        }
      }

      // Add to inventory
      await db.insert(inventoryTable).values({
        productId: targetProductId,
        vendorId: quotation.vendorId,
        quantity: quotation.quantity,
        status: "in_stock",
        notes: `Accepted from quotation #${quotation.id}`,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating quotation status:", error);
    res.status(500).json({ error: "Failed to update quotation status" });
  }
});

// POST /api/admin/quotations/:id/invoice - Admin generates invoice and uploads to S3
router.post("/api/admin/quotations/:id/invoice", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [quotation] = await db.select().from(vendorQuotationsTable).where(eq(vendorQuotationsTable.id, Number(id))).limit(1);
    if (!quotation) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    // Verify it is accepted
    if (quotation.status !== "accepted") {
      res.status(400).json({ error: "Can only generate invoice for accepted quotations" });
      return;
    }

    // Check if invoice already exists
    const [existingInv] = await db.select().from(invoicesTable).where(eq(invoicesTable.quotationId, quotation.id)).limit(1);
    if (existingInv) {
      res.status(409).json({ error: "Invoice already generated for this quotation" });
      return;
    }

    // Generate Invoice HTML
    const totalAmount = quotation.quantity * quotation.price;
    const invoiceNumber = `INV-${quotation.id}-${Date.now().toString().slice(-4)}`;
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: sans-serif; color: #333; padding: 30px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
          .details { margin: 30px 0; }
          .details table { width: 100%; border-collapse: collapse; }
          .details th, .details td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">SUNOTAL FARMS</div>
            <p>Direct Farmer Sourcing</p>
          </div>
          <div>
            <h2>INVOICE</h2>
            <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div class="details">
          <h3>Vendor & Produce Details</h3>
          <table>
            <tr><th>Farmer Name</th><td>${quotation.name}</td></tr>
            <tr><th>Phone</th><td>${quotation.phone}</td></tr>
            <tr><th>Email</th><td>${quotation.email || "N/A"}</td></tr>
            <tr><th>Location</th><td>${quotation.address}</td></tr>
            <tr><th>Aadhar</th><td>${quotation.aadhar}</td></tr>
            <tr><th>GSTIN ID</th><td>${quotation.gstin || "N/A"}</td></tr>
            <tr><th>Produce Item</th><td>${quotation.produce} (${quotation.category})</td></tr>
            <tr><th>Quantity</th><td>${quotation.quantity} kg</td></tr>
            <tr><th>Quoted Unit Price</th><td>₹${quotation.price} / kg</td></tr>
          </table>
        </div>
        <div class="total">
          Total Payout Amount: ₹${totalAmount}
        </div>
      </body>
      </html>
    `;

    const buffer = Buffer.from(invoiceHtml, 'utf8');
    const objectKey = `invoices/invoice-${quotation.id}-${Date.now()}.html`;
    let s3Url = "";

    // Upload to S3
    try {
      const s3Client = new S3Client({ region: REGION });
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Body: buffer,
        ContentType: 'text/html'
      }));
      s3Url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${objectKey}`;
      console.log(`✅ Uploaded invoice to S3: ${s3Url}`);
    } catch (s3Error) {
      console.warn("⚠️ S3 upload failed, using local storage fallback", s3Error);
    }

    // Local Fallback
    if (!s3Url) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `invoice-${quotation.id}.html`;
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      s3Url = `/uploads/invoices/${filename}`;
    }

    // Insert Invoice
    const [invoice] = await db.insert(invoicesTable).values({
      vendorId: quotation.vendorId,
      quotationId: quotation.id,
      invoiceNumber,
      s3Url,
      amount: totalAmount,
    }).returning();

    res.status(201).json(invoice);
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

// PUT /api/admin/quotations/:id/payout - Admin marks payout paid
router.put("/api/admin/quotations/:id/payout", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!["unpaid", "processing", "paid"].includes(paymentStatus)) {
    res.status(400).json({ error: "Invalid payment status" });
    return;
  }

  try {
    const [updated] = await db.update(vendorQuotationsTable).set({ paymentStatus }).where(eq(vendorQuotationsTable.id, Number(id))).returning();
    res.json(updated);
  } catch (error) {
    console.error("Error updating payout status:", error);
    res.status(500).json({ error: "Failed to update payout status" });
  }
});

// GET /api/vendors/:id
router.get("/vendors/:id", async (req, res) => {
  const parsed = GetVendorParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, parsed.data.id))
    .limit(1);
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(formatVendor(vendor));
});

// PUT /api/vendors/:id
router.put("/vendors/:id", requireAdmin, async (req, res) => {
  const paramsParsed = UpdateVendorParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateVendorBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const data = bodyParsed.data;

  try {
    const [vendor] = await db
      .update(vendorsTable)
      .set({
        ...data,
        email: data.email ?? null,
        farmSize: data.farmSize ?? null,
        notes: data.notes ?? null,
      })
      .where(eq(vendorsTable.id, paramsParsed.data.id))
      .returning();

    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    // CRITICAL: If Vendor status was updated, mirror active status to the User row
    if (vendor.userId) {
      const activeState = vendor.status === "approved";
      await db.update(usersTable).set({ active: activeState }).where(eq(usersTable.id, vendor.userId));
    }

    res.json(formatVendor(vendor));
  } catch (err) {
    console.error("Vendor update error:", err);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

// DELETE /api/vendors/:id
router.delete("/vendors/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteVendorParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await db
    .delete(vendorsTable)
    .where(eq(vendorsTable.id, parsed.data.id))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.status(204).end();
});

export default router;
