import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import { db, usersTable } from './lib/db.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const app = express();
const PORT = Number(process.env.PORT ?? 5001);

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', authRouter);

app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: "ok" });
});

async function autoSeedAdmin() {
  try {
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, 'admin')).limit(1);
    if (admins.length === 0) {
      console.log('🌱 No admin user found in database. Auto-seeding default admin...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.insert(usersTable).values({
        name: 'Admin User',
        email: 'admin@sunotal.com',
        passwordHash,
        role: 'admin',
        active: true,
        phone: '+91 98765 00001',
        city: 'Hyderabad'
      });
      console.log('✅ Default admin account seeded: admin@sunotal.com / admin123');
    }
  } catch (err) {
    console.error('⚠️ Failed to check/seed admin user:', err);
  }
}

autoSeedAdmin().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth Service listening on port ${PORT}`);
  });
});
