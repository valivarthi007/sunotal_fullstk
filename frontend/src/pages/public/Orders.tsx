import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { getGetCurrentUserQueryKey, useGetCurrentUser } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchUserOrders, cancelUserOrder, OrderApi } from "@/lib/api-client";
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
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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

const STORAGE_GRIEVANCES_KEY = "sunotal_user_grievances";

export default function Orders() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });

  const [orders, setOrders] = useState<OrderApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "grievances">("orders");

  // Selected Order for live tracker modal
  const [selectedOrderTrack, setSelectedOrderTrack] = useState<OrderApi | null>(null);

  // Selected Order for raising grievance
  const [grievanceOrder, setGrievanceOrder] = useState<OrderApi | null>(null);
  const [grievanceType, setGrievanceType] = useState("Damaged / Quality Issue");
  const [grievanceDesc, setGrievanceDesc] = useState("");
  const [grievanceResolution, setGrievanceResolution] = useState("Full Refund");
  const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchUserOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Failed to load orders:", e);
      // Fallback to localStorage if unauthenticated or offline
      try {
        const stored = localStorage.getItem("sunotal_user_orders");
        if (stored) {
          const parsed = JSON.parse(stored);
          setOrders(Array.isArray(parsed) ? parsed : []);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Failed to parse stored orders:", err);
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    try {
      const storedGrievances = localStorage.getItem(STORAGE_GRIEVANCES_KEY);
      if (storedGrievances) {
        const parsed = JSON.parse(storedGrievances);
        setGrievances(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error("Failed to parse stored grievances:", e);
      setGrievances([]);
    }
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order? Item stock will be restored.")) return;
    try {
      await cancelUserOrder(orderId);
      toast.success("Order cancelled and inventory restored.");
      loadOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    }
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
        orderId: grievanceOrder.orderNumber || String(grievanceOrder.id || "N/A"),
        type: grievanceType,
        description: grievanceDesc,
        preferredResolution: grievanceResolution,
        status: "In Review",
        createdAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        responseMsg: "Grievance received. Our Quality Inspection Team is reviewing your ticket.",
      };

      const updated = [newGrievance, ...(Array.isArray(grievances) ? grievances : [])];
      setGrievances(updated);
      localStorage.setItem(STORAGE_GRIEVANCES_KEY, JSON.stringify(updated));

      setIsSubmittingGrievance(false);
      setGrievanceOrder(null);
      setGrievanceDesc("");
      toast.success(`Grievance ticket ${newTicketId} registered! Our team will respond within 2 hours.`);
      setActiveTab("grievances");
    }, 600);
  };

  const safeSearch = (searchQuery || "").toLowerCase();
  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(
    (o) =>
      o?.orderNumber?.toLowerCase().includes(safeSearch) ||
      o?.city?.toLowerCase().includes(safeSearch) ||
      o?.items?.some((i) => i?.productName?.toLowerCase().includes(safeSearch))
  );

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-secondary tracking-tight">My Orders & Tracking</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track farm-to-door deliveries, view GST invoices, and resolve grievances.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading} className="rounded-xl">
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Link href="/products">
              <Button size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "orders"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-secondary"
            }`}
          >
            My Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("grievances")}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "grievances"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-secondary"
            }`}
          >
            Support Tickets & Grievances ({grievances.length})
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders by item or order number..."
                className="pl-9 h-10 rounded-xl"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-lg text-secondary">No orders found</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {searchQuery ? "Try a different search query." : "You haven't placed any farm-fresh orders yet."}
                </p>
                <Link href="/products">
                  <Button className="rounded-full px-6 text-xs font-bold">Start Shopping</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, idx) => {
                  const statusStr = (order.status || "processing").replace(/_/g, " ");
                  const payStatusStr = (order.paymentStatus || "unpaid").toUpperCase();
                  const formattedDate = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "Recent";

                  return (
                    <div
                      key={order.id || order.orderNumber || idx}
                      className="bg-card border border-border shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow space-y-4"
                    >
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-secondary text-base">{order.orderNumber || "N/A"}</span>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                order.status === "delivered"
                                  ? "bg-green-500/10 text-green-600"
                                  : order.status === "cancelled"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-amber-500/10 text-amber-600 animate-pulse"
                              }`}
                            >
                              {statusStr}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                                order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {payStatusStr}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Placed on: {formattedDate}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <p className="font-mono font-extrabold text-lg text-primary">{fmt(order.finalAmount || 0)}</p>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2">
                        {order.items?.map((item, itemIdx) => (
                          <div key={item.id || itemIdx} className="flex items-center justify-between text-xs py-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-secondary">{item.productName || "Produce Item"}</span>
                              <span className="text-muted-foreground font-mono">x {item.quantity || 1}</span>
                            </div>
                            <span className="font-mono font-semibold text-secondary">{fmt(item.subtotal || 0)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Truck className="w-4 h-4 text-emerald-600" />
                          <span>{order.estimatedDelivery || "Standard 24-Hour Delivery"} {order.city ? `(${order.city})` : ""}</span>
                        </div>

                      <div className="flex items-center gap-2">
                        {order.status !== "cancelled" && order.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel Order
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGrievanceOrder(order)}
                          className="rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <LifeBuoy className="w-3.5 h-3.5 mr-1" /> Raise Support Ticket
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedOrderTrack(order)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
                        >
                          Track Delivery <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GRIEVANCES TAB */}
        {activeTab === "grievances" && (
          <div className="space-y-4">
            {grievances.length === 0 ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto">
                <LifeBuoy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-lg text-secondary">No active grievances</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  All farm-fresh deliveries are operating smoothly with zero quality complaints.
                </p>
              </div>
            ) : (
              grievances.map((g) => (
                <div key={g.ticketId} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{g.ticketId}</span>
                      <span className="text-xs text-muted-foreground">Order: {g.orderId}</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                      {g.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-secondary">{g.type}</p>
                  <p className="text-xs text-muted-foreground bg-accent/40 p-3 rounded-xl border">{g.description}</p>
                  {g.responseMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                      <strong className="block mb-0.5">Support Team Response:</strong>
                      {g.responseMsg}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* LIVE ORDER TRACKER DIALOG */}
        {selectedOrderTrack && (
          <Dialog open={!!selectedOrderTrack} onOpenChange={() => setSelectedOrderTrack(null)}>
            <DialogContent className="sm:max-w-lg rounded-3xl overflow-hidden p-0">
              {/* Top Banner */}
              <div className="bg-emerald-950 text-white p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-6 h-6 text-emerald-400 animate-bounce" />
                    <div>
                      <h3 className="font-bold text-lg leading-tight">Live Delivery Tracker</h3>
                      <p className="text-xs text-emerald-200/80">Hyperlocal Farm-to-Door EV Express Delivery</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Tracking
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-800/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300">Order Ref: {selectedOrderTrack.orderNumber || "N/A"}</span>
                  <span className="text-emerald-400 font-bold">ETA: 14 Mins</span>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Dynamic Map Telemetry Canvas */}
                <div className="relative w-full h-56 bg-slate-900 border-2 border-emerald-600/50 rounded-2xl overflow-hidden shadow-inner group">
                  {/* Grid Overlay Fallback */}
                  <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />
                  
                  {/* Route Polyline Simulation */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <path
                      d="M 40 160 Q 180 50 360 160"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* Warehouse Hub Marker (Start) */}
                  <div className="absolute left-6 bottom-8 z-20 flex flex-col items-center">
                    <div className="px-2 py-0.5 bg-slate-800 text-[9px] font-bold text-emerald-400 rounded-full border border-emerald-500/40 mb-1 shadow">
                      Organic Hub
                    </div>
                    <div className="w-9 h-9 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                      🚜
                    </div>
                  </div>

                  {/* Live Moving Rider Marker (In Transit) */}
                  <div className="absolute left-1/2 top-10 -translate-x-1/2 z-30 flex flex-col items-center animate-pulse">
                    <div className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow-lg border border-white flex items-center gap-1">
                      <span>Rider En Route</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </div>
                    <div className="w-11 h-11 bg-white text-emerald-700 rounded-full flex items-center justify-center shadow-2xl border-2 border-emerald-600 font-bold text-lg mt-1">
                      🛵
                    </div>
                  </div>

                  {/* Customer Home Destination Marker (End) */}
                  <div className="absolute right-6 bottom-8 z-20 flex flex-col items-center">
                    <div className="px-2 py-0.5 bg-slate-800 text-[9px] font-bold text-emerald-400 rounded-full border border-emerald-500/40 mb-1 shadow">
                      Delivery Address
                    </div>
                    <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                      🏠
                    </div>
                  </div>

                  {/* Telemetry Footer Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 z-20 bg-background/95 backdrop-blur-md p-2.5 rounded-xl border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-semibold text-secondary">Ramesh Kumar (EV Partner)</span>
                    </div>
                    <a
                      href="tel:09090007108"
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow"
                    >
                      <PhoneCall className="w-3 h-3" /> Call Rider
                    </a>
                  </div>
                </div>

                {/* Stepper Timeline */}
                <div className="relative pl-6 space-y-4 border-l-2 border-emerald-500/40 ml-2">
                  {[
                    { title: "Order Confirmed", desc: "Farm produce reserved & logged", done: true },
                    { title: "Plucked & Packed at Farm", desc: "Quality inspected by organic supervisor", done: true },
                    { title: "Out for Express Delivery", desc: selectedOrderTrack.estimatedDelivery || "Express EV Delivery (14 mins away)", done: selectedOrderTrack.status !== "pending" },
                    { title: "Delivered to Customer", desc: selectedOrderTrack.shippingAddress || "Customer Home Address", done: selectedOrderTrack.status === "delivered" },
                  ].map((step, idx) => (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step.done ? "bg-emerald-600 text-white shadow-sm" : "bg-muted text-muted-foreground border"
                        }`}
                      >
                        ✓
                      </div>
                      <h4 className="font-bold text-xs text-secondary">{step.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking Number:</span>
                    <strong>{selectedOrderTrack.trackingNumber || "TRK-98124019"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <strong className="text-emerald-600 font-bold">{(selectedOrderTrack.paymentStatus || "unpaid").toUpperCase()}</strong>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* RAISE GRIEVANCE DIALOG */}
        {grievanceOrder && (
          <Dialog open={!!grievanceOrder} onOpenChange={() => setGrievanceOrder(null)}>
            <DialogContent className="sm:max-w-lg rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <LifeBuoy className="w-6 h-6 text-primary" /> Raise Support & Quality Ticket
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Order Ref: <span className="font-mono font-bold text-foreground">{grievanceOrder.orderNumber}</span>
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleRaiseGrievanceSubmit} className="space-y-4 py-2">
                <div>
                  <Label className="text-xs">Issue Category</Label>
                  <select
                    value={grievanceType}
                    onChange={(e) => setGrievanceType(e.target.value)}
                    className="w-full h-11 mt-1 rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option>Damaged / Quality Issue</option>
                    <option>Missing Items in Package</option>
                    <option>Delivery Delay</option>
                    <option>Wrong Produce Delivered</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Description of Issue</Label>
                  <Textarea
                    value={grievanceDesc}
                    onChange={(e) => setGrievanceDesc(e.target.value)}
                    placeholder="Provide details about the issue..."
                    className="mt-1 rounded-xl text-xs"
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={isSubmittingGrievance} className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90">
                  Submit Support Ticket
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PublicLayout>
  );
}
