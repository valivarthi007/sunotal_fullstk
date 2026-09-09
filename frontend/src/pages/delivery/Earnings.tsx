import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Wallet,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  ArrowUpRight,
  ChevronLeft,
  Banknote,
  ShieldAlert,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Earnings() {
  const [, setLocation] = useLocation();
  const [upiId, setUpiId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("sunotal_rider_upi_id") || "" : ""
  );
  const [payoutRequested, setPayoutRequested] = useState(false);

  const earnings = {
    todayTotal: 1480,
    completedOrders: 18,
    kmsTravelled: 64.5,
    basePay: 540, // 18 × ₹30
    distancePay: 645, // 64.5km × ₹10
    surgeBonus: 150,
    tips: 145,
    codCashInHand: 420,
    netPayable: 1060, // 1480 - 420 COD
  };

  const trips = [
    { id: "TRP-901", order: "ORD-2026-4821", time: "10:45 AM", dist: "3.2 km", pay: "₹82", surge: "+₹15", tip: "₹20" },
    { id: "TRP-898", order: "ORD-2026-4810", time: "10:12 AM", dist: "4.1 km", pay: "₹71", surge: "+₹10", tip: "₹0" },
    { id: "TRP-885", order: "ORD-2026-4792", time: "09:30 AM", dist: "2.8 km", pay: "₹63", surge: "₹0", tip: "₹15" },
    { id: "TRP-874", order: "ORD-2026-4781", time: "08:50 AM", dist: "5.5 km", pay: "₹95", surge: "+₹20", tip: "₹30" },
  ];

  const handleRequestPayout = () => {
    if (!upiId || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    setPayoutRequested(true);
    toast.success(`Payout of ₹${earnings.netPayable} initiated to ${upiId}! Credit in 15 mins.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/delivery")}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Delivery Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white">Rider Earnings & Payouts</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Earnings Summary Hero */}
        <Card className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Instant Daily UPI Settlement
              </div>
              <p className="text-xs text-slate-400 font-medium">Total Today's Gross Earnings</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white font-mono">
                ₹{earnings.todayTotal}.00
              </h2>
              <p className="text-xs text-emerald-400">
                ✓ {earnings.completedOrders} Orders Completed • {earnings.kmsTravelled} km Travelled
              </p>
            </div>

            <div className="w-full md:w-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-right space-y-2">
              <span className="text-xs text-slate-400 block font-medium">Net Transferable Payout</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                ₹{earnings.netPayable}.00
              </span>
              <span className="text-[10px] text-slate-500 block">
                (After ₹{earnings.codCashInHand} COD Cash Reconciliation)
              </span>
            </div>
          </div>

          {/* Instant Payout Form */}
          <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Input
                type="text"
                placeholder="Enter your UPI ID (e.g., rider@upi)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs text-white rounded-xl h-11 px-4"
              />
            </div>
            <Button
              onClick={handleRequestPayout}
              disabled={payoutRequested}
              className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs h-11 px-6 shadow-md shrink-0"
            >
              {payoutRequested ? "Payout Requested ✓" : "Request Instant Payout"}
            </Button>
          </div>
        </Card>

        {/* Incentive Target Banner */}
        <Card className="bg-slate-900 border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Daily Incentive Milestone</h4>
              <p className="text-[11px] text-slate-400">Complete 2 more orders to unlock ₹150 Peak Bonus!</p>
            </div>
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-mono text-xs">
            18 / 20 Orders
          </Badge>
        </Card>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Base Pay</span>
            <p className="text-lg font-bold text-white font-mono">₹{earnings.basePay}</p>
            <span className="text-[10px] text-slate-500">₹30 × 18 orders</span>
          </Card>

          <Card className="bg-slate-900 border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Distance Pay</span>
            <p className="text-lg font-bold text-white font-mono">₹{earnings.distancePay}</p>
            <span className="text-[10px] text-slate-500">₹10/km × 64.5 km</span>
          </Card>

          <Card className="bg-slate-900 border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Peak Surge</span>
            <p className="text-lg font-bold text-emerald-400 font-mono">₹{earnings.surgeBonus}</p>
            <span className="text-[10px] text-emerald-500">High demand hours</span>
          </Card>

          <Card className="bg-slate-900 border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Customer Tips</span>
            <p className="text-lg font-bold text-amber-400 font-mono">₹{earnings.tips}</p>
            <span className="text-[10px] text-amber-500">100% passed to rider</span>
          </Card>
        </div>

        {/* Trip Log */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Recent Completed Trips</h3>
          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">{trip.order}</span>
                    <Badge className="bg-slate-800 text-slate-300 text-[10px]">{trip.dist}</Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{trip.time}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-emerald-400">{trip.pay}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                    <span>Surge: {trip.surge}</span> • <span>Tip: {trip.tip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
