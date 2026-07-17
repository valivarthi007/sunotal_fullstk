import 'dotenv/config';
import { db, pool } from './lib/db.js';
import { usersTable } from './schema/users.js';
import { productsTable } from './schema/products.js';
import { vendorsTable } from './schema/vendors.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Users
    console.log('Seeding users...');
    await db.insert(usersTable).values([
      { name: 'Admin User', email: 'admin@sunotal.com', passwordHash: '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' },
      { name: 'Priya Sharma', email: 'priya@example.com', passwordHash: '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', role: 'user', active: true, phone: '+91 98765 43210', city: 'Hyderabad' },
      { name: 'Raj Kumar', email: 'raj@example.com', passwordHash: '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', role: 'user', active: true, phone: '+91 87654 32109', city: 'Bengaluru' },
      { name: 'Meena Reddy', email: 'meena@example.com', passwordHash: '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', role: 'user', active: false, phone: '+91 76543 21098', city: 'Mumbai' }
    ]).onConflictDoNothing({ target: usersTable.email });

    // Products
    console.log('Seeding products...');
    await db.insert(productsTable).values([
      { name: 'Fresh Tomatoes', category: 'Vegetables', unit: 'per kg', price: 40, originalPrice: 60, discountPercentage: 33, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/tomatoes.jpg', badge: 'Bestseller', organic: true, active: true, description: 'Farm-fresh ripe tomatoes, picked daily.' },
      { name: 'Alphonso Mangoes', category: 'Fruits', unit: 'per dozen', price: 299, originalPrice: 450, discountPercentage: 33, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/mangoes.jpg', badge: 'Seasonal', organic: true, active: true, description: 'Premium GI-tagged Alphonso mangoes.' },
      { name: 'Fresh Spinach', category: 'Vegetables', unit: 'per 500g', price: 30, originalPrice: 45, discountPercentage: 33, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/spinach.jpg', badge: null, organic: true, active: true, description: 'Tender spinach leaves, pesticide-free.' },
      { name: 'Farm Fresh Milk', category: 'Dairy', unit: 'per litre', price: 60, originalPrice: 72, discountPercentage: 17, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/milk.jpg', badge: 'Daily Fresh', organic: false, active: true, description: 'Pure cow milk, delivered fresh each morning.' },
      { name: 'Premium Cashews', category: 'Dry Fruits', unit: 'per 500g', price: 349, originalPrice: 499, discountPercentage: 30, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/cashews.jpg', badge: null, organic: false, active: true, description: 'Whole jumbo cashews, naturally dried.' },
      { name: 'Organic Basmati Rice', category: 'Grains', unit: 'per kg', price: 95, originalPrice: 130, discountPercentage: 27, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/rice.jpg', badge: null, organic: true, active: true, description: 'Long-grain aged basmati, chemical-free.' },
      { name: 'Mixed Vegetables Box', category: 'Vegetables', unit: '5 kg box', price: 199, originalPrice: 300, discountPercentage: 34, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/vegetables.jpg', badge: 'Value Pack', organic: true, active: true, description: 'Seasonal mix: tomatoes, capsicum, carrots.' },
      { name: 'Seasonal Fruits Basket', category: 'Fruits', unit: '3 kg basket', price: 249, originalPrice: 370, discountPercentage: 33, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/fruits.jpg', badge: null, organic: false, active: true, description: 'Curated mix of fresh seasonal fruits.' },
      { name: 'Dairy Combo Pack', category: 'Dairy', unit: 'combo', price: 199, originalPrice: 280, discountPercentage: 29, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/dairy.jpg', badge: 'Popular', organic: false, active: true, description: 'Milk 2L + Butter 500g + Curd 1kg.' },
      { name: 'Mixed Dry Fruits', category: 'Dry Fruits', unit: 'per 500g', price: 399, originalPrice: 550, discountPercentage: 27, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/dry-fruits.jpg', badge: null, organic: false, active: true, description: 'Premium mix: almonds, cashews, raisins.' },
      { name: 'Red Apples', category: 'Fruits', unit: 'per kg', price: 130, originalPrice: 180, discountPercentage: 28, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/apples.jpg', badge: null, organic: true, active: true, description: 'Crispy Shimla apples, imported grade A.' },
      { name: 'Mixed Grain Pack', category: 'Grains', unit: '5 kg pack', price: 349, originalPrice: 480, discountPercentage: 27, image: 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/grains.jpg', badge: null, organic: false, active: true, description: 'Wheat, rice, lentils & chickpeas combo.' }
    ]).onConflictDoNothing();

    // Vendors
    console.log('Seeding vendors...');
    await db.insert(vendorsTable).values([
      { firstName: 'Ravi', lastName: 'Patel', phone: '+91 98765 11111', location: 'Nashik, Maharashtra', produce: 'Tomatoes, Onions', email: 'ravi@farm.com', farmSize: '5 acres', status: 'approved', notes: 'Verified organic farmer' },
      { firstName: 'Suresh', lastName: 'Kumar', phone: '+91 87654 22222', location: 'Mysore, Karnataka', produce: 'Alphonso Mangoes', email: 'suresh@mango.com', farmSize: '8 acres', status: 'approved', notes: 'GI-certified mango producer' },
      { firstName: 'Lakshmi', lastName: 'Devi', phone: '+91 76543 33333', location: 'Warangal, Telangana', produce: 'Vegetables, Leafy Greens', email: null, farmSize: '3 acres', status: 'pending', notes: null },
      { firstName: 'Mohan', lastName: 'Singh', phone: '+91 65432 44444', location: 'Punjab', produce: 'Wheat, Rice, Pulses', email: 'mohan@grains.com', farmSize: '20 acres', status: 'approved', notes: 'Bulk grain supplier' },
      { firstName: 'Anita', lastName: 'Sharma', phone: '+91 54321 55555', location: 'Coimbatore, Tamil Nadu', produce: 'Coconuts, Bananas', email: null, farmSize: '6 acres', status: 'pending', notes: null },
      { firstName: 'Vijay', lastName: 'Reddy', phone: '+91 43210 66666', location: 'Guntur, Andhra Pradesh', produce: 'Chilies, Capsicum', email: 'vijay@spice.com', farmSize: '4 acres', status: 'rejected', notes: 'Quality standards not met' }
    ]).onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
  } finally {
    await pool.end();
  }
}

seed();
