import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Vendor, Product, Category, Order, SupportTicket, Warehouse, Banner } from './lib/db.js';

async function seed() {
  console.log('🌱 Initializing MERN MongoDB seed records...');

  try {
    const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";
    await mongoose.connect(MONGODB_URI);

    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    const vendorHash = await bcrypt.hash('vendor123', 10);
    const riderHash = await bcrypt.hash('rider123', 10);

    const testUsers = [
      { name: 'Sunotal Admin', email: 'admin@sunotal.com', passwordHash: adminHash, role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' },
      { name: 'Sunotal Customer', email: 'user@sunotal.com', passwordHash: userHash, role: 'user', active: true, phone: '+91 98765 00002', city: 'Bengaluru' },
      { name: 'Sunotal Vendor', email: 'vendor@sunotal.com', passwordHash: vendorHash, role: 'vendor', active: true, phone: '+91 98765 00003', city: 'Bengaluru Sourcing Hub' },
      { name: 'Sunotal Delivery Rider', email: 'rider@sunotal.com', passwordHash: riderHash, role: 'delivery', active: true, phone: '+91 98765 00004', city: 'HSR Dark Store #104' },
    ];

    for (const u of testUsers) {
      await User.findOneAndUpdate({ email: u.email }, { $set: u }, { upsert: true, new: true });
    }

    console.log('✅ MongoDB MERN seed accounts configured successfully!');
  } catch (err) {
    console.error('❌ Failed to seed MongoDB database:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
