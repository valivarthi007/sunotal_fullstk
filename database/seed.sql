-- Sunotal Farms — seed data
-- All demo passwords are: admin123
-- (bcrypt hash generated with 10 rounds)

INSERT INTO users (name, email, password_hash, role, active, phone, city) VALUES
  ('Admin User',   'admin@sunotal.com',  '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', 'admin', true,  '+91 98765 00001', 'Hyderabad'),
  ('Priya Sharma', 'priya@example.com',  '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', 'user',  true,  '+91 98765 43210', 'Hyderabad'),
  ('Raj Kumar',    'raj@example.com',    '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', 'user',  true,  '+91 87654 32109', 'Bengaluru'),
  ('Meena Reddy',  'meena@example.com',  '$2a$10$X7VYVBmMp/m0QE9cBLyHZeHXxA0LG7.MrIUCHGHFi4L3kbT3ynTKm', 'user',  false, '+91 76543 21098', 'Mumbai')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, unit, price, original_price, discount_percentage, image, badge, organic, active, description) VALUES
  ('Fresh Tomatoes',       'Vegetables', 'per kg',       40,  60,  33, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/tomatoes.jpg',   'Bestseller',  true,  true, 'Farm-fresh ripe tomatoes, picked daily.'),
  ('Alphonso Mangoes',     'Fruits',     'per dozen',   299, 450,  33, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/mangoes.jpg',    'Seasonal',    true,  true, 'Premium GI-tagged Alphonso mangoes.'),
  ('Fresh Spinach',        'Vegetables', 'per 500g',     30,  45,  33, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/spinach.jpg',    NULL,          true,  true, 'Tender spinach leaves, pesticide-free.'),
  ('Farm Fresh Milk',      'Dairy',      'per litre',    60,  72,  17, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/milk.jpg',       'Daily Fresh', false, true, 'Pure cow milk, delivered fresh each morning.'),
  ('Premium Cashews',      'Dry Fruits', 'per 500g',    349, 499,  30, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/cashews.jpg',    NULL,          false, true, 'Whole jumbo cashews, naturally dried.'),
  ('Organic Basmati Rice', 'Grains',     'per kg',       95, 130,  27, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/rice.jpg',       NULL,          true,  true, 'Long-grain aged basmati, chemical-free.'),
  ('Mixed Vegetables Box', 'Vegetables', '5 kg box',    199, 300,  34, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/vegetables.jpg', 'Value Pack',  true,  true, 'Seasonal mix: tomatoes, capsicum, carrots.'),
  ('Seasonal Fruits Basket','Fruits',    '3 kg basket', 249, 370,  33, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/fruits.jpg',     NULL,          false, true, 'Curated mix of fresh seasonal fruits.'),
  ('Dairy Combo Pack',     'Dairy',      'combo',       199, 280,  29, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/dairy.jpg',      'Popular',     false, true, 'Milk 2L + Butter 500g + Curd 1kg.'),
  ('Mixed Dry Fruits',     'Dry Fruits', 'per 500g',    399, 550,  27, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/dry-fruits.jpg', NULL,          false, true, 'Premium mix: almonds, cashews, raisins.'),
  ('Red Apples',           'Fruits',     'per kg',      130, 180,  28, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/apples.jpg',     NULL,          true,  true, 'Crispy Shimla apples, imported grade A.'),
  ('Mixed Grain Pack',     'Grains',     '5 kg pack',   349, 480,  27, 'https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/grains.jpg',     NULL,          false, true, 'Wheat, rice, lentils & chickpeas combo.')
ON CONFLICT DO NOTHING;

INSERT INTO vendors (first_name, last_name, phone, location, produce, email, farm_size, status, notes) VALUES
  ('Ravi',    'Patel',  '+91 98765 11111', 'Nashik, Maharashtra',   'Tomatoes, Onions',       'ravi@farm.com',     '5 acres',  'approved', 'Verified organic farmer'),
  ('Suresh',  'Kumar',  '+91 87654 22222', 'Mysore, Karnataka',     'Alphonso Mangoes',       'suresh@mango.com',  '8 acres',  'approved', 'GI-certified mango producer'),
  ('Lakshmi', 'Devi',   '+91 76543 33333', 'Warangal, Telangana',   'Vegetables, Leafy Greens', NULL,              '3 acres',  'pending',  NULL),
  ('Mohan',   'Singh',  '+91 65432 44444', 'Punjab',                'Wheat, Rice, Pulses',    'mohan@grains.com',  '20 acres', 'approved', 'Bulk grain supplier'),
  ('Anita',   'Sharma', '+91 54321 55555', 'Coimbatore, Tamil Nadu','Coconuts, Bananas',       NULL,               '6 acres',  'pending',  NULL),
  ('Vijay',   'Reddy',  '+91 43210 66666', 'Guntur, Andhra Pradesh','Chilies, Capsicum',       'vijay@spice.com',  '4 acres',  'rejected', 'Quality standards not met')
ON CONFLICT DO NOTHING;
