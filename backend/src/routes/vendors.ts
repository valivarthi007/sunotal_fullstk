import { Router } from "express";
import { Vendor, User, VendorQuotation, Invoice, Product } from "../lib/db.js";
import { requireAdmin, requireAuth, verifyToken } from "../lib/auth.js";
import bcrypt from "bcryptjs";
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

function formatVendor(v: any) {
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
    bankName: v.bankName,
    accountNumber: v.accountNumber,
    ifscCode: v.ifscCode,
    branchName: v.branchName,
    accountHolderName: v.accountHolderName,
    status: v.status,
    notes: v.notes,
    createdAt: v.createdAt ? (typeof v.createdAt === "string" ? v.createdAt : v.createdAt.toISOString()) : new Date().toISOString(),
  };
}

// GET /api/vendors
router.get("/vendors", async (req, res) => {
  const parsed = ListVendorsQueryParams.safeParse(req.query);
  const { status, search } = parsed.success ? parsed.data : {};

  const filter: any = {};
  if (status) filter.status = status;
  if (search) filter.firstName = { $regex: search, $options: "i" };

  const vendors = await Vendor.find(filter);
  res.json(vendors.map((v: any) => formatVendor(v.toObject())));
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

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email: cleanEmail,
      passwordHash,
      role: "vendor",
      active: false, // Pending admin approval
      phone,
      city: location,
    });

    await Vendor.create({
      userId: user.id,
      firstName,
      lastName,
      phone,
      location,
      produce: "Pending Verification",
      email: cleanEmail,
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

// POST /api/vendors/quotations
router.post("/vendors/quotations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden. Only vendors can submit quotations." });
    return;
  }

  const vendor = await Vendor.findOne({ userId: user.userId });
  if (!vendor) {
    res.status(404).json({ error: "Vendor profile not found" });
    return;
  }

  if (vendor.status !== "approved") {
    res.status(403).json({ error: "Vendor account is not approved yet" });
    return;
  }

  const { category, produce, quantity, price, unit } = req.body;
  if (!category || !produce || !quantity || !price) {
    res.status(400).json({ error: "Missing required produce quotation fields" });
    return;
  }

  try {
    const quotation = await VendorQuotation.create({
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
      unit: unit || "Quintal",
      price: Number(price),
      status: "pending",
      paymentStatus: "unpaid",
    });

    res.status(201).json(quotation.toObject());
  } catch (error) {
    console.error("Quotation submission error:", error);
    res.status(500).json({ error: "Failed to submit quotation" });
  }
});

// GET /api/vendors/quotations
router.get("/vendors/quotations", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const vendor = await Vendor.findOne({ userId: user.userId });
  if (!vendor) {
    res.status(404).json({ error: "Vendor profile not found" });
    return;
  }

  const quotations = await VendorQuotation.find({ vendorId: vendor.id });
  res.json(quotations.map((q: any) => q.toObject()));
});

// GET /api/vendors/invoices
router.get("/vendors/invoices", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const vendor = await Vendor.findOne({ userId: user.userId });
  if (!vendor) {
    res.status(404).json({ error: "Vendor profile not found" });
    return;
  }

  const invoices = await Invoice.find({ vendorId: vendor.id });
  res.json(invoices.map((i: any) => i.toObject()));
});

// PUT /api/vendors/bank-details
router.put("/vendors/bank-details", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "vendor" && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { bankName, accountNumber, ifscCode, branchName, accountHolderName } = req.body;
  if (!accountNumber || !ifscCode || !accountHolderName) {
    res.status(400).json({ error: "Account Number, IFSC Code, and Account Holder Name are required." });
    return;
  }

  try {
    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      res.status(404).json({ error: "Vendor profile not found" });
      return;
    }

    const updated = await Vendor.findOneAndUpdate(
      { id: vendor.id },
      {
        $set: {
          bankName: bankName || null,
          accountNumber,
          ifscCode,
          branchName: branchName || null,
          accountHolderName,
        },
      },
      { new: true }
    );

    res.json(formatVendor(updated?.toObject()));
  } catch (error) {
    console.error("Failed to update bank details:", error);
    res.status(500).json({ error: "Failed to update bank details" });
  }
});

// GET /api/admin/quotations
router.get("/admin/quotations", requireAdmin, async (req, res) => {
  const quotations = await VendorQuotation.find();
  res.json(quotations.map((q: any) => q.toObject()));
});

// PUT /api/admin/quotations/:id/status
router.put("/admin/quotations/:id/status", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  try {
    const updated = await VendorQuotation.findOneAndUpdate(
      { id: Number(id) },
      { $set: { status } },
      { new: true }
    );
    res.json(updated?.toObject());
  } catch (error: any) {
    console.error("Error updating quotation status:", error);
    res.status(500).json({ error: error.message || "Failed to update quotation status" });
  }
});

// GET /api/vendors/:id
router.get("/vendors/:id", async (req, res) => {
  const parsed = GetVendorParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const vendor = await Vendor.findOne({ id: parsed.data.id });
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(formatVendor(vendor.toObject()));
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
    const vendor = await Vendor.findOneAndUpdate(
      { id: paramsParsed.data.id },
      { $set: data },
      { new: true }
    );

    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    if (vendor.userId) {
      const activeState = vendor.status === "approved";
      await User.updateOne({ id: vendor.userId }, { $set: { active: activeState } });
    }

    res.json(formatVendor(vendor.toObject()));
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
  const vendor = await Vendor.findOneAndDelete({ id: parsed.data.id });
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.status(204).end();
});

export default router;
