import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

export const app = express();
const PORT = Number(process.env.PORT ?? 5004);
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/sunotal";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number },
    name: { type: String },
    email: { type: String },
    passwordHash: { type: String },
    role: { type: String },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: true }
);

const User: any = mongoose.models.User || mongoose.model("User", UserSchema);


const inMemoryUsers: any[] = [
  { id: 1, name: "Admin User", email: "admin@sunotal.com", role: "admin", active: true, phone: "+91 98765 00001", city: "Hyderabad" },
];

app.get("/api/users", async (_req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({}, "-passwordHash");
      if (users && users.length > 0) return res.json(users);
    }
  } catch {
    // Fallback
  }
  return res.json(inMemoryUsers);
});

app.get("/api/users/:id", async (req: any, res: any) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ id: Number(req.params.id) }, "-passwordHash");
      if (user) return res.json(user);
    }
  } catch {
    // Fallback
  }
  const user = inMemoryUsers.find((u) => u.id === Number(req.params.id)) || inMemoryUsers[0];
  return res.json(user);
});

mongoose.set("bufferCommands", false);

app.get("/api/healthz", (_req, res) => res.json({ status: "ok", service: "user-service" }));

mongoose.connect(MONGODB_URI, { tlsInsecure: true, serverSelectionTimeoutMS: 3000 }).then(() => {
  console.log("⚡ [user-service] Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] Running on port ${PORT}`));
}).catch((err) => {
  console.warn("⚠️ [user-service] MongoDB connection warning:", err.message);
  app.listen(PORT, "0.0.0.0", () => console.log(`✅ [user-service] Running on port ${PORT}`));
});
