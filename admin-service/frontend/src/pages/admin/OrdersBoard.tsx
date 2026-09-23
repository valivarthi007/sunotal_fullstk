import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, Bike, Clock, Search, RefreshCw, CheckCircle, Package, ArrowRight, UserCheck, Phone } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  userName: string;
  userPhone: string;
  deliveryAddress: string;
  status: "placed" | "accepted" | "packing" | "out_for_delivery" | "delivered" | "cancelled";
  totalAmount: number;
  paymentMethod: string;
  deliveryOtp?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  etaMinutes?: number;
  createdAt: string;
  items: OrderItem[];
}

interface ColumnsData {
  placed: Order[];
  accepted: Order[];
  packing: Order[];
  out_for_delivery: Order[];
  delivered: Order[];
  cancelled: Order[];
}

const COLUMN_CONFIG: Array<{ key: keyof ColumnsData; title: string; color: string; badge: string }> = [
  { key: "placed", title: "Placed / New", color: "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20", badge: "bg-blue-600 text-white" },
  { key: "accepted", title: "Accepted", color: "border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20", badge: "bg-indigo-600 text-white" },
  { key: "packing", title: "Packing in Dark Store", color: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20", badge: "bg-amber-600 text-white" },
  { key: "out_for_delivery", title: "Out for Delivery", color: "border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20", badge: "bg-purple-600 text-white" },
  { key: "delivered", title: "Delivered", color: "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20", badge: "bg-emerald-600 text-white" },
  { key: "cancelled", title: "Cancelled", color: "border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20", badge: "bg-rose-600 text-white" },
];

export default function OrdersBoard() {
  const [columns, setColumns] = useState<ColumnsData>({
    placed: [],
    accepted: [],
    packing: [],
    out_for_delivery: [],
    delivered: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [assignRiderOrder, setAssignRiderOrder] = useState<Order | null>(null);
  const [selectedRider, setSelectedRider] = useState("RIDER-101");

  const RIDERS_LIST = [
    { id: "RIDER-101", name: "Vikram Singh", phone: "+91 9876543210" },
    { id: "RIDER-102", name: "Suresh Kumar", phone: "+91 9876543211" },
    { id: "RIDER-103", name: "Anand Verma", phone: "+91 9876543212" },
  ];

  const fetchBoardOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch("/api/orders/board");
      const data = await res.json();
      if (data.success && data.columns) {
        setColumns(data.columns);
      }
    } catch (err) {
      if (!isBackground) toast.error("Failed to load live Kanban orders board");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardOrders();
    const interval = setInterval(() => fetchBoardOrders(true), 10000); // Silent live poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order #${orderId} moved to ${newStatus}`);
        fetchBoardOrders();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAssignRiderSubmit = async () => {
    if (!assignRiderOrder) return;
    const rider = RIDERS_LIST.find((r) => r.id === selectedRider) || RIDERS_LIST[0];
    try {
      const res = await fetch(`/api/orders/${assignRiderOrder.id}/assign-rider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId: rider.id, riderName: rider.name, riderPhone: rider.phone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setAssignRiderOrder(null);
        fetchBoardOrders();
      }
    } catch {
      toast.error("Failed to assign rider");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-emerald-600" /> Live Kanban Orders Board
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time dark store order processing, rider assignment & dispatch control
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fetchBoardOrders()} disabled={loading} className="gap-1.5 text-xs font-bold rounded-xl">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} /> Refresh Board
            </Button>
          </div>
        </div>

        {/* Board Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4 min-h-[600px]">
          {COLUMN_CONFIG.map((col) => {
            const orderList = columns[col.key] || [];
            return (
              <div key={col.key} className={`flex flex-col rounded-2xl border ${col.color} p-3 space-y-3 shrink-0 min-w-[240px]`}>
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">{col.title}</h3>
                  <Badge className={`font-mono font-bold text-[10px] ${col.badge}`}>{orderList.length}</Badge>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] pr-1">
                  {orderList.length === 0 ? (
                    <div className="text-center py-10 text-[11px] text-muted-foreground border border-dashed rounded-xl p-2">
                      No orders in this column
                    </div>
                  ) : (
                    orderList.map((order) => (
                      <div key={order.id} className="bg-card border border-border rounded-xl p-3.5 space-y-2 shadow-sm hover:shadow-md transition-shadow">
                        {/* Ref & Price */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-emerald-600">#{order.orderNumber || order.id}</span>
                          <span className="font-mono font-bold text-xs text-foreground">₹{order.totalAmount}</span>
                        </div>

                        {/* Customer Info */}
                        <div>
                          <p className="font-bold text-xs text-foreground truncate">{order.userName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{order.deliveryAddress}</p>
                          {order.deliveryOtp && (
                            <span className="inline-block mt-1 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              OTP: {order.deliveryOtp}
                            </span>
                          )}
                        </div>

                        {/* Items Preview */}
                        <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
                          {(order.items || []).slice(0, 2).map((i) => (
                            <div key={i.id} className="flex justify-between">
                              <span className="truncate">{i.name}</span>
                              <span className="font-mono">x{i.quantity}</span>
                            </div>
                          ))}
                          {(order.items || []).length > 2 && (
                            <span className="text-emerald-600 font-bold">+{(order.items || []).length - 2} more</span>
                          )}
                        </div>

                        {/* Rider Info */}
                        {order.riderName ? (
                          <div className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-800 p-1.5 rounded-lg border border-emerald-200">
                            <Bike className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-bold truncate">{order.riderName}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssignRiderOrder(order)}
                            className="w-full py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" /> Assign Rider
                          </button>
                        )}

                        {/* Move Actions */}
                        <div className="flex items-center gap-1 pt-1">
                          {col.key === "placed" && (
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id, "accepted")} className="w-full h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 font-bold">
                              Accept & Pack
                            </Button>
                          )}
                          {col.key === "accepted" && (
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id, "packing")} className="w-full h-7 text-[10px] bg-amber-600 hover:bg-amber-700 font-bold">
                              Start Packing
                            </Button>
                          )}
                          {col.key === "packing" && (
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id, "out_for_delivery")} className="w-full h-7 text-[10px] bg-purple-600 hover:bg-purple-700 font-bold">
                              Dispatch Rider
                            </Button>
                          )}
                          {col.key === "out_for_delivery" && (
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id, "delivered")} className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 font-bold">
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assign Rider Dialog */}
      {assignRiderOrder && (
        <Dialog open={!!assignRiderOrder} onOpenChange={() => setAssignRiderOrder(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Assign Delivery Partner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Assign an active delivery partner for order #{assignRiderOrder.orderNumber}
              </p>
              <Select value={selectedRider} onValueChange={setSelectedRider}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select Rider" />
                </SelectTrigger>
                <SelectContent>
                  {RIDERS_LIST.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAssignRiderOrder(null)}>Cancel</Button>
              <Button onClick={handleAssignRiderSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Assign & Dispatch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
