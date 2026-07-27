import { useState, useEffect } from "react";
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
  ShoppingBag,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PhoneCall,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  Search,
  RefreshCw,
  Plus,
  LifeBuoy,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

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

export default function Orders() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });

  const [orders, setOrders] = useState<Order[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "grievances">("orders");

  // Selected Order for live tracker modal
  const [selectedOrderTrack, setSelectedOrderTrack] = useState<Order | null>(null);

  // Selected Order for raising grievance
  const [grievanceOrder, setGrievanceOrder] = useState<Order | null>(null);
  const [grievanceType, setGrievanceType] = useState("Damaged / Quality Issue");
  const [grievanceDesc, setGrievanceDesc] = useState("");
  const [grievanceResolution, setGrievanceResolution] = useState("Full Refund");
  const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // Load orders & grievances
  useEffect(() => {
    try {
      const storedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      } else {
        setOrders(SAMPLE_ORDERS);
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(SAMPLE_ORDERS));
      }

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
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

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
      toast.success(`Grievance ticket ${newTicketId} registered! Our team will respond within 2 hours.`);
      setActiveTab("grievances");
    }, 600);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span>/</span>
              <span className="text-foreground font-medium">Orders & Grievances</span>
            </div>
            <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Order Management & Support</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track live deliveries, review past orders, and manage resolution tickets.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-accent/60 p-1.5 rounded-2xl border border-border">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === "orders" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("grievances")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === "grievances" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LifeBuoy className="w-4 h-4" /> Grievance Tickets ({grievances.length})
            </button>
          </div>
        </div>

        {/* TAB 1: ORDERS LIST & TRACKING */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Search filter */}
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, item name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-card border-border rounded-xl text-sm"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-secondary mb-2">No orders found</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {searchQuery ? `No orders matching "${searchQuery}"` : "You haven't placed any orders yet."}
                </p>
                <Button onClick={() => setLocation("/products")} className="rounded-full px-8">
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredOrders.map((order) => {
                  const isOutForDel = order.status === "out_for_delivery";
                  const isDelivered = order.status === "delivered";

                  return (
                    <div key={order.id} className="bg-card border border-border shadow-sm hover:shadow-md rounded-3xl p-6 transition-all space-y-4">
                      {/* Top Order Metadata Bar */}
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
                            <Clock className="w-3.5 h-3.5 text-primary" /> Delivery ETA: <strong className="text-secondary">{order.estimatedDelivery}</strong>
                          </p>
                        </div>

                        <div className="md:col-span-4 md:text-right border-t md:border-t-0 pt-3 md:pt-0">
                          <p className="text-xs text-muted-foreground">Total Amount</p>
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
                <h3 className="text-lg font-bold text-secondary mb-1">No active grievances</h3>
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

                {/* Driver Contact Card (if out for delivery) */}
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
                  Order <span className="font-mono font-bold text-secondary">{grievanceOrder.id}</span> • 100% Satisfaction Guarantee
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
                    placeholder="Provide details about the issue (e.g. 2 tomatoes were damaged during transit)..."
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
