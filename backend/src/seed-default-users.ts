import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool, usersTable, vendorsTable, vendorQuotationsTable, invoicesTable } from './lib/db.js';
import { eq } from 'drizzle-orm';

async function seedDefaultUsers() {
  console.log('🌱 Ensuring test accounts and vendor transaction history exist...');

  try {
    const passwordHash = await bcrypt.hash('Devops@768', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    const testUsers: Array<{
      name: string;
      email: string;
      passwordHash: string;
      role: 'user' | 'admin' | 'vendor' | 'delivery';
      active: boolean;
      phone: string;
      city: string;
    }> = [
      { name: 'Sunotal Admin', email: 'admin@sunotal.com', passwordHash: adminPasswordHash, role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' },
      { name: 'Sunotal Customer', email: 'user@sunotal.com', passwordHash, role: 'user', active: true, phone: '+91 98765 00002', city: 'Bengaluru' },
      { name: 'Sunotal Vendor', email: 'vendor@sunotal.com', passwordHash, role: 'vendor', active: true, phone: '+91 98765 00003', city: 'Bengaluru Sourcing Hub' },
      { name: 'Sunotal Delivery Rider', email: 'rider@sunotal.com', passwordHash, role: 'delivery', active: true, phone: '+91 98765 00004', city: 'HSR Dark Store #104' },
    ];

    for (const u of testUsers) {
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, u.email)).limit(1);
      if (!existing) {
        const [inserted] = await db.insert(usersTable).values(u).returning();
        console.log(`✅ Created user ${u.email} (ID: ${inserted.id})`);
      } else {
        await db.update(usersTable).set({ passwordHash: u.passwordHash, active: true, role: u.role }).where(eq(usersTable.id, existing.id));
        console.log(`🔄 Updated password & active status for ${u.email} (ID: ${existing.id})`);
      }
    }

    // Get vendor@sunotal.com user ID
    const [vendorUser] = await db.select().from(usersTable).where(eq(usersTable.email, 'vendor@sunotal.com')).limit(1);
    if (vendorUser) {
      // Ensure vendor profile
      let [vendorProfile] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, vendorUser.id)).limit(1);
      if (!vendorProfile) {
        [vendorProfile] = await db.insert(vendorsTable).values({
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
        }).returning();
        console.log(`✅ Created vendor profile ID: ${vendorProfile.id}`);
      } else {
        await db.update(vendorsTable).set({ status: 'approved' }).where(eq(vendorsTable.id, vendorProfile.id));
      }

      // Check existing quotations for this vendor
      const existingQuotes = await db.select().from(vendorQuotationsTable).where(eq(vendorQuotationsTable.vendorId, vendorProfile.id));
      if (existingQuotes.length === 0) {
        console.log('📦 Seeding previous transactions (quotations & invoices) for vendor@sunotal.com...');
        
        const q1 = await db.insert(vendorQuotationsTable).values({
          vendorId: vendorProfile.id,
          name: 'Sunotal Farm Vendor',
          address: 'Bengaluru Direct Sourcing Mandal',
          phone: '+91 98765 00003',
          email: 'vendor@sunotal.com',
          aadhar: '1234-5678-9012',
          gstin: '29ABCDE1234F1Z5',
          category: 'Grains',
          produce: 'Sona Masoori Rice',
          quantity: 50,
          price: 3500,
          status: 'accepted',
          paymentStatus: 'paid',
        }).returning();

        await db.insert(invoicesTable).values({
          vendorId: vendorProfile.id,
          quotationId: q1[0].id,
          invoiceNumber: `INV-VEND-${q1[0].id}-8821`,
          s3Url: `/uploads/invoices/invoice-${q1[0].id}.html`,
          amount: 175000,
        });

        const q2 = await db.insert(vendorQuotationsTable).values({
          vendorId: vendorProfile.id,
          name: 'Sunotal Farm Vendor',
          address: 'Bengaluru Direct Sourcing Mandal',
          phone: '+91 98765 00003',
          email: 'vendor@sunotal.com',
          aadhar: '1234-5678-9012',
          gstin: '29ABCDE1234F1Z5',
          category: 'Vegetables',
          produce: 'Organic Tomatoes',
          quantity: 20,
          price: 2200,
          status: 'accepted',
          paymentStatus: 'paid',
        }).returning();

        await db.insert(invoicesTable).values({
          vendorId: vendorProfile.id,
          quotationId: q2[0].id,
          invoiceNumber: `INV-VEND-${q2[0].id}-9942`,
          s3Url: `/uploads/invoices/invoice-${q2[0].id}.html`,
          amount: 44000,
        });

        await db.insert(vendorQuotationsTable).values({
          vendorId: vendorProfile.id,
          name: 'Sunotal Farm Vendor',
          address: 'Bengaluru Direct Sourcing Mandal',
          phone: '+91 98765 00003',
          email: 'vendor@sunotal.com',
          aadhar: '1234-5678-9012',
          gstin: '29ABCDE1234F1Z5',
          category: 'Dairy',
          produce: 'A2 Desi Cow Milk',
          quantity: 500,
          price: 65,
          status: 'accepted',
          paymentStatus: 'processing',
        });

        await db.insert(vendorQuotationsTable).values({
          vendorId: vendorProfile.id,
          name: 'Sunotal Farm Vendor',
          address: 'Bengaluru Direct Sourcing Mandal',
          phone: '+91 98765 00003',
          email: 'vendor@sunotal.com',
          aadhar: '1234-5678-9012',
          gstin: '29ABCDE1234F1Z5',
          category: 'Fruits',
          produce: 'Fresh Alphonso Mangoes',
          quantity: 15,
          price: 8500,
          status: 'pending',
          paymentStatus: 'unpaid',
        });

        console.log('✅ Vendor transaction history seeded successfully!');
      }
    }

    console.log('🎉 Default accounts & transaction seeding completed!');
  } catch (err) {
    console.error('❌ Error seeding default users:', err);
  } finally {
    await pool.end();
  }
}

seedDefaultUsers();
