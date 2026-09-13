import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  PhoneCall,
  ShieldCheck,
  ChevronLeft,
  Store,
  Navigation,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function LiveOrderTrack() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/orders/:id/track");
  const orderId = params?.id || "1";

  // Countdown timer simulation for express delivery
  const [secondsLeft, setSecondsLeft] = useState(684);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Build timeline from order status
  const buildTimeline = (order: any) => {
    const status = order?.status || "placed";
    const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date();
    const fmt = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const add = (d: Date, mins: number) => new Date(d.getTime() + mins * 60 * 1000);

    const stages = [
      { key: "placed", step: "Order Received", time: fmt(createdAt) },
      { key: "packed", step: "Packed at Dark Store", time: fmt(add(createdAt, 3)) },
      { key: "out_for_delivery", step: "Out for Express Delivery", time: fmt(add(createdAt, 8)) },
      { key: "delivered", step: "Arrived at Doorstep", time: order?.status === "delivered" ? fmt(add(createdAt, 25)) : `Est. ${fmt(add(createdAt, 25))}` },
    ];

    const statusOrder = ["placed", "processing", "packed", "out_for_delivery", "delivered"];
    const currentIdx = statusOrder.indexOf(status);

    return stages.map((s, i) => ({
      ...s,
      completed: statusOrder.indexOf(s.key) <= currentIdx,
      active: statusOrder.indexOf(s.key) === currentIdx && status !== "delivered",
    }));
  };

  const { data: trackData, isLoading } = useQuery({
    queryKey: ["order-track", orderId],
    queryFn: async () => {
      const token = localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_admin_token") || "";
      // Try backend first
      try {
        const res = await fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const order = await res.json();
          if (order && order.orderNumber) {
            return {
              orderId: order.id || orderId,
              orderNumber: order.orderNumber,
              status: order.status,
              etaMinutes: order.status === "delivered" ? 0 : 11,
              darkStore: "Indiranagar Dark Store Hub",
              driver: {
                name: order.riderName || "Delivery Partner",
                phone: order.riderPhone || "",
                rating: "4.9 ★",
                vehicleNo: "KA-05-EX-4821",
                photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
              },
              timeline: buildTimeline(order),
              items: (Array.isArray(order.items) ? order.items : []).map((i: any) => ({
                name: i.productName || i.name || "Item",
                unit: i.unit || "pcs",
                qty: i.quantity || 1,
                price: i.unitPrice || i.price || 0,
              })),
              deliveryAddress: [order.shippingAddress, order.city, order.state].filter(Boolean).join(", "),
              totalAmount: order.finalAmount || order.totalAmount || 0,
            };
          }
        }
      } catch {}

      // Try localStorage fallback
      try {
        const stored = localStorage.getItem("sunotal_user_orders");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const order = parsed.find((o: any) => String(o.id) === orderId || String(o.orderNumber) === orderId || String(o.orderId) === orderId);
            if (order) {
              return {
                orderId: order.id || orderId,
                orderNumber: order.orderNumber || `ORD-${orderId}`,
                status: order.status || "placed",
                etaMinutes: 11,
                darkStore: "Indiranagar Dark Store Hub",
                driver: {
                  name: order.riderName || "Delivery Partner",
                  phone: order.riderPhone || "",
                  rating: "4.9 ★",
                  vehicleNo: "KA-05-EX-4821",
                  photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                },
                timeline: buildTimeline(order),
                items: (Array.isArray(order.items) ? order.items : []).map((i: any) => ({
                  name: i.productName || i.name || "Item",
                  unit: i.unit || "pcs",
                  qty: i.quantity || 1,
                  price: i.unitPrice || i.price || 0,
                })),
                deliveryAddress: order.shippingAddress || order.address || "Your delivery address",
                totalAmount: order.finalAmount || order.totalPrice || 0,
              };
            }
          }
        }
      } catch {}

      // Demo fallback
      return {
        orderId: orderId,
        orderNumber: `SUN-DEMO-${orderId}`,
        status: "out_for_delivery",
        etaMinutes: 11,
        darkStore: "Indiranagar Dark Store Hub",
        driver: {
          name: "Ramesh Kumar",
          phone: "+91 98765 43210",
          rating: "4.9 ★",
          vehicleNo: "KA-05-EX-4821",
          photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        },
        timeline: [
          { step: "Order Received", time: "10:42 AM", completed: true },
          { step: "Packed at Dark Store", time: "10:45 AM", completed: true },
          { step: "Out for Express Delivery", time: "10:47 AM", completed: true, active: true },
          { step: "Arrived at Doorstep", time: "Est. 10:55 AM", completed: false },
        ],
        items: [
          { name: "Fresh Hydroponic Tomatoes", unit: "500 g", qty: 2, price: 45 },
          { name: "Farm Fresh Milk (A2 Toned)", unit: "1 L", qty: 1, price: 68 },
          { name: "Organic Crisp Spinach", unit: "250 g", qty: 1, price: 30 },
        ],
        deliveryAddress: "Flat 402, Green Valley Apartments, Electronic City, Bengaluru",
        totalAmount: 188,
      };
    },
    refetchInterval: 10000,
  });


  const data = trackData || {
    orderNumber: `ORD-2026-${orderId}`,
    status: "out_for_delivery",
    etaMinutes: 11,
    darkStore: "Indiranagar Dark Store Hub",
    driver: {
      name: "Delivery Partner",
      phone: "",
      rating: "4.9 ★",
      vehicleNo: "KA-05-EX-4821",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    timeline: [
      { step: "Order Received", time: "10:42 AM", completed: true },
      { step: "Packed at Dark Store", time: "10:45 AM", completed: true },
      { step: "Out for Express Delivery", time: "10:47 AM", completed: true, active: true },
      { step: "Arrived at Doorstep", time: "Est. 10:55 AM", completed: false },
    ],
    items: [
      { name: "Fresh Organic Tomatoes", unit: "500 g", qty: 2, price: 45 },
      { name: "Amul Taaza Milk", unit: "1 L", qty: 1, price: 68 },
      { name: "Organic Spinach", unit: "250 g", qty: 1, price: 30 },
    ],
    deliveryAddress: "Your delivery address",
    totalAmount: 188,
  };

  // Always safe arrays — never crashes
  const timeline = Array.isArray(data.timeline) ? data.timeline : [];
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-16">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/orders")}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Orders
          </Button>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono">Order {data.orderNumber}</span>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Tracking</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ETA Hero Card */}
        <Card className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" /> 10-15 Min Express SLA Guarantee
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                  Arriving in <span className="text-emerald-400 font-mono">{formatTime(secondsLeft)}</span> mins
                </h1>
                <p className="text-sm text-slate-400">
                  Your fresh produce is packed and on the express delivery route!
                </p>
              </div>

              {/* Progress Dial */}
              <div className="w-32 h-32 rounded-full bg-emerald-500/10 border-4 border-emerald-500/40 flex flex-col items-center justify-center text-center shadow-inner">
                <Truck className="w-8 h-8 text-emerald-400 animate-bounce" />
                <span className="text-xs font-bold text-slate-300 mt-1">Out for Delivery</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Map Vector Simulation & Timeline */}
          <div className="md:col-span-2 space-y-6">
            {/* Live Map Box */}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-lg">
              <div className="relative h-64 bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Simulated Grid Tile Map */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
                
                {/* Simulated Delivery Route SVG */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M 60 180 Q 180 80, 320 140 T 480 90"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />
                </svg>

                {/* Dark Store Marker */}
                <div className="absolute left-[50px] bottom-[50px] flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-slate-900">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold bg-slate-900/90 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 mt-1">
                    Dark Store #04
                  </span>
                </div>

                {/* Moving Rider Pin */}
                <div className="absolute left-[240px] top-[110px] flex flex-col items-center animate-pulse">
                  <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center font-bold shadow-xl border-4 border-slate-900">
                    <Navigation className="w-6 h-6 transform rotate-45" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 mt-1 shadow-md">
                    Rider Ramesh (1.2 km away)
                  </span>
                </div>

                {/* Destination Address Marker */}
                <div className="absolute right-[50px] top-[70px] flex flex-col items-center">
                  <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg border-2 border-slate-900">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold bg-slate-900/90 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 mt-1">
                    Your Doorstep
                  </span>
                </div>
              </div>
              <CardContent className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Contactless & Temperature Checked Delivery</span>
                </div>
                <span className="font-mono text-slate-300">Live GPS Tiles: CartoDB Voyager</span>
              </CardContent>
            </Card>

            {/* Order Timeline Progress */}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-white mb-4">Delivery Milestone Progress</h3>
              <div className="space-y-6">
                {timeline.map((step: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-4 relative">
                    {idx < timeline.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 bottom-0 w-0.5 ${
                          step.completed ? "bg-emerald-500" : "bg-slate-800"
                        }`}
                      />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                        step.completed
                          ? "bg-emerald-500 text-slate-950"
                          : step.active
                          ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex-1 pt-1 flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            step.completed || step.active ? "text-white" : "text-slate-500"
                          }`}
                        >
                          {step.step}
                        </p>
                        {step.active && (
                          <span className="text-xs text-emerald-400">Rider is en route to your location</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">{step.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right 1 Col: Delivery Partner Card & Items Breakdown */}
          <div className="space-y-6">
            {/* Delivery Driver Info */}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Delivery Partner</h3>
              <div className="flex items-center gap-4">
                <img
                  src={data?.driver?.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                  alt={data?.driver?.name || "Delivery Partner"}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40"
                />
                <div>
                  <h4 className="text-base font-bold text-white">{data?.driver?.name || "Delivery Partner"}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                      {data?.driver?.rating || "4.9 ★"}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">{data?.driver?.vehicleNo || "EV Delivery"}</span>
                  </div>
                </div>
              </div>

              <a
                href={`tel:${data?.driver?.phone || "#"}`}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3 text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <PhoneCall className="w-4 h-4" /> Call Partner ({(data?.driver?.name || "Partner").split(" ")[0]})
              </a>
            </Card>

            {/* Delivery Address */}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-400" /> Delivery Address
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{data.deliveryAddress}</p>
            </Card>

            {/* Item Breakdown */}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Items ({data.items.length})</span>
                <Package className="w-4 h-4 text-slate-400" />
              </h3>
              <div className="space-y-2 divide-y divide-slate-800/60">
                {items.map((item: any, i: number) => (
                  <div key={i} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-slate-200">{item.name}</p>
                      <span className="text-[10px] text-slate-400">{item.unit} × {item.qty}</span>
                    </div>
                    <span className="font-mono text-slate-300 font-bold">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
