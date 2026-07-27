import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { getGetCurrentUserQueryKey, useGetCurrentUser } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User as UserIcon,
  MapPin,
  ShoppingBag,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PhoneCall,
  ShieldAlert,
  LifeBuoy,
  Plus,
  Trash2,
  Edit2,
  Search,
  MessageSquare,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useLocationState } from "@/lib/location-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  phone?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  image?: string;
  farmerName?: string;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  totalPrice: number;
  status: "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  estimatedDelivery: string;
  deliveryAddress: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNo?: string;
}

export interface Grievance {
  ticketId: string;
  orderId: string;
  type: string;
  description: string;
  preferredResolution: string;
  status: "Open" | "In Review" | "Resolved" | "Refund Processed";
  createdAt: string;
  responseMsg?: string;
}

const SAMPLE_ORDERS: Order[] = [
  {
    id: "SUN-894210",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    items: [
      { id: 1, name: "Organic Farm Fresh Spinach", unit: "500g", price: 45, quantity: 2, image: "https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/vegetables.jpg", farmerName: "Raju Farmer (Jubilee Hub)" },
      { id: 2, name: "Premium Alphonso Mangoes", unit: "1 kg", price: 320, quantity: 1, image: "https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/fruits.jpg", farmerName: "Venkatesh Organic Orchards" },
    ],
    totalPrice: 410,
    status: "out_for_delivery",
    estimatedDelivery: "In 25-35 mins",
    deliveryAddress: "Flat 402, Sunotal Tech Park, Hitec City",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    paymentMethod: "Corporate PO / Card",
    driverName: "Srinivas Rao",
    driverPhone: "+91 98765 43210",
    vehicleNo: "TG-09-EV-8842",
  },
  {
    id: "SUN-761204",
    date: "24 Jul 2026",
    items: [
      { id: 3, name: "Pure Cow Milk A2", unit: "1 L", price: 75, quantity: 2, image: "https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/grains.jpg", farmerName: "Green Pastures Dairy" },
    ],
    totalPrice: 150,
    status: "delivered",
    estimatedDelivery: "Delivered on Jul 24",
    deliveryAddress: "Building 3B, Mindspace, Madhapur",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    paymentMethod: "UPI",
  },
];

