import mongoose, { Schema, Document } from "mongoose";

// --- USER MODEL ---
export interface IUser extends Document {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin" | "vendor" | "delivery";
  active: boolean;
  phone?: string;
  city?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "vendor", "delivery"], default: "user" },
    active: { type: Boolean, default: true },
    phone: { type: String },
    city: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ role: 1, active: 1 });

UserSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await User.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);


// --- CATEGORY MODEL ---
export interface ICategory extends Document {
  id: number;
  name: string;
  icon?: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, unique: true },
    icon: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

CategorySchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Category.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);


// --- PRODUCT MODEL ---
export interface IProduct extends Document {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  image: string;
  badge?: string;
  organic: boolean;
  active: boolean;
  description?: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    image: { type: String, required: true },
    badge: { type: String },
    organic: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

ProductSchema.index({ category: 1, active: 1 });
ProductSchema.index({ name: "text" });

ProductSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Product.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);


// --- VENDOR MODEL ---
export interface IVendor extends Document {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  produce: string;
  email?: string;
  farmSize?: string;
  aadhar?: string;
  gstin?: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountHolderName?: string;
  createdAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    id: { type: Number, unique: true, index: true },
    userId: { type: Number, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    produce: { type: String, required: true },
    email: { type: String },
    farmSize: { type: String },
    aadhar: { type: String },
    gstin: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    notes: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    branchName: { type: String },
    accountHolderName: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

VendorSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Vendor.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Vendor = mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);


// --- VENDOR QUOTATION MODEL ---
export interface IVendorQuotation extends Document {
  id: number;
  vendorId: number;
  name: string;
  address: string;
  phone: string;
  email?: string;
  aadhar: string;
  gstin?: string;
  category: string;
  produce: string;
  quantity: number;
  unit: string;
  price: number;
  status: "pending" | "accepted" | "rejected";
  paymentStatus: "unpaid" | "processing" | "paid";
  createdAt: Date;
}

const VendorQuotationSchema = new Schema<IVendorQuotation>(
  {
    id: { type: Number, unique: true, index: true },
    vendorId: { type: Number, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    aadhar: { type: String, required: true },
    gstin: { type: String },
    category: { type: String, required: true },
    produce: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: "Quintal" },
    price: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    paymentStatus: { type: String, enum: ["unpaid", "processing", "paid"], default: "unpaid" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

VendorQuotationSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await VendorQuotation.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const VendorQuotation = mongoose.models.VendorQuotation || mongoose.model<IVendorQuotation>("VendorQuotation", VendorQuotationSchema);


// --- INVOICE MODEL ---
export interface IInvoice extends Document {
  id: number;
  vendorId: number;
  quotationId: number;
  invoiceNumber: string;
  s3Url: string;
  amount: number;
  createdAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    id: { type: Number, unique: true, index: true },
    vendorId: { type: Number, required: true },
    quotationId: { type: Number, required: true },
    invoiceNumber: { type: String, required: true },
    s3Url: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

InvoiceSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Invoice.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);


// --- INVENTORY MODEL ---
export interface IInventory extends Document {
  id: number;
  productId: number;
  vendorId: number;
  warehouseId?: number;
  warehouseName?: string;
  quantity: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    id: { type: Number, unique: true, index: true },
    productId: { type: Number, required: true },
    vendorId: { type: Number, required: true },
    warehouseId: { type: Number },
    warehouseName: { type: String },
    quantity: { type: Number, default: 0 },
    status: { type: String, default: "in_stock" },
    notes: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

InventorySchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Inventory.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Inventory = mongoose.models.Inventory || mongoose.model<IInventory>("Inventory", InventorySchema);


// --- WAREHOUSE MODEL ---
export interface IWarehouse extends Document {
  id: number;
  name: string;
  code: string;
  city: string;
  location: string;
  address: string;
  radiusKm: number;
  baseFee: number;
  perKmFee: number;
  managerName?: string;
  contactPhone?: string;
  status: "active" | "maintenance" | "closed";
  createdAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true },
    radiusKm: { type: Number, default: 15 },
    baseFee: { type: Number, default: 25 },
    perKmFee: { type: Number, default: 8 },
    managerName: { type: String },
    contactPhone: { type: String },
    status: { type: String, enum: ["active", "maintenance", "closed"], default: "active" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

WarehouseSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Warehouse.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Warehouse = mongoose.models.Warehouse || mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);


// --- ORDER MODEL ---
export interface IOrder extends Document {
  id: number;
  orderId: string;
  userId: number;
  customerName: string;
  customerEmail: string;
  items: any[];
  totalAmount: number;
  status: "placed" | "processing" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  paymentMethod: string;
  paymentStatus: string;
  driverId?: number;
  driverName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    id: { type: Number, unique: true, index: true },
    orderId: { type: String, required: true, unique: true },
    userId: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    items: { type: Schema.Types.Mixed, default: [] },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["placed", "processing", "packed", "out_for_delivery", "delivered", "cancelled"],
      default: "placed",
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    paymentMethod: { type: String, default: "card" },
    paymentStatus: { type: String, default: "paid" },
    driverId: { type: Number },
    driverName: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderId: 1 });

OrderSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Order.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);


// --- SUPPORT TICKET MODEL ---
export interface ISupportTicket extends Document {
  id: number;
  ticketId: string;
  role: "user" | "vendor" | "delivery";
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  category: string;
  orderId?: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  resolution?: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    id: { type: Number, unique: true, index: true },
    ticketId: { type: String, required: true, unique: true },
    role: { type: String, enum: ["user", "vendor", "delivery"], required: true },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true },
    senderPhone: { type: String },
    category: { type: String, required: true },
    orderId: { type: String },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
    resolution: { type: String },
    resolvedBy: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

SupportTicketSchema.index({ role: 1, status: 1 });
SupportTicketSchema.index({ ticketId: 1 });

SupportTicketSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await SupportTicket.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const SupportTicket = mongoose.models.SupportTicket || mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);


// --- BANNER MODEL ---
export interface IBanner extends Document {
  id: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  createdAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

BannerSchema.pre("save", async function (this: any, next: any) {
  if (this.isNew && !this.id) {
    const count = await Banner.countDocuments();
    this.id = count + 1;
  }
  next();
});

export const Banner = mongoose.models.Banner || mongoose.model<IBanner>("Banner", BannerSchema);
