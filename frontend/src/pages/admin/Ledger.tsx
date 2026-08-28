import React, { useState } from "react";
import { BookOpen, Download, Calendar, DollarSign, CreditCard, QrCode, FileText, ArrowUpRight, CheckCircle2, Clock, Filter, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export const AdminLedger: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "card" | "upi" | "netbanking" | "po">("all");

  const ledgerSummary = {
    totalRevenue: 284500,
    onlineCollections: 214000,
    upiCollections: 54500,
    poReceivables: 16000,
    completedSettlements: 198000,
    pendingVendorPayouts: 86500,
  };

  const dailyTransactions = [
    { id: "TXN-90412", orderId: "ORD-2026-8801", time: "18:45 PM", customer: "John Doe", type: "UPI", VPA: "user@okicici", amount: 1450, status: "SUCCESS", payoutStatus: "SETTLED" },
    { id: "TXN-90413", orderId: "ORD-2026-8802", time: "17:30 PM", customer: "Tech Corp Inc", type: "po", VPA: "PO-2026-SUN-0091", amount: 16000, status: "SUCCESS", payoutStatus: "PENDING_NET30" },
    { id: "TXN-90414", orderId: "ORD-2026-8803", time: "15:20 PM", customer: "Ananya Sharma", type: "card", VPA: "VISA **** 4111", amount: 2350, status: "SUCCESS", payoutStatus: "SETTLED" },
    { id: "TXN-90415", orderId: "ORD-2026-8804", time: "12:10 PM", customer: "Ramesh Farmer Procurement", type: "netbanking", VPA: "HDFC-NetBank", amount: 45000, status: "SUCCESS", payoutStatus: "SETTLED" },
    { id: "TXN-90416", orderId: "ORD-2026-8805", time: "10:05 AM", customer: "Priya Patel", type: "upi", VPA: "priya@gpay", amount: 890, status: "SUCCESS", payoutStatus: "SETTLED" },
  ];

  const filteredTransactions = dailyTransactions.filter(
    (t) => paymentFilter === "all" || t.type === paymentFilter
  );

  const handleExportCsv = () => {
    const headers = "Transaction ID,Order Ref,Time,Customer,Method,Details,Amount (INR),Status,Settlement\n";
    const rows = filteredTransactions
      .map((t) => `${t.id},${t.orderId},${t.time},"${t.customer}",${t.type},"${t.VPA}",${t.amount},${t.status},${t.payoutStatus}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sunotal_DayEnd_Financial_Ledger_${selectedDate}.csv`;
    a.click();
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight">Financial Ledger & Day-End Settlement Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time daily payment reconciliation, vendor payouts, and corporate receivables ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border rounded-xl px-3 py-1.5 shadow-sm text-xs">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none font-mono text-xs text-foreground cursor-pointer"
            />
          </div>
          <Button onClick={handleExportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Download className="w-4 h-4 mr-2" /> Export CSV Report
          </Button>
        </div>
      </div>

      {/* Top Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Day-End Total Collection</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-foreground font-mono">{fmt(ledgerSummary.totalRevenue)}</p>
          <p className="text-[11px] text-emerald-600 font-medium">100% reconciled against DB orders</p>
        </div>

        <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>UPI / Card Direct Online</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-foreground font-mono">{fmt(ledgerSummary.onlineCollections + ledgerSummary.upiCollections)}</p>
          <p className="text-[11px] text-blue-600 font-medium">Captured via Payment Gateway</p>
        </div>

        <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Corporate PO Receivables</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 font-mono">{fmt(ledgerSummary.poReceivables)}</p>
          <p className="text-[11px] text-amber-600 font-medium">Net-30 Invoice Terms</p>
        </div>

        <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Farmer / Vendor Settlements</span>
            <ArrowUpRight className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600 font-mono">{fmt(ledgerSummary.completedSettlements)}</p>
          <p className="text-[11px] text-purple-600 font-medium">Direct Bank Transfer (NEFT/RTGS)</p>
        </div>
      </div>

      {/* Daily Transaction Ledger Table */}
      <div className="border rounded-2xl p-6 bg-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="font-bold text-lg">Daily Transaction & Payment Journal</h2>
            <p className="text-xs text-muted-foreground">Date: {selectedDate}</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex bg-muted p-1 rounded-xl text-xs font-semibold">
              {(["all", "card", "upi", "netbanking", "po"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentFilter(m)}
                  className={`px-3 py-1 rounded-lg uppercase transition-all ${
                    paymentFilter === m ? "bg-background text-emerald-600 shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b">
              <tr>
                <th className="p-3">Txn ID</th>
                <th className="p-3">Order Ref</th>
                <th className="p-3">Time</th>
                <th className="p-3">Customer / Party</th>
                <th className="p-3">Method</th>
                <th className="p-3">Payment Details</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-bold text-foreground">{t.id}</td>
                  <td className="p-3 text-emerald-600">{t.orderId}</td>
                  <td className="p-3 text-muted-foreground">{t.time}</td>
                  <td className="p-3 font-sans font-medium text-foreground">{t.customer}</td>
                  <td className="p-3 uppercase font-bold text-xs">{t.type}</td>
                  <td className="p-3 text-muted-foreground">{t.VPA}</td>
                  <td className="p-3 text-right font-extrabold text-foreground">{fmt(t.amount)}</td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-sans font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold ${
                      t.payoutStatus === "SETTLED"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      <Clock className="w-3 h-3" /> {t.payoutStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
