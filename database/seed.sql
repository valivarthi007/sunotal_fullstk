-- Sunotal Farms — seed data
-- Default admin password: admin123
-- (bcrypt hash generated with 10 rounds)

INSERT INTO users (name, email, password_hash, role, active, phone, city) VALUES
  ('Admin User',   'admin@sunotal.com',  '$2b$10$Hhn8rK6hQDLDbYSjo8kqeevw.DHzDTaWY.D9VCPajRbCeS6piXECy', 'admin', true,  '+91 98765 00001', 'Hyderabad')
ON CONFLICT (email) DO NOTHING;

