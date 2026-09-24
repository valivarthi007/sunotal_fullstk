import React, { useState, useEffect } from "react";
import { Bike, Power, Navigation, DollarSign, Bell, RefreshCw, Calculator, Route, CheckCircle2, Award, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliveryLayout } from "@/components/layout/DeliveryLayout";
import { getMapProvider } from "@/lib/providers/map/map-provider.factory";
import { useLocationState } from "@/lib/location-context";
import { toast } from "sonner";

export default function DeliveryDashboard() {
  const { location: userLoc } = useLocationState();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "earnings" | "reports">("orders");

  // Order Alert Modal State
  const [hasAlert, setHasAlert] = useState(false);
  const [timer, setTimer] = useState(30);
  const [acceptedOrder, setAcceptedOrder] = useState<any | null>(null);
  const [orderStage, setOrderStage] = useState<"accepted" | "at_warehouse" | "picked_up" | "delivered">("accepted");
  
  // Reports & Logic Payment Data (Initialized cleanly without hardcoded presets)
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    totalKmsRun: 0,
    basePayPerOrder: 30,
    distanceRatePerKm: 10,
    totalBasePay: 0,
    totalDistancePay: 0,
    totalTips: 0,
    totalPayout: 0,
    payoutStatus: "No Earnings Pending",
  });

  const [riderUser, setRiderUser] = useState<any>(null);
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [riderUpiId, setRiderUpiId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("sunotal_rider_upi_id") || "" : ""
  );
  const [otpInput, setOtpInput] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleVerifyOtp = async () => {
    if (!otpInput) {
      toast.error("Please enter the delivery PIN from customer");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/rider/verify-handover-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: acceptedOrder?.numericId || acceptedOrder?.id || 1,
          inputOtp: otpInput,
          otp: otpInput,
          riderId: riderUser?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "OTP verified! Handover complete.");
        setOrderStage("delivered");
        handleAdvanceStage();
      } else {
        toast.error(data.error || "Invalid OTP PIN. Please check customer phone.");
      }
    } catch {
      toast.error("Network error during OTP verification.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Day-Out Payout Request
  const handlePayoutRequest = async () => {
    if (!riderUpiId.trim()) {
      toast.error("Please enter a valid UPI ID for payout");
      return;
    }
    const token = localStorage.getItem("sunotal_delivery_token") || localStorage.getItem("sunotal_token");
    try {
      const res = await fetch("/api/delivery/payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          upiId: riderUpiId,
          amount: stats.totalPayout || riderUser?.walletBalance || 0,
          riderId: riderUser?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayoutRequested(true);
        toast.success(data.message || `Payout request submitted successfully for UPI ID: ${riderUpiId}`);
      } else {
        toast.error(data.error || "Payout request failed");
      }
    } catch {
      toast.error("Network error submitting payout request");
    }
  };

  // Map Container Ref
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const mapProvider = getMapProvider();

  // Fetch logged in user and stats on mount
  useEffect(() => {
    const token = localStorage.getItem("sunotal_delivery_token") || localStorage.getItem("sunotal_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch("/api/auth/me", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((u) => { if (u) setRiderUser(u); })
      .catch(() => setRiderUser(null));

    fetch("/api/delivery/stats", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.completedDeliveries === "number") {
          setStats(data);
          localStorage.setItem("sunotal_delivery_stats", JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, []);

  // GPS Location Watcher & Broadcaster
  useEffect(() => {
    if (!isOnline || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (acceptedOrder) {
          fetch("/api/delivery/rider/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: acceptedOrder.id || acceptedOrder.orderNumber,
              lat: latitude,
              lng: longitude,
              riderId: riderUser?.id || "RIDER-DIRECT",
              riderName: riderUser?.name || "Delivery Partner",
              riderPhone: riderUser?.phone || "",
              stage: orderStage,
            }),
          }).catch(() => null);
        }
      },
      (err) => console.warn("GPS watch warning:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, acceptedOrder, orderStage, riderUser]);

  // Countdown timer for Order Acceptance Window
  useEffect(() => {
    if (hasAlert && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [hasAlert, timer]);

  // Load Map when Order is Accepted
  useEffect(() => {
    if (!acceptedOrder) return;

    let isMounted = true;
    const timerId = setTimeout(() => {
      if (!mapContainerRef.current || !isMounted) return;

      mapProvider.loadSdk().then(() => {
        const L = (window as any).L;
        if (!L || !mapContainerRef.current || !isMounted) return;

        if (mapInstanceRef.current) {
          try { mapInstanceRef.current.remove(); } catch {}
          mapInstanceRef.current = null;
        }

        // Land-accurate Vijayawada Coordinates (Benz Circle Hub & Customer Land)
        const hubLat = 16.5062; // Benz Circle Hub, Vijayawada (Solid land)
        const hubLng = 80.6480;
        const custLat = acceptedOrder?.lat || acceptedOrder?.delivery_latitude || 16.5142;
        const custLng = acceptedOrder?.lng || acceptedOrder?.delivery_longitude || 80.6540;
        const midLat = Number(((hubLat + custLat) / 2).toFixed(4));
        const midLng = Number(((hubLng + custLng) / 2).toFixed(4));

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
        }).setView([custLat, custLng], 14);

        L.tileLayer(mapProvider.getTileUrl(), {
          attribution: mapProvider.getTileAttribution(),
          maxZoom: 19,
        }).addTo(map);

        // Dark Store Warehouse Marker
        const darkStoreIcon = L.divIcon({
          className: "ds-marker",
          html: '<div style="background:#0B2914;color:#10b981;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid #10b981;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3)">HUB</div>',
          iconSize: [36, 36],
        });
        L.marker([hubLat, hubLng], { icon: darkStoreIcon })
          .addTo(map)
          .bindPopup(`<b>Sunotal Dark Store Hub (${userLoc?.city || "Local Hub"})</b>`);

        // Customer Destination Marker
        const custIcon = L.divIcon({
          className: "cust-marker",
          html: '<div style="background:#059669;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:2px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,0.3)">📍</div>',
          iconSize: [36, 36],
        });
        L.marker([custLat, custLng], { icon: custIcon })
          .addTo(map)
          .bindPopup(`<b>Delivery Destination (${acceptedOrder?.customerName || "Customer"})</b>`);

        // Route polyline
        L.polyline([[hubLat, hubLng], [midLat, midLng], [custLat, custLng]], {
          color: "#059669",
          weight: 5,
          dashArray: "8, 8",
        }).addTo(map);

        map.fitBounds([[hubLat, hubLng], [custLat, custLng]], { padding: [50, 50] });
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 200);

        mapInstanceRef.current = map;
      });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [acceptedOrder, userLoc]);

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [currentAlertOrder, setCurrentAlertOrder] = useState<any | null>(null);

  // Fetch real active user orders from backend / localStorage
  useEffect(() => {
    const loadRealOrders = async () => {
      let realOrders: any[] = [];

      try {
        const res = await fetch("/api/delivery/orders/active");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            realOrders = data.map((o: any) => ({
              id: o.id || o.orderNumber,
              numericId: o.numericId || o.id,
              customerName: o.customerName || "",
              address: o.address || "",
              city: o.city || "",
              items: Array.isArray(o.items) ? o.items.map((i: any) => typeof i === "string" ? i : `${i.name || i.title || ""} (${i.quantity || 1})`) : [],
              distanceKm: 0,
              pay: Number(o.totalAmount || 0),
              totalAmount: Number(o.totalAmount || 0),
              status: o.status || "placed",
              lat: Number(o.lat || 0),
              lng: Number(o.lng || 0),
            }));
          }
        }
      } catch (err) {
        console.warn("Backend active orders fetch fallback:", err);
      }

      // Check localStorage for recently placed user orders
      try {
        const stored = localStorage.getItem("sunotal_user_orders");
        if (stored) {
          const userOrders = JSON.parse(stored);
          if (Array.isArray(userOrders)) {
            const activeUserOrders = userOrders.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled");
            for (const uo of activeUserOrders) {
              const orderIdStr = String(uo.id || uo.orderNumber || uo.orderId);
              if (!realOrders.some((ro) => String(ro.id) === orderIdStr)) {
                realOrders.unshift({
                  id: orderIdStr,
                  numericId: uo.id || uo.numericId,
                  customerName: uo.customerName || uo.name || uo.deliveryAddress?.name || "",
                  address: uo.address || (uo.deliveryAddress?.addressLine1 ? `${uo.deliveryAddress.addressLine1}${uo.city ? `, ${uo.city}` : ""}` : ""),
                  city: uo.city || "",
                  items: Array.isArray(uo.items) ? uo.items.map((i: any) => typeof i === "string" ? i : `${i.name || i.title || ""} (${i.quantity || 1})`) : [],
                  distanceKm: 0,
                  pay: Number(uo.totalAmount || uo.finalAmount || 0),
                  totalAmount: Number(uo.totalAmount || uo.finalAmount || 0),
                  status: uo.status || "placed",
                  lat: Number(uo.lat || 0),
                  lng: Number(uo.lng || 0),
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse localStorage user orders:", e);
      }

      if (realOrders.length > 0) {
        setPendingOrders(realOrders);
        setCurrentAlertOrder(realOrders[0]);
        setHasAlert(true);
      }
    };

    loadRealOrders();
  }, [userLoc]);

  const handleAcceptOrder = () => {
    setHasAlert(false);
    if (!currentAlertOrder) {
      toast.error("No active order available to accept.");
      return;
    }
    setAcceptedOrder(currentAlertOrder);
    setOrderStage("accepted");
  };

  const handleAdvanceStage = () => {
    if (orderStage === "accepted") setOrderStage("at_warehouse");
    else if (orderStage === "at_warehouse") setOrderStage("picked_up");
    else if (orderStage === "picked_up") {
      setOrderStage("delivered");
      toast.success("Order delivered successfully!");

      // Update backend status API with Auth token
      const token = localStorage.getItem("sunotal_delivery_token") || localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_admin_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const targetId = acceptedOrder?.id || "latest";
      fetch(`/api/orders/${targetId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "delivered", paymentStatus: "paid" }),
      }).catch((err) => console.error("Backend order status update error:", err));

      fetch(`/api/orders/latest/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "delivered", paymentStatus: "paid" }),
      }).catch(() => {});

      // Update localStorage sunotal_user_orders
      try {
        const stored = localStorage.getItem("sunotal_user_orders");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const updated = parsed.map((o: any) => {
              if (
                o.id === acceptedOrder?.id ||
                o.orderNumber === acceptedOrder?.id ||
                o.orderId === acceptedOrder?.id ||
                o.status === "processing" ||
                o.status === "shipped" ||
                o.status === "out_for_delivery"
              ) {
                return { ...o, status: "delivered", paymentStatus: "paid" };
              }
              return o;
            });
            localStorage.setItem("sunotal_user_orders", JSON.stringify(updated));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("order-status-changed"));
          }
        }
      } catch (e) {
        console.error("Failed to update user orders in localStorage:", e);
      }

      setStats((prev: any) => {
        const newCount = prev.completedDeliveries + 1;
        const newKms = Number((prev.totalKmsRun + 3.4).toFixed(1));
        const newBase = newCount * prev.basePayPerOrder;
        const newDist = Math.round(newKms * prev.distanceRatePerKm);
        return {
          ...prev,
          completedDeliveries: newCount,
          totalKmsRun: newKms,
          totalBasePay: newBase,
          totalDistancePay: newDist,
          totalPayout: newBase + newDist + prev.totalTips,
        };
      });
    } else if (orderStage === "delivered") {
      setAcceptedOrder(null);
    }
  };

  return (
    <DeliveryLayout user={riderUser}>
      <div className="py-8 bg-background">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          
          {/* Top Rider Header Bar */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-base text-secondary flex items-center gap-2">
                  <span>{riderUser?.name || "Delivery Partner"}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    Active Rider
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{riderUser?.city || "Local Sourcing Hub"} • Verified Rider Fleet</div>
              </div>
            </div>

            {/* Duty Online / Offline Toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-sm ${
                isOnline
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isOnline ? "DUTY ONLINE" : "OFFLINE"}</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 bg-accent/40 p-1.5 rounded-2xl border text-xs font-bold">
            <button
              onClick={() => setActiveTab("orders")}
              className={`py-2.5 rounded-xl transition-all ${activeTab === "orders" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Active Task
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`py-2.5 rounded-xl transition-all ${activeTab === "reports" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Delivery Reports & Stats
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`py-2.5 rounded-xl transition-all ${activeTab === "earnings" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Payout Status & UPI
            </button>
          </div>

          {/* Active Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {hasAlert && isOnline && (
                <div className="bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-transparent border-2 border-emerald-600 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-emerald-600 animate-pulse" />
                      <span className="font-bold text-sm text-secondary uppercase tracking-wider">EXPRESS DELIVERY ORDER ALERT</span>
                    </div>
                    <span className="bg-emerald-600 text-white font-mono font-bold text-xs px-3 py-1 rounded-full">
                      {timer}s remaining
                    </span>
                  </div>

                  <div className="bg-card p-4 rounded-2xl border space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-bold text-emerald-600 text-sm">{currentAlertOrder ? `Order #${currentAlertOrder.id}` : "Express Order"}</span>
                      <strong className="text-foreground">{currentAlertOrder?.customerName || "Customer"}</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Delivery Address:</span>
                      <strong className="text-foreground text-right max-w-[220px] truncate">{currentAlertOrder?.address || (userLoc?.city || "Vijayawada")}</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Order Items:</span>
                      <strong className="text-emerald-700 text-right max-w-[220px] truncate">{currentAlertOrder?.items?.join(", ") || "Fresh Groceries"}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-sm">
                      <span className="text-muted-foreground font-semibold">Calculated Rider Payout:</span>
                      <strong className="text-emerald-600 font-mono font-bold text-base">
                        ₹{currentAlertOrder?.pay || 40}.00
                      </strong>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={() => setHasAlert(false)}
                      variant="outline"
                      className="flex-1 rounded-xl h-11 text-xs font-bold"
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={handleAcceptOrder}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 text-xs shadow-md shadow-emerald-600/20"
                    >
                      ACCEPT ORDER NOW
                    </Button>
                  </div>
                </div>
              )}

              {acceptedOrder ? (
                <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Active Task #{acceptedOrder.id}</span>
                      <h3 className="font-bold text-lg text-secondary">{acceptedOrder.customerName}</h3>
                      <p className="text-xs text-muted-foreground">{acceptedOrder.address}</p>
                    </div>
                    <span className="text-emerald-600 font-mono font-bold text-xl">₹{acceptedOrder.pay}.00</span>
                  </div>

                  {/* Interactive Route Map */}
                  <div className="h-64 rounded-2xl overflow-hidden border relative shadow-inner">
                    <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                  </div>

                  {/* Stepper Workflow */}
                  <div className="bg-accent/30 p-4 rounded-2xl border space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Order Progress Stage:</span>
                      <span className="text-emerald-600 uppercase font-mono">{orderStage.replace("_", " ")}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["accepted", "at_warehouse", "picked_up", "delivered"].map((st, idx) => (
                        <div
                          key={st}
                          className={`h-2 rounded-full transition-all ${
                            ["accepted", "at_warehouse", "picked_up", "delivered"].indexOf(orderStage) >= idx
                              ? "bg-emerald-600"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {orderStage === "picked_up" && (
                    <div className="space-y-3 p-4 bg-accent/40 rounded-2xl border border-emerald-500/30">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Enter Customer 6-Digit Delivery PIN</span>
                          <span className="text-[10px] text-emerald-600 font-mono font-bold">Ask customer at door</span>
                        </label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          className="h-11 font-mono text-center text-lg tracking-widest bg-background border-emerald-500/50 rounded-xl font-bold"
                        />
                      </div>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || !otpInput}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                      >
                        {isVerifyingOtp ? "Verifying PIN..." : "Verify OTP & Complete Delivery (₹50 Credit)"}
                      </Button>
                    </div>
                  )}

                  {orderStage !== "picked_up" && (
                    <Button
                      onClick={handleAdvanceStage}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-600/20"
                    >
                      {orderStage === "accepted" && "1. Confirm Arrival at Dark Store"}
                      {orderStage === "at_warehouse" && "2. Confirm Order Picked Up"}
                      {orderStage === "delivered" && "4. Complete Task & Return to Available Fleet"}
                    </Button>
                  )}
                </div>
              ) : (
                !hasAlert && (
                  <div className="bg-card border rounded-3xl p-10 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <Navigation className="w-8 h-8 animate-spin-slow" />
                    </div>
                    <h3 className="font-bold text-lg text-secondary">Searching for Nearby Express Orders...</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      You are positioned in high-demand delivery zone ({riderUser?.city || "Vijayawada"}). Keep duty online to receive instant delivery alerts.
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Delivery Reports & Logic Payment Calculation Tab */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Logic-Based Payment Formula Explanation */}
              <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base">Logic-Based Payment Calculation System</h3>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full font-mono">
                    Official Rate Card
                  </span>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl font-mono text-xs space-y-2 border border-white/10">
                  <p className="text-emerald-300 font-bold text-sm">
                    Total Payout = (Completed Deliveries × ₹30) + (Total KMs Run × ₹10/km) + Customer Tips
                  </p>
                  <p className="text-white/70 text-[11px]">
                    Base Pay: ₹30.00 / order | Distance Rate: ₹10.00 / km run
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                    <span className="text-xs text-white/70">No. of Delivered Orders</span>
                    <h4 className="text-2xl font-extrabold font-mono text-white mt-1">{stats.completedDeliveries}</h4>
                    <span className="text-[10px] text-emerald-300">Base: ₹{stats.totalBasePay}</span>
                  </div>

                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                    <span className="text-xs text-white/70">No. of KMs Run</span>
                    <h4 className="text-2xl font-extrabold font-mono text-white mt-1">{stats.totalKmsRun} km</h4>
                    <span className="text-[10px] text-emerald-300">Distance Pay: ₹{stats.totalDistancePay}</span>
                  </div>

                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                    <span className="text-xs text-white/70">Total Calculated Payout</span>
                    <h4 className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">₹{stats.totalPayout}</h4>
                    <span className="text-[10px] text-white/70">Includes ₹{stats.totalTips} tips</span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Card */}
              <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-base text-secondary flex items-center gap-2">
                  <Route className="w-5 h-5 text-emerald-600" /> Today's Operational Summary
                </h4>

                <div className="divide-y text-xs">
                  <div className="py-3 flex justify-between">
                    <span className="text-muted-foreground">Base Delivery Pay ({stats.completedDeliveries} orders @ ₹30)</span>
                    <strong className="font-mono">₹{stats.totalBasePay}.00</strong>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-muted-foreground">Distance Mileage Pay ({stats.totalKmsRun} km @ ₹10/km)</span>
                    <strong className="font-mono">₹{stats.totalDistancePay}.00</strong>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-muted-foreground">Direct Customer Tips Captured</span>
                    <strong className="font-mono text-emerald-600">₹{stats.totalTips}.00</strong>
                  </div>
                  <div className="py-3 flex justify-between text-sm font-bold pt-4">
                    <span className="text-secondary">Net Day-Out Payout Earnings</span>
                    <strong className="font-mono text-emerald-600 text-lg">₹{stats.totalPayout}.00</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payout Status & UPI Tab */}
          {activeTab === "earnings" && (
            <div className="space-y-6">
              <div className="bg-card border rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">DAY-OUT PAYOUT STATUS</span>
                    <h3 className="text-3xl font-extrabold font-mono text-emerald-600 mt-1">₹{stats.totalPayout}.00</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs font-mono">
                    {payoutRequested ? "TRANSFER INITIATED" : stats.payoutStatus}
                  </span>
                </div>

                <div className="space-y-4 bg-accent/30 p-4 rounded-2xl border">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rider Payout UPI ID</label>
                    <Input
                      type="text"
                      placeholder="Enter your UPI ID (e.g. rider@upi, phone@paytm)..."
                      value={riderUpiId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setRiderUpiId(e.target.value);
                        localStorage.setItem("sunotal_rider_upi_id", e.target.value);
                      }}
                      className="h-11 font-mono text-xs bg-background border-border rounded-xl focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Payout Transfer Speed:</span>
                    <strong className="text-emerald-600 font-bold">Instant 15-Min Credit</strong>
                  </div>
                </div>

                <Button
                  onClick={handlePayoutRequest}
                  disabled={payoutRequested || stats.totalPayout <= 0}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs gap-2 shadow-md shadow-emerald-600/20"
                >
                  <DollarSign className="w-4 h-4" />
                  {payoutRequested ? `Payout Transfer Initiated to ${riderUpiId}` : "Request Day-Out Instant Payout to UPI"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </DeliveryLayout>
  );
}
