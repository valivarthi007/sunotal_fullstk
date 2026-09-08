import React, { useState, useEffect } from "react";
import { Bike, Power, Navigation, DollarSign, Award, Bell, CheckCircle2, Clock, MapPin, Zap, ShieldCheck, PhoneCall, ArrowUpRight, Percent, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMapProvider } from "@/lib/providers/map/map-provider.factory";

export default function DeliveryDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "earnings" | "discounts">("orders");

  // Order Alert Modal State
  const [hasAlert, setHasAlert] = useState(true);
  const [timer, setTimer] = useState(30);
  const [acceptedOrder, setAcceptedOrder] = useState<any | null>(null);
  const [orderStage, setOrderStage] = useState<"accepted" | "at_warehouse" | "picked_up" | "delivered">("accepted");
  const [payoutRequested, setPayoutRequested] = useState(false);

  // Map Container Ref
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);

  const mapProvider = getMapProvider();

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
        html: '<div style="background:#0f172a;color:#38bdf8;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid #38bdf8">DS</div>',
        iconSize: [34, 34],
      });
      L.marker([12.9352, 77.6245], { icon: darkStoreIcon }).addTo(map).bindPopup("<b>HSR Dark Store #104</b>");

      // Customer Marker
      const custIcon = L.divIcon({
        className: "cust-marker",
        html: '<div style="background:#10b981;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white">📍</div>',
        iconSize: [34, 34],
      });
      L.marker([12.9716, 77.5946], { icon: custIcon }).addTo(map).bindPopup("<b>Delivery Destination</b>");

      // Polyline route
      L.polyline([[12.9352, 77.6245], [12.9534, 77.6095], [12.9716, 77.5946]], {
        color: "#f59e0b",
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
      pay: 55, // 35 base + 15 surge + 5 tip
    });
    setOrderStage("accepted");
  };

  const handleAdvanceStage = () => {
    if (orderStage === "accepted") setOrderStage("at_warehouse");
    else if (orderStage === "at_warehouse") setOrderStage("picked_up");
    else if (orderStage === "picked_up") setOrderStage("delivered");
    else if (orderStage === "delivered") setAcceptedOrder(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Rider Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-md">
                <Bike className="w-6 h-6" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${isOnline ? "bg-emerald-500" : "bg-slate-600"}`} />
            </div>
            <div>
              <div className="font-extrabold text-sm flex items-center gap-1.5">
                <span>Ramesh Kumar</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  ★ 4.9
                </span>
              </div>
              <div className="text-[10px] text-slate-400">EV Fleet • KA-05-EV-9821</div>
            </div>
          </div>

          {/* Duty Toggle Button */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md ${
              isOnline ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? "DUTY ONLINE" : "OFFLINE"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full flex-1 p-4 pb-20 space-y-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-2 rounded-xl transition-all ${activeTab === "orders" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"}`}
          >
            Active Task
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`py-2 rounded-xl transition-all ${activeTab === "earnings" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"}`}
          >
            Earnings & Payout
          </button>
          <button
            onClick={() => setActiveTab("discounts")}
            className={`py-2 rounded-xl transition-all ${activeTab === "discounts" ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400"}`}
          >
            Rider Perks 🎁
          </button>
        </div>

        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Order Alert Pop-up Modal */}
            {hasAlert && isOnline && (
              <div className="bg-gradient-to-b from-amber-500/20 to-slate-900 border-2 border-amber-400 rounded-3xl p-5 shadow-2xl animate-bounce-once space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="font-extrabold text-sm text-white uppercase tracking-wider">NEW HYPERLOCAL ORDER ALERT</span>
                  </div>
                  <span className="bg-amber-400 text-slate-950 font-mono font-bold text-xs px-2.5 py-1 rounded-full">
                    {timer}s left
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Dark Store Pick-up:</span>
                    <span className="font-bold text-white">HSR Dark Store #104 (1.1 km)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Customer Distance:</span>
                    <span className="font-bold text-white">3.4 km Total</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Total Delivery Pay:</span>
                    <span className="font-extrabold text-lg text-emerald-400 font-mono">₹55.00</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    onClick={() => setHasAlert(false)}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl h-10 text-xs font-bold"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={handleAcceptOrder}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl h-10 text-xs shadow-lg"
                  >
                    ACCEPT ORDER NOW
                  </Button>
                </div>
              </div>
            )}

            {/* Active Delivery Order Workflow */}
            {acceptedOrder ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Active Order #{acceptedOrder.id}</span>
                    <h3 className="font-extrabold text-base text-white">{acceptedOrder.customerName}</h3>
                  </div>
                  <span className="text-emerald-400 font-mono font-extrabold text-lg">₹{acceptedOrder.pay}.00</span>
                </div>

                {/* Turn-by-Turn Live Map */}
                <div className="h-56 rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
                  <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                </div>

                {/* Order Workflow Stages */}
                <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
                  <div className="font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Delivery Progress Status</span>
                    <span className="text-amber-400 font-mono font-bold uppercase">{orderStage.replace("_", " ")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {["accepted", "at_warehouse", "picked_up", "delivered"].map((st, idx) => (
                      <div
                        key={st}
                        className={`h-1.5 rounded-full ${
                          ["accepted", "at_warehouse", "picked_up", "delivered"].indexOf(orderStage) >= idx
                            ? "bg-amber-400"
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleAdvanceStage}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs shadow-lg"
                >
                  {orderStage === "accepted" && "1. Confirm Arrival at Dark Store"}
                  {orderStage === "at_warehouse" && "2. Confirm Order Picked Up"}
                  {orderStage === "picked_up" && "3. Mark Order as DELIVERED"}
                  {orderStage === "delivered" && "4. Back to Available Fleet Duty"}
                </Button>
              </div>
            ) : (
              !hasAlert && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto border border-slate-700">
                    <Navigation className="w-7 h-7 animate-spin-slow" />
                  </div>
                  <h3 className="font-extrabold text-base text-white">Searching for Nearby Orders...</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    You are positioned in high-demand zone (HSR Sector 2). Stay online to receive the next express order alert!
                  </p>
                  <Button
                    onClick={() => { setHasAlert(true); setTimer(30); }}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold rounded-xl gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Simulate Test Order Alert
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-4">
            {/* Today's Earnings Card */}
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 border border-emerald-900/50 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">TODAY'S TOTAL PAYOUT</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  September 8, 2026
                </span>
              </div>

              <div className="text-4xl font-extrabold font-mono text-white">₹1,485.00</div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/60 text-center text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Trips Done</div>
                  <div className="font-bold text-white text-base font-mono">24</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Base + Distance</div>
                  <div className="font-bold text-white text-base font-mono">₹1,140</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Tips Received</div>
                  <div className="font-bold text-amber-400 text-base font-mono">₹345</div>
                </div>
              </div>

              <Button
                onClick={() => setPayoutRequested(true)}
                disabled={payoutRequested}
                className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 shadow-lg"
              >
                <DollarSign className="w-4 h-4" />
                {payoutRequested ? "Payout Transfer Initiated (UPI)" : "Request Instant Payout to UPI"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "discounts" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">Rider Insider Grocery Perks</h3>
              </div>
              <p className="text-xs text-slate-400">
                Exclusive 20% discount on groceries for all verified Sunotal Delivery Partners.
              </p>

              <div className="space-y-2 pt-2">
                {[
                  { title: "Fresh Fruits & Veggies", discount: "20% OFF", code: "RIDERFRUIT20" },
                  { title: "Dairy & Milk", discount: "15% OFF", code: "RIDERDAIRY15" },
                  { title: "Snacks & Drinks", discount: "20% OFF", code: "RIDERMUNCH20" },
                ].map((perk, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{perk.title}</div>
                      <div className="text-[10px] text-emerald-400 font-mono font-bold">Use Code: {perk.code}</div>
                    </div>
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-full font-bold font-mono text-[11px]">
                      {perk.discount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 text-center text-[10px] text-slate-500">
        Sunotal Hyperlocal Express Partner Portal • Powered by CartoDB Voyager Maps Engine
      </footer>
    </div>
  );
}
