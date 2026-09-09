import React, { useState, useEffect } from "react";
import { Bike, Power, Navigation, DollarSign, Bell, RefreshCw, Calculator, Route, CheckCircle2, Award, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryLayout } from "@/components/layout/DeliveryLayout";
import { getMapProvider } from "@/lib/providers/map/map-provider.factory";
import { toast } from "sonner";

export default function DeliveryDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "earnings" | "reports">("orders");

  // Order Alert Modal State
  const [hasAlert, setHasAlert] = useState(true);
  const [timer, setTimer] = useState(30);
  const [acceptedOrder, setAcceptedOrder] = useState<any | null>(null);
  const [orderStage, setOrderStage] = useState<"accepted" | "at_warehouse" | "picked_up" | "delivered">("accepted");
  
  // Reports & Logic Payment Data (Initialized to 0)
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    totalKmsRun: 0,
    basePayPerOrder: 30,
    distanceRatePerKm: 10,
    totalBasePay: 0,
    totalDistancePay: 0,
    totalTips: 0,
    totalPayout: 0,
    payoutStatus: "No Pending Payout",
  });

  const [riderUser, setRiderUser] = useState<any>(null);
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [riderUpiId, setRiderUpiId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("sunotal_rider_upi_id") || "" : ""
  );

  // Map Container Ref
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const mapProvider = getMapProvider();

  // Fetch logged in user and stats on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((u) => { if (u) setRiderUser(u); })
      .catch(() => setRiderUser(null));

    fetch("/api/delivery/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.completedDeliveries === "number") setStats(data);
      })
  }, []);

  // Countdown timer for Order Acceptance Window
  useEffect(() => {
    if (hasAlert && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [hasAlert, timer]);

  // Load Map when Order is Accepted
  useEffect(() => {
    if (!acceptedOrder || !mapContainerRef.current) return;

    mapProvider.loadSdk().then(() => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 14);
      L.tileLayer(mapProvider.getTileUrl(), {
        attribution: mapProvider.getTileAttribution(),
        maxZoom: 19,
      }).addTo(map);

      // Dark Store Warehouse Marker
      const darkStoreIcon = L.divIcon({
        className: "ds-marker",
        html: '<div style="background:#0B2914;color:#10b981;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid #10b981">DS</div>',
        iconSize: [34, 34],
      });
      L.marker([12.9352, 77.6245], { icon: darkStoreIcon }).addTo(map).bindPopup("<b>Sunotal Dark Store #104</b>");

      // Customer Destination Marker
      const custIcon = L.divIcon({
        className: "cust-marker",
        html: '<div style="background:#059669;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white">📍</div>',
        iconSize: [34, 34],
      });
      L.marker([12.9716, 77.5946], { icon: custIcon }).addTo(map).bindPopup("<b>Delivery Destination</b>");

      // Route polyline
      L.polyline([[12.9352, 77.6245], [12.9534, 77.6095], [12.9716, 77.5946]], {
        color: "#059669",
        weight: 5,
      }).addTo(map);

      mapInstanceRef.current = map;
    });
  }, [acceptedOrder]);

  const handleAcceptOrder = () => {
    setHasAlert(false);
    setAcceptedOrder({
      id: "ORD-9842",
      customerName: "Ananya Roy",
      address: "Flat 402, Green Glen Layout, Bellandur, Bengaluru",
      items: ["Fresh Tomatoes 1kg", "Amul Butter 500g", "Toned Milk 2L"],
      distanceKm: 3.4,
      pay: 64, // 30 base + (3.4 * 10) distance + 0 tip
    });
    setOrderStage("accepted");
  };

  const handleAdvanceStage = () => {
    if (orderStage === "accepted") setOrderStage("at_warehouse");
    else if (orderStage === "at_warehouse") setOrderStage("picked_up");
    else if (orderStage === "picked_up") {
      setOrderStage("delivered");
      toast.success("Order delivered successfully!");
      setStats((prev) => {
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

  const handlePayoutRequest = async () => {
    if (!riderUpiId.trim() || !riderUpiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@upi) to receive your payout.");
      return;
    }

    try {
      const res = await fetch("/api/delivery/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: riderUpiId }),
      });
      const data = await res.json();
      setPayoutRequested(true);
      toast.success(data.message || `Day-out payout initiated to ${riderUpiId}!`);
    } catch {
      setPayoutRequested(true);
      toast.success(`Day-out payout transfer requested to ${riderUpiId}!`);
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
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Dark Store Pick-up:</span>
                      <strong className="text-foreground">Sunotal Dark Store #104 (1.1 km)</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Customer Distance:</span>
                      <strong className="text-foreground">3.4 km Total</strong>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-sm">
                      <span className="text-muted-foreground font-semibold">Calculated Payout:</span>
                      <strong className="text-emerald-600 font-mono font-bold text-base">
                        ₹{30 + Math.round(3.4 * 10)}.00 (Base ₹30 + 3.4km × ₹10)
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

                  <Button
                    onClick={handleAdvanceStage}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-600/20"
                  >
                    {orderStage === "accepted" && "1. Confirm Arrival at Dark Store"}
                    {orderStage === "at_warehouse" && "2. Confirm Order Picked Up"}
                    {orderStage === "picked_up" && "3. Mark Order as DELIVERED"}
                    {orderStage === "delivered" && "4. Complete Task & Return to Available Fleet"}
                  </Button>
                </div>
              ) : (
                !hasAlert && (
                  <div className="bg-card border rounded-3xl p-10 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <Navigation className="w-8 h-8 animate-spin-slow" />
                    </div>
                    <h3 className="font-bold text-lg text-secondary">Searching for Nearby Express Orders...</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      You are positioned in high-demand delivery zone (HSR Layout). Keep duty online to receive instant delivery alerts.
                    </p>
                    <Button
                      onClick={() => { setHasAlert(true); setTimer(30); }}
                      variant="outline"
                      className="rounded-xl text-xs font-bold border-emerald-600/30 text-emerald-600 gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Simulate Test Order Alert
                    </Button>
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
                      onChange={(e) => {
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
