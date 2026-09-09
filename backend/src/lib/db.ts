import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  User,
  Category,
  Product,
  Vendor,
  VendorQuotation,
  Invoice,
  Inventory,
  Warehouse,
  Order,
  SupportTicket,
  Banner,
} from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";

export async function initDatabase() {
  try {
    console.log("🔄 Connecting to MongoDB document store (AWS Production compatible)...");
    
    const isProd = process.env.NODE_ENV === "production" || MONGODB_URI.includes("docdb.amazonaws.com") || MONGODB_URI.includes("mongodb.net");

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      tls: isProd || process.env.MONGODB_SSL === "true",
      tlsInsecure: true, // Allows AWS DocumentDB / MongoDB Atlas Free Tier self-signed/proxy TLS connections
      retryWrites: !MONGODB_URI.includes("docdb.amazonaws.com"), // DocumentDB requires retryWrites=false
    });
    console.log("✅ Connected to AWS DocumentDB / MongoDB document store successfully.");

    // Seed default role test accounts
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const userPasswordHash = await bcrypt.hash("user123", 10);
    const vendorPasswordHash = await bcrypt.hash("vendor123", 10);
    const riderPasswordHash = await bcrypt.hash("rider123", 10);

    const testUsers = [
      { name: "Sunotal Admin", email: "admin@sunotal.com", passwordHash: adminPasswordHash, role: "admin", active: true, phone: "+91 98765 00001", city: "Hyderabad" },
      { name: "Sunotal Customer", email: "user@sunotal.com", passwordHash: userPasswordHash, role: "user", active: true, phone: "+91 98765 00002", city: "Bengaluru" },
      { name: "Sunotal Vendor", email: "vendor@sunotal.com", passwordHash: vendorPasswordHash, role: "vendor", active: true, phone: "+91 98765 00003", city: "Bengaluru Sourcing Hub" },
      { name: "Sunotal Delivery Rider", email: "rider@sunotal.com", passwordHash: riderPasswordHash, role: "delivery", active: true, phone: "+91 98765 00004", city: "HSR Dark Store #104" },
    ];

    for (const u of testUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create(u);
        console.log(`✅ Created test user ${u.email}`);
      } else {
        await User.updateOne({ email: u.email }, { $set: { passwordHash: u.passwordHash, active: true, role: u.role } });
      }
    }

    // Seed categories if empty
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      await Category.insertMany([
        { name: "Vegetables", icon: "🥕" },
        { name: "Fruits", icon: "🍎" },
        { name: "Grains", icon: "🌾" },
        { name: "Dairy", icon: "🥛" },
        { name: "Herbs & Spices", icon: "🌿" },
      ]);
      console.log("✅ Default categories seeded in MongoDB.");
    }

    // Seed banners if empty
    const bannerCount = await Banner.countDocuments();
    if (bannerCount === 0) {
      await Banner.insertMany([
        {
          title: "Direct from Indian Farmers",
          subtitle: "100% Organic & Naturally Grown Produce",
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
          linkUrl: "/products",
          active: true,
        },
        {
          title: "Fresh Harvest of the Season",
          subtitle: "Delivered within 24 hours of plucking",
          imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80",
          linkUrl: "/products",
          active: true,
        },
      ]);
      console.log("✅ Default banners seeded in MongoDB.");
    }

    // Seed products if empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany([
        { name: "Organic Desi Tomato", category: "Vegetables", unit: "1 kg", price: 38, originalPrice: 48, discountPercentage: 20, image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80", organic: true, active: true, description: "Freshly harvested organic vine tomatoes." },
        { name: "Fresh Shimla Apples", category: "Fruits", unit: "1 kg", price: 160, originalPrice: 200, discountPercentage: 20, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80", organic: true, active: true, description: "Crisp and juicy royal Shimla apples." },
        { name: "Sona Masoori Rice", category: "Grains", unit: "5 kg", price: 340, originalPrice: 400, discountPercentage: 15, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80", organic: false, active: true, description: "Premium aged Sona Masoori rice." },
        { name: "A2 Organic Desi Cow Milk", category: "Dairy", unit: "1 L", price: 75, originalPrice: 85, discountPercentage: 11, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80", organic: true, active: true, description: "Pure A2 milk from free-range Gir cows." },
      ]);
      console.log("✅ Default catalog products seeded in MongoDB.");
    }

    console.log("✅ MongoDB database initialization completed.");
  } catch (err: any) {
    console.warn("⚠️ MongoDB connection warning (standalone mode fallback active):", err?.message || err);
  }
}

export {
  User,
  Category,
  Product,
  Vendor,
  VendorQuotation,
  Invoice,
  Inventory,
  Warehouse,
  Order,
  SupportTicket,
  Banner,
};
