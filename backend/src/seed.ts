import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool } from './lib/db.js';
import { usersTable } from './schema/users.js';
import { categoriesTable } from './schema/categories.js';
import { productsTable } from './schema/products.js';

async function seed() {
  console.log('🌱 Seeding database with exhaustive quick-commerce grocery categories and products...');

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Initial Accounts
    console.log('Seeding initial admin, vendor & customer accounts...');
    await db.insert(usersTable).values([
      { name: 'Admin User', email: 'admin@sunotal.com', passwordHash, role: 'admin', active: true, phone: '+91 98765 00001', city: 'Hyderabad' },
      { name: 'Farmer Ramesh Gowda', email: 'farmer@sunotal.com', passwordHash, role: 'vendor', active: true, phone: '+91 98765 00002', city: 'Mandya' },
      { name: 'Rider Suresh Kumar', email: 'rider@sunotal.com', passwordHash, role: 'user', active: true, phone: '+91 98765 00003', city: 'Bengaluru' }
    ]).onConflictDoUpdate({ target: usersTable.email, set: { passwordHash } });

    // Categories
    console.log('Seeding 10 exhaustive grocery categories...');
    const categories = [
      { name: 'Fresh Vegetables', icon: '🥦' },
      { name: 'Fresh Fruits', icon: '🍎' },
      { name: 'Dairy, Bread & Eggs', icon: '🥛' },
      { name: 'Atta, Rice & Grains', icon: '🌾' },
      { name: 'Cold Drinks & Juices', icon: '🧃' },
      { name: 'Snacks & Munchies', icon: '🍿' },
      { name: 'Bakery & Instant Food', icon: '🥐' },
      { name: 'Dry Fruits & Nuts', icon: '🥜' },
      { name: 'Meat, Fish & Poultry', icon: '🥩' },
      { name: 'Household & Cleaning', icon: '🧹' }
    ];

    for (const cat of categories) {
      await db.insert(categoriesTable).values(cat).onConflictDoNothing();
    }

    // Sample Products
    console.log('Seeding high-demand quick commerce products...');
    const sampleProducts = [
      {
        name: 'Farm Fresh Red Tomatoes',
        category: 'Fresh Vegetables',
        unit: '1 kg',
        price: 32,
        originalPrice: 45,
        discountPercentage: 28,
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800',
        badge: 'Best Seller',
        organic: true,
        active: true,
        description: 'Freshly harvested ripe red tomatoes from Mandya farms.',
      },
      {
        name: 'Nashik Red Onions',
        category: 'Fresh Vegetables',
        unit: '1 kg',
        price: 28,
        originalPrice: 35,
        discountPercentage: 20,
        image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800',
        badge: 'Daily Essential',
        organic: true,
        active: true,
        description: 'Crisp Grade-A Nashik red onions.',
      },
      {
        name: 'Farm Fresh Cow Milk (A2)',
        category: 'Dairy, Bread & Eggs',
        unit: '1 Liter',
        price: 65,
        originalPrice: 75,
        discountPercentage: 13,
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800',
        badge: '10-Min Delivery',
        organic: true,
        active: true,
        description: 'Pure A2 unpasteurized farm cow milk.',
      },
      {
        name: 'White Farm Eggs',
        category: 'Dairy, Bread & Eggs',
        unit: 'Pack of 12',
        price: 84,
        originalPrice: 96,
        discountPercentage: 12,
        image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=800',
        badge: 'High Protein',
        organic: false,
        active: true,
        description: 'Fresh white eggs delivered in protective eco-cushion.',
      },
      {
        name: 'Sona Masoori Raw Rice',
        category: 'Atta, Rice & Grains',
        unit: '5 kg',
        price: 315,
        originalPrice: 380,
        discountPercentage: 17,
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
        badge: 'Staple Choice',
        organic: true,
        active: true,
        description: 'Aged 100% pure Sona Masoori rice.',
      }
    ];

    for (const prod of sampleProducts) {
      await db.insert(productsTable).values(prod);
    }

    console.log('✅ Exhaustive database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
  } finally {
    await pool.end();
  }
}

seed();
