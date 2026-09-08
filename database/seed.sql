-- Sunotal Grocery — Initial Database Truncation & Seed SQL Script
-- Default admin password: admin123 (bcrypt 10 rounds)

TRUNCATE TABLE order_items, orders, invoices, inventory, vendor_quotations, vendors, products, categories, users CASCADE;

INSERT INTO users (name, email, password_hash, role, active, phone, city) VALUES
  ('Admin User', 'admin@sunotal.com', '$2b$10$Hhn8rK6hQDLDbYSjo8kqeevw.DHzDTaWY.D9VCPajRbCeS6piXECy', 'admin', true, '+91 98765 00001', 'Hyderabad');


