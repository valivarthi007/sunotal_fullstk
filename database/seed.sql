-- Sunotal Grocery — Exhaustive Quick-Commerce Seed SQL Script
-- Default admin password: admin123 (bcrypt 10 rounds)

INSERT INTO users (name, email, password_hash, role, active, phone, city) VALUES
  ('Admin User', 'admin@sunotal.com', '$2b$10$Hhn8rK6hQDLDbYSjo8kqeevw.DHzDTaWY.D9VCPajRbCeS6piXECy', 'admin', true, '+91 98765 00001', 'Hyderabad'),
  ('Farmer Ramesh Gowda', 'farmer@sunotal.com', '$2b$10$Hhn8rK6hQDLDbYSjo8kqeevw.DHzDTaWY.D9VCPajRbCeS6piXECy', 'vendor', true, '+91 98765 00002', 'Mandya'),
  ('Rider Suresh Kumar', 'rider@sunotal.com', '$2b$10$Hhn8rK6hQDLDbYSjo8kqeevw.DHzDTaWY.D9VCPajRbCeS6piXECy', 'customer', true, '+91 98765 00003', 'Bengaluru')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, icon) VALUES
  ('Fresh Vegetables', '🥦'),
  ('Fresh Fruits', '🍎'),
  ('Dairy, Bread & Eggs', '🥛'),
  ('Atta, Rice & Grains', '🌾'),
  ('Cold Drinks & Juices', '🧃'),
  ('Snacks & Munchies', '🍿'),
  ('Bakery & Instant Food', '🥐'),
  ('Dry Fruits & Nuts', '🥜'),
  ('Meat, Fish & Poultry', '🥩'),
  ('Household & Cleaning', '🧹')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, category, unit, price, original_price, discount_percentage, image, badge, organic, active, description) VALUES
  ('Farm Fresh Red Tomatoes', 'Fresh Vegetables', '1 kg', 32, 45, 28, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800', 'Best Seller', true, true, 'Freshly harvested ripe red tomatoes from Mandya farms.'),
  ('Nashik Red Onions', 'Fresh Vegetables', '1 kg', 28, 35, 20, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800', 'Daily Essential', true, true, 'Crisp Grade-A Nashik red onions.'),
  ('Agra Organic Potatoes', 'Fresh Vegetables', '1 kg', 24, 30, 20, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800', 'Farm Direct', true, true, 'Pesticide-free organic Agra potatoes.'),
  ('Shimla Royal Red Apples', 'Fresh Fruits', '4 pcs (~500g)', 120, 150, 20, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800', 'Fresh Arrival', true, true, 'Juicy sweet Shimla apples harvested this week.'),
  ('Robusta Fresh Bananas', 'Fresh Fruits', '1 Dozen (~1kg)', 48, 60, 20, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800', 'Top Value', true, true, 'Naturally ripened chemical-free bananas.'),
  ('Farm Fresh Cow Milk (A2)', 'Dairy, Bread & Eggs', '1 Liter', 65, 75, 13, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800', '10-Min Delivery', true, true, 'Pure A2 unpasteurized farm cow milk.'),
  ('White Farm Eggs', 'Dairy, Bread & Eggs', 'Pack of 12', 84, 96, 12, 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=800', 'High Protein', false, true, 'Fresh white eggs delivered in protective eco-cushion.'),
  ('Amul Pasteurised Butter', 'Dairy, Bread & Eggs', '500 g', 275, 290, 5, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800', 'Popular', false, true, 'Delicious creamy butter for breakfast.'),
  ('Sona Masoori Raw Rice', 'Atta, Rice & Grains', '5 kg', 315, 380, 17, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800', 'Staple Choice', true, true, 'Aged 100% pure Sona Masoori rice.'),
  ('Organic Whole Wheat Atta', 'Atta, Rice & Grains', '5 kg', 235, 270, 12, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800', 'Chakki Fresh', true, true, 'Traditional stone-ground whole wheat atta.');