const STORAGE_ORDERS_KEY = "sunotal_user_orders";
const STORAGE_GRIEVANCES_KEY = "sunotal_user_grievances";

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { location: userLoc } = useLocationState();

  const [activeTab, setActiveTab] = useState<"account" | "orders" | "grievances">("orders");

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddr, setEditingAddr] = useState<null | Address>(null);

  // Orders & Grievances state
  const [orders, setOrders] = useState<Order[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selectedOrderTrack, setSelectedOrderTrack] = useState<Order | null>(null);

  // Grievance Form state
  const [grievanceOrder, setGrievanceOrder] = useState<Order | null>(null);
  const [grievanceType, setGrievanceType] = useState("Damaged / Quality Issue");
  const [grievanceDesc, setGrievanceDesc] = useState("");
  const [grievanceResolution, setGrievanceResolution] = useState("Full Refund");
  const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // Load user data, orders & grievances
  useEffect(() => {
    if (!user) return;

    // Load addresses
    try {
      const raw = localStorage.getItem(`user_addresses_${user.id}`) || "[]";
      setAddresses(JSON.parse(raw));
    } catch {
      setAddresses([]);
    }

    // Load orders
    try {
      const storedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      } else {
        setOrders(SAMPLE_ORDERS);
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(SAMPLE_ORDERS));
      }

      // Load grievances
      const storedGrievances = localStorage.getItem(STORAGE_GRIEVANCES_KEY);
      if (storedGrievances) {
        setGrievances(JSON.parse(storedGrievances));
      } else {
        const defaultGrv: Grievance[] = [
          {
            ticketId: "GRV-2026-1049",
            orderId: "SUN-761204",
            type: "Packaging Issue",
            description: "Milk seal was slightly loose upon delivery.",
            preferredResolution: "Replacement Bottle",
            status: "Resolved",
            createdAt: "24 Jul 2026",
            responseMsg: "Apologies! We credited ₹75 to your Sunotal wallet and replaced your bottle.",
          },
        ];
        setGrievances(defaultGrv);
        localStorage.setItem(STORAGE_GRIEVANCES_KEY, JSON.stringify(defaultGrv));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  function persistAddresses(list: Address[]) {
    if (!user) return;
    localStorage.setItem(`user_addresses_${user.id}`, JSON.stringify(list));
    setAddresses(list);
  }

  const handleSaveAddr = (addr: Address) => {
    const next = addresses.some((a) => a.id === addr.id)
      ? addresses.map((a) => (a.id === addr.id ? addr : a))
      : [...addresses, addr];
    persistAddresses(next);
    setEditingAddr(null);
    toast.success("Address saved");
  };

  const handleDeleteAddr = (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    persistAddresses(next);
    toast.success("Address removed");
  };

  const handleRaiseGrievanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceOrder) return;
    if (!grievanceDesc.trim()) {
      toast.error("Please describe your issue");
      return;
    }

    setIsSubmittingGrievance(true);
    setTimeout(() => {
      const newTicketId = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newGrievance: Grievance = {
        ticketId: newTicketId,
        orderId: grievanceOrder.id,
        type: grievanceType,
        description: grievanceDesc,
        preferredResolution: grievanceResolution,
        status: "In Review",
        createdAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        responseMsg: "Grievance received. Our Quality Inspection Team is reviewing your ticket.",
      };

      const updated = [newGrievance, ...grievances];
      setGrievances(updated);
      localStorage.setItem(STORAGE_GRIEVANCES_KEY, JSON.stringify(updated));

      setIsSubmittingGrievance(false);
      setGrievanceOrder(null);
      setGrievanceDesc("");
      toast.success(`Grievance ticket ${newTicketId} registered! Support team will respond shortly.`);
      setActiveTab("grievances");
    }, 600);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  if (!user) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <div className="bg-card border border-border rounded-3xl p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <UserIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-secondary">Account Access Required</h2>
            <p className="text-muted-foreground text-sm">Please log in to access your profile, orders, and grievances.</p>
            <Button onClick={() => setLocation("/login")} className="w-full rounded-xl font-bold">
              Sign In to Your Account
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* User Top Profile Header */}
        <div className="bg-gradient-to-r from-secondary via-secondary/95 to-secondary/90 text-secondary-foreground rounded-3xl p-6 sm:p-8 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-lg shadow-primary/20 shrink-0">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{user.name}</h1>
                <span className="px-3 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/30">
                  Verified Member
                </span>
              </div>
              <p className="text-secondary-foreground/70 text-xs sm:text-sm mt-0.5">{user.email}</p>
              <div className="flex items-center gap-3 text-xs text-secondary-foreground/80 mt-2">
                <span className="flex items-center gap-1 font-semibold text-green-400">
                  <MapPin className="w-3.5 h-3.5" /> {userLoc.city}, {userLoc.state || userLoc.country}
                </span>
                <span>•</span>
                <span>Phone: {user.phone || "Not set"}</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 rounded-xl gap-2 text-xs font-bold"
            onClick={() => {
              localStorage.removeItem("sunotal_token");
              queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
              setLocation("/");
            }}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        {/* Unified Profile Control Bar (Tabs) */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-4 mb-8">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "orders"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> My Orders & Tracking ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab("grievances")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "grievances"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <LifeBuoy className="w-4 h-4" /> Grievances & Tickets ({grievances.length})
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "account"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-4 h-4" /> Account & Saved Addresses ({addresses.length})
          </button>
        </div>

        {/* TAB 1: MY ORDERS & LIVE TRACKING */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Order ID, produce item or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-card border-border rounded-xl text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Showing <strong>{filteredOrders.length}</strong> placed orders
              </p>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-secondary mb-1">No orders found</h3>
                <p className="text-muted-foreground text-sm mb-6">Explore our farm-fresh catalog to place your first order.</p>
                <Button onClick={() => setLocation("/products")} className="rounded-full px-8 font-bold">
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredOrders.map((order) => {
                  const isOutForDel = order.status === "out_for_delivery";
                  const isDelivered = order.status === "delivered";

                  return (
                    <div key={order.id} className="bg-card border border-border shadow-sm hover:shadow-md rounded-3xl p-6 transition-all space-y-4">
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-base text-secondary">{order.id}</p>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                  isOutForDel
                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                    : isDelivered
                                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                    : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                }`}
                              >
                                {isOutForDel ? "🚚 Out for Delivery" : isDelivered ? "✅ Delivered" : "📦 Processing"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">Placed on {order.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => setSelectedOrderTrack(order)}
                          >
                            <Truck className="w-4 h-4 mr-1.5" /> Track Live Shipment
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setGrievanceOrder(order)}
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" /> Raise Grievance
                          </Button>
                        </div>
                      </div>

                      {/* Items Row */}
                      <div className="grid md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 space-y-3">
                          <div className="flex flex-wrap gap-4">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 bg-accent/30 p-2.5 rounded-2xl border border-border/60">
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border shrink-0" />
                                )}
                                <div>
                                  <p className="font-semibold text-xs text-secondary leading-tight line-clamp-1">{item.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.quantity} × {item.unit}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" /> Estimated Delivery: <strong className="text-secondary">{order.estimatedDelivery}</strong>
                          </p>
                        </div>

                        <div className="md:col-span-4 md:text-right border-t md:border-t-0 pt-3 md:pt-0">
                          <p className="text-xs text-muted-foreground">Total Amount Paid</p>
                          <p className="text-2xl font-extrabold text-primary">{fmt(order.totalPrice)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{order.paymentMethod}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GRIEVANCE TICKETS */}
        {activeTab === "grievances" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl text-secondary">Support & Grievance Tickets</h2>
              <p className="text-xs text-muted-foreground">Average resolution time: <strong>&lt; 2 Hours</strong></p>
            </div>

            {grievances.length === 0 ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <LifeBuoy className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-secondary mb-1">No grievances raised</h3>
                <p className="text-muted-foreground text-sm">
                  Need help with an order? Click "Raise Grievance" next to any order in the My Orders tab.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {grievances.map((ticket) => (
                  <div key={ticket.ticketId} className="bg-card border border-border shadow-sm rounded-3xl p-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-secondary">{ticket.ticketId}</span>
                            <span className="text-xs text-muted-foreground">(Order {ticket.orderId})</span>
                          </div>
                          <p className="text-xs font-semibold text-primary">{ticket.type}</p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          ticket.status === "Resolved"
                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-secondary font-medium">"{ticket.description}"</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-accent/30 p-3 rounded-xl border">
                        <span>Requested Resolution: <strong>{ticket.preferredResolution}</strong></span>
                        <span>Filed on {ticket.createdAt}</span>
                      </div>
                      {ticket.responseMsg && (
                        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-secondary space-y-1">
                          <p className="font-bold text-primary flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" /> Support Response:
                          </p>
                          <p>{ticket.responseMsg}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT & SAVED ADDRESSES */}
        {activeTab === "account" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <h2 className="font-bold text-lg text-secondary border-b pb-3">Personal Info</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Full Name</span>
                  <p className="font-bold text-secondary">{user.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email Address</span>
                  <p className="font-semibold text-secondary">{user.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Phone Number</span>
                  <p className="font-semibold text-secondary">{user.phone || "Not set"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Detected City</span>
                  <p className="font-bold text-primary">{userLoc.city}, {userLoc.state}</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="font-bold text-lg text-secondary">Saved Delivery Addresses</h2>
                  <p className="text-xs text-muted-foreground">Manage your home, office, and corporate hub addresses</p>
                </div>
                <Button
                  onClick={() =>
                    setEditingAddr({ id: String(Date.now()), label: "Office", line1: "", line2: "", city: userLoc.city || "Hyderabad", phone: user.phone || "" })
                  }
                  className="rounded-xl font-bold text-xs gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add New Address
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No saved addresses. Click "Add New Address" to save your shipping destination.
                </div>
              ) : (
                <div className="grid gap-3">
                  {addresses.map((a) => (
                    <div key={a.id} className="p-4 border rounded-2xl flex items-start justify-between bg-accent/20">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {a.label}
                        </span>
                        <p className="font-bold text-secondary text-sm mt-1">{a.line1}</p>
                        {a.line2 && <p className="text-xs text-muted-foreground">{a.line2}</p>}
                        <p className="text-xs font-semibold text-secondary mt-0.5">{a.city}</p>
                        {a.phone && <p className="text-xs text-muted-foreground mt-0.5">Phone: {a.phone}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingAddr(a)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAddr(a.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Address Edit Dialog */}
              {editingAddr && (
                <div className="mt-4 p-5 border rounded-2xl bg-background space-y-3">
                  <h3 className="font-bold text-sm text-secondary">Save Address Details</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input placeholder="Label (Home, Office, Hub)" value={editingAddr.label} onChange={(e) => setEditingAddr({ ...editingAddr, label: e.target.value })} />
                    <Input placeholder="Phone Number" value={editingAddr.phone} onChange={(e) => setEditingAddr({ ...editingAddr, phone: e.target.value })} />
                    <Input placeholder="Address Line 1" value={editingAddr.line1} onChange={(e) => setEditingAddr({ ...editingAddr, line1: e.target.value })} className="sm:col-span-2" />
                    <Input placeholder="Address Line 2 (Optional)" value={editingAddr.line2} onChange={(e) => setEditingAddr({ ...editingAddr, line2: e.target.value })} />
                    <Input placeholder="City" value={editingAddr.city} onChange={(e) => setEditingAddr({ ...editingAddr, city: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingAddr(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => editingAddr && handleSaveAddr(editingAddr)}>Save Address</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: LIVE SHIPMENT TRACKER */}
        {selectedOrderTrack && (
          <Dialog open={!!selectedOrderTrack} onOpenChange={() => setSelectedOrderTrack(null)}>
            <DialogContent className="sm:max-w-xl rounded-3xl p-6 border-border shadow-2xl">
              <DialogHeader className="text-left space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <DialogTitle className="text-xl font-extrabold text-secondary">
                      Live Delivery Tracker
                    </DialogTitle>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {selectedOrderTrack.id}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Traceable express farm-to-door delivery stream.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Visual 4-Step Tracker Progress */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
                  {/* Step 1: Placed */}
                  <div className="relative flex items-start gap-4">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-4 ring-background">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-sm text-secondary">Order Placed & Confirmed</p>
                      <p className="text-xs text-muted-foreground">{selectedOrderTrack.date}</p>
                    </div>
                  </div>

                  {/* Step 2: Packed */}
                  <div className="relative flex items-start gap-4">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-4 ring-background">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-sm text-secondary">Quality Checked & Packed</p>
                      <p className="text-xs text-muted-foreground">Jubilee Hills Fulfillment Hub</p>
                    </div>
                  </div>

                  {/* Step 3: Out for Delivery */}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background ${
                        selectedOrderTrack.status === "out_for_delivery"
                          ? "bg-amber-500 text-white animate-bounce"
                          : selectedOrderTrack.status === "delivered"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedOrderTrack.status === "delivered" ? "✓" : "●"}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-secondary">Out for Express 2-Hour Delivery</p>
                      <p className="text-xs text-muted-foreground">ETA: {selectedOrderTrack.estimatedDelivery}</p>
                    </div>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-background ${
                        selectedOrderTrack.status === "delivered"
                          ? "bg-green-600 text-white"
                          : "bg-accent text-muted-foreground"
                      }`}
                    >
                      {selectedOrderTrack.status === "delivered" ? "✓" : "○"}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-secondary">Delivered to Destination</p>
                      <p className="text-xs text-muted-foreground">{selectedOrderTrack.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Driver Contact Card */}
                {selectedOrderTrack.driverName && (
                  <div className="p-4 rounded-2xl bg-accent/40 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                        {selectedOrderTrack.driverName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-secondary">{selectedOrderTrack.driverName}</p>
                        <p className="text-xs text-muted-foreground">EV Delivery Partner • {selectedOrderTrack.vehicleNo}</p>
                      </div>
                    </div>
                    <a
                      href={`tel:${selectedOrderTrack.driverPhone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call Partner
                    </a>
                  </div>
                )}

                {/* Produce Origin Traceability */}
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Traceable Farmer Origins in this Package
                  </p>
                  <ul className="space-y-2 text-xs">
                    {selectedOrderTrack.items.map((item) => (
                      <li key={item.id} className="flex justify-between items-center p-2.5 rounded-xl bg-card border">
                        <span className="font-semibold text-secondary">{item.name} ({item.quantity} × {item.unit})</span>
                        <span className="text-primary font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {item.farmerName || "Verified Local Farmer"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* MODAL 2: RAISE GRIEVANCE FORM */}
        {grievanceOrder && (
          <Dialog open={!!grievanceOrder} onOpenChange={() => setGrievanceOrder(null)}>
            <DialogContent className="sm:max-w-lg rounded-3xl p-6 border-border shadow-2xl">
              <DialogHeader className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <DialogTitle className="text-xl font-bold text-secondary">
                    Raise Grievance Ticket
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Order <span className="font-mono font-bold text-secondary">{grievanceOrder.id}</span> • 100% Quality Guarantee
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleRaiseGrievanceSubmit} className="space-y-4 pt-3">
                <div>
                  <Label htmlFor="issueType">Type of Issue <span className="text-destructive">*</span></Label>
                  <select
                    id="issueType"
                    value={grievanceType}
                    onChange={(e) => setGrievanceType(e.target.value)}
                    className="w-full h-11 mt-1 rounded-xl bg-background border border-border px-3 text-sm focus:ring-primary"
                  >
                    <option>Damaged / Quality Issue</option>
                    <option>Missing Produce Item</option>
                    <option>Delivery Delay</option>
                    <option>Wrong Item Delivered</option>
                    <option>Billing / Invoice Discrepancy</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="desc">Describe the Issue <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="desc"
                    placeholder="Provide details about the issue..."
                    value={grievanceDesc}
                    onChange={(e) => setGrievanceDesc(e.target.value)}
                    required
                    className="mt-1 rounded-xl min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="resolution">Preferred Resolution <span className="text-destructive">*</span></Label>
                  <select
                    id="resolution"
                    value={grievanceResolution}
                    onChange={(e) => setGrievanceResolution(e.target.value)}
                    className="w-full h-11 mt-1 rounded-xl bg-background border border-border px-3 text-sm focus:ring-primary"
                  >
                    <option>Full Refund to Account / Wallet</option>
                    <option>Free Express Replacement Delivery</option>
                    <option>Store Credit Discount Coupon</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-accent/40 border text-xs text-muted-foreground">
                  <strong>Guarantee Policy:</strong> All fresh produce complaints submitted within 24 hours of delivery are eligible for 100% instant refund or free replacement.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setGrievanceOrder(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingGrievance} className="rounded-xl font-bold shadow-md">
                    {isSubmittingGrievance ? "Registering Ticket..." : "Submit Grievance"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PublicLayout>
  );
}
