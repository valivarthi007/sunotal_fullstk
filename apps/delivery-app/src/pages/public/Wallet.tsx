import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Zap,
  Gift,
  ChevronLeft,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Wallet() {
  const [, setLocation] = useLocation();
  const [balance, setBalance] = useState(350);
  const [topUpAmount, setTopUpAmount] = useState("500");

  const [transactions, setTransactions] = useState([
    {
      id: "TXN-9021",
      type: "credit",
      title: "Instant Refund - Order #ORD-2026-4821",
      subtitle: "Item quality resolution for Hydroponic Tomatoes",
      amount: "+ ₹90.00",
      date: "08 Sep 2026, 04:15 PM",
    },
    {
      id: "TXN-8812",
      type: "debit",
      title: "1-Click Checkout - Order #ORD-2026-4821",
      subtitle: "Express 10-Min Delivery",
      amount: "- ₹240.00",
      date: "08 Sep 2026, 03:50 PM",
    },
    {
      id: "TXN-8104",
      type: "credit",
      title: "Weekly Organic Grocery Cashback",
      subtitle: "Promotional bonus credit",
      amount: "+ ₹50.00",
      date: "01 Sep 2026, 10:00 AM",
    },
    {
      id: "TXN-7491",
      type: "credit",
      title: "Wallet Top-up via UPI (Razorpay)",
      subtitle: "Added balance to Sunotal Cash",
      amount: "+ ₹450.00",
      date: "28 Aug 2026, 11:30 AM",
    },
  ]);

  const handleTopUp = () => {
    const amt = Number(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid top-up amount");
      return;
    }

    setBalance((prev) => prev + amt);
    setTransactions([
      {
        id: `TXN-${Math.floor(Math.random() * 9000 + 1000)}`,
        type: "credit",
        title: "Wallet Top-up via UPI",
        subtitle: "Instant credit to Sunotal Cash",
        amount: `+ ₹${amt}.00`,
        date: "Just now",
      },
      ...transactions,
    ]);

    toast.success(`Successfully added ₹${amt} to your Sunotal Cash wallet!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Store
          </Button>
          <div className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white">Sunotal Cash Wallet</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Wallet Balance Hero Card */}
        <Card className="bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" /> 1-Click Instant Express Checkout
              </div>
              <p className="text-xs text-slate-300 font-medium">Available Wallet Balance</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white font-mono">
                ₹{balance}.00
              </h2>
              <p className="text-xs text-emerald-400/90">
                ✓ Auto-applied at checkout for zero payment drops & faster 10-min delivery
              </p>
            </div>

            {/* Quick Top-Up Box */}
            <div className="w-full md:w-80 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300">Add Cash to Wallet</span>
              <div className="flex gap-2">
                {["200", "500", "1000"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTopUpAmount(preset)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      topUpAmount === preset
                        ? "bg-emerald-500 text-slate-950 shadow-md"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    +₹{preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₹</span>
                  <Input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="pl-7 bg-slate-900 border-slate-700 text-xs text-white font-mono rounded-xl h-10"
                  />
                </div>
                <Button
                  onClick={handleTopUp}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs h-10 px-4 gap-1.5 shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">0-Second Checkout</h4>
              <p className="text-[11px] text-slate-400">Skip OTPs and payment bank delays</p>
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Instant Item Refunds</h4>
              <p className="text-[11px] text-slate-400">Damaged items credited within 30 secs</p>
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">5% Extra Cashback</h4>
              <p className="text-[11px] text-slate-400">Earn bonus cash on weekly top-ups</p>
            </div>
          </Card>
        </div>

        {/* Transaction History Ledger */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Transaction History</h3>
            <Badge className="bg-slate-800 text-slate-300 hover:bg-slate-800 border-slate-700">
              {transactions.length} Transactions
            </Badge>
          </div>

          <div className="space-y-3">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      txn.type === "credit"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {txn.type === "credit" ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{txn.title}</p>
                    <p className="text-[11px] text-slate-400">{txn.subtitle}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{txn.date}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-bold font-mono ${
                      txn.type === "credit" ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {txn.amount}
                  </span>
                  <p className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                    <Check className="w-3 h-3" /> Completed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
