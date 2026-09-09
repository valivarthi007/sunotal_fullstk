import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Vendor, VendorQuotation, Invoice } from './lib/db.js';

async function seedDefaultUsers() {
  console.log('🌱 Ensuring test accounts and vendor transaction history exist in MongoDB...');

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

    const vendorUser = await User.findOne({ email: 'vendor@sunotal.com' });
    if (vendorUser) {
      let vendorProfile = await Vendor.findOne({ userId: vendorUser.id });
      if (!vendorProfile) {
        vendorProfile = await Vendor.create({
          userId: vendorUser.id,
          firstName: 'Sunotal',
          lastName: 'Farm Vendor',
          phone: '+91 98765 00003',
          location: 'Bengaluru Direct Sourcing Mandal',
          produce: 'Organic Vegetables, Fruits & Grains',
          email: 'vendor@sunotal.com',
          farmSize: '25 Acres',
          aadhar: '1234-5678-9012',
          gstin: '29ABCDE1234F1Z5',
          status: 'approved',
          notes: 'Primary Verified Farm Supplier',
        });
      } else {
        await Vendor.updateOne({ id: vendorProfile.id }, { $set: { status: 'approved' } });
      }
    }

    console.log('🎉 Default MERN accounts & transaction seeding completed!');
  } catch (err) {
    console.error('❌ Error seeding default users:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDefaultUsers();
