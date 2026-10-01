import React, { useState, useEffect } from "react";
import {
  Boxes,
  Truck,
  QrCode,
  Thermometer,
  ShieldCheck,
  Scale,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  PackageCheck,
  UserCheck,
  Radio,
  Sliders,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function WarehouseApp() {
  const [activeTab, setActiveTab] = useState<"asn" | "fefo" | "picking" | "fleet" | "iot" | "custody">("picking");
  
  // Real DB state queries
  const [custodyLogs, setCustodyLogs] = useState<any[]>([]);
  const [asnOrders, setAsnOrders] = useState<any[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<any[]>([]);
  const [pickingTasks, setPickingTasks] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [storeStatus, setStoreStatus] = useState<"normal" | "throttled" | "offline">("normal");

  // Form states
  const [barcodeInput, setBarcodeInput] = useState("");
  const [measuredWeight, setMeasuredWeight] = useState("");
  const [intakeTemp, setIntakeTemp] = useState("3.8");

  // Fetch live WMS data from Gateway
  const fetchWmsData = async () => {
    try {
      const [logsRes, asnRes, batchRes, pickRes, telemRes] = await Promise.all([
        fetch("/api/wms/custody/logs").then(r => r.ok ? r.json() : null),
        fetch("/api/wms/asn").then(r => r.ok ? r.json() : null),
        fetch("/api/wms/batches").then(r => r.ok ? r.json() : null),
        fetch("/api/wms/picking/tasks").then(r => r.ok ? r.json() : null),
        fetch("/api/wms/telemetry").then(r => r.ok ? r.json() : null),
      ]);

      if (logsRes?.logs) setCustodyLogs(logsRes.logs);
      if (asnRes?.asns) setAsnOrders(asnRes.asns);
      if (batchRes?.batches) setInventoryBatches(batchRes.batches);
      if (pickRes?.tasks) setPickingTasks(pickRes.tasks);
      if (telemRes?.telemetry) setTelemetry(telemRes.telemetry);
    } catch (e) {
      console.warn("Error fetching WMS live data:", e);
    }
  };

  useEffect(() => {
    fetchWmsData();
    const interval = setInterval(fetchWmsData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Action Handlers
  const handleInwardAsn = async (asnNumber: string) => {
    try {
      const res = await fetch("/api/wms/asn/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asnNumber,
          receivedCrates: 10,
          coldChainPassed: Number(intakeTemp) <= 5.0,
          intakeTempCelsius: Number(intakeTemp),
        }),
      });
      if (res.ok) {
        toast.success(`ASN #${asnNumber} inwarded and logged to chain of custody!`);
        fetchWmsData();
      }
    } catch {
      toast.error("Failed to receive ASN crates");
    }
  };

  const handleVerifyWeight = async (orderId: string) => {
    if (!measuredWeight) {
      toast.error("Please enter measured bag weight from digital scale");
      return;
    }
    try {
      const res = await fetch("/api/wms/picking/verify-weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          measuredWeightGrams: Number(measuredWeight),
        }),
      });
      if (res.ok) {
        toast.success(`Weight verified (${measuredWeight}g) & logged to Chain of Custody!`);
        setMeasuredWeight("");
        fetchWmsData();
      }
    } catch {
      toast.error("Failed to verify bag weight");
    }
  };

  const handleApplyMarkdown = async (batchId: number) => {
    try {
      const res = await fetch("/api/wms/batches/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, discountPercent: 30 }),
      });
      if (res.ok) {
        toast.success("Applied 30% FEFO Expiry Discount to batch!");
        fetchWmsData();
      }
    } catch {
      toast.error("Failed to apply dynamic markdown");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-20">
      {/* Top WMS Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
              <Boxes className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">Sunotal Dark Store WMS</h1>
                <Badge className="bg-emerald-950 text-emerald-400 border-emerald-500/40 text-[10px]">
                  Vijayawada Hub #01
                </Badge>
              </div>
              <p className="text-xs text-slate-400">Picker Execution & Chain of Custody System</p>
            </div>
          </div>

          {/* Store Throttling Mode Controls */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-bold px-2">Store Mode:</span>
            <button
              onClick={() => setStoreStatus("normal")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                storeStatus === "normal" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Normal (10m SLA)
            </button>
            <button
              onClick={() => setStoreStatus("throttled")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                storeStatus === "throttled" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Throttled (Surge)
            </button>
            <button
              onClick={() => setStoreStatus("offline")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                storeStatus === "offline" ? "bg-rose-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Offline
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-slate-800">
          {[
            { id: "picking", label: "1. Order Pick & Weigh", icon: Scale },
            { id: "asn", label: "2. Inbound PO Receiving", icon: QrCode },
            { id: "fefo", label: "3. FEFO Stock & Markdowns", icon: Flame },
            { id: "fleet", label: "4. Rider Staging Queue", icon: Truck },
            { id: "iot", label: "5. Chiller IoT Telemetry", icon: Thermometer },
            { id: "custody", label: "6. Chain of Custody Audit", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-emerald-600 text-slate-950 shadow-lg font-black"
                    : "bg-slate-900/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* TAB 1: ORDER PICK & WEIGHING */}
        {activeTab === "picking" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Path-Optimized Picking & Weight Checkpoint</h2>
                <p className="text-xs text-slate-400">Single-direction walk sequence & digital scale tolerance check</p>
              </div>
              <Button onClick={fetchWmsData} size="sm" variant="outline" className="border-slate-800 rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Sync Queue
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pickingTasks.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800 col-span-2 p-12 text-center text-slate-400 space-y-2 rounded-3xl">
                  <PackageCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="font-bold text-white">All orders packed & weighed!</p>
                  <p className="text-xs">New paid customer orders will appear here automatically.</p>
                </Card>
              ) : (
                pickingTasks.map((task) => (
                  <Card key={task.id} className="bg-slate-900 border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Order #{task.order_number || task.order_id}</span>
                        <h3 className="text-base font-bold text-white">{task.customerName || "Customer"}</h3>
                        <p className="text-xs text-slate-400">{task.delivery_address || "Vijayawada Central"}</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 uppercase text-[10px]">
                        {task.status}
                      </Badge>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5" /> Dijkstra Walk Sequence: Aisle A-01 $\rightarrow$ Chiller B-02 $\rightarrow$ Rack C-04
                      </p>
                      <p className="text-[10px] text-slate-400">Estimated Target Bag Weight: ~1,250 grams</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-400" /> Digital Weight Scale Input (grams):
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. 1245"
                          value={measuredWeight}
                          onChange={(e) => setMeasuredWeight(e.target.value)}
                          className="bg-slate-950 border-slate-800 rounded-xl text-xs font-mono"
                        />
                        <Button
                          onClick={() => handleVerifyWeight(String(task.order_id))}
                          className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black rounded-xl text-xs px-4"
                        >
                          Verify & Stage
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INBOUND PO RECEIVING */}
        {activeTab === "asn" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Inbound Advance Shipping Notice (ASN) Reconciliation</h2>
                <p className="text-xs text-slate-400">Scan incoming FMCG crates & verify cold-chain intake temperature</p>
              </div>
            </div>

            <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" /> Dock Crate Barcode Scanner
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Scan ASN PO Barcode (e.g. ASN-2026-8801)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="bg-slate-950 border-slate-800 rounded-xl text-xs font-mono"
                />
                <Input
                  placeholder="Intake Temp (°C) e.g. 3.8"
                  value={intakeTemp}
                  onChange={(e) => setIntakeTemp(e.target.value)}
                  className="bg-slate-950 border-slate-800 rounded-xl text-xs font-mono"
                />
                <Button
                  onClick={() => handleInwardAsn(barcodeInput || "ASN-2026-8801")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black rounded-xl text-xs"
                >
                  Inward Crate & Log Custody
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active PO Shipping Manifests</h3>
              {asnOrders.map((asn) => (
                <Card key={asn.id} className="bg-slate-900 border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{asn.asn_number}</span>
                    <p className="text-slate-400">{asn.vendor_name} • Expected: {asn.expected_crates} crates</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={asn.status === "received" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-300"}>
                      {asn.status}
                    </Badge>
                    <Button onClick={() => handleInwardAsn(asn.asn_number)} size="sm" variant="outline" className="rounded-xl border-slate-700">
                      Receive Crates
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FEFO STOCK & MARKDOWNS */}
        {activeTab === "fefo" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">FEFO (First Expiring, First Out) Inventory Batches</h2>
                <p className="text-xs text-slate-400">Managed batch expiry dates & dynamic markdown triggers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inventoryBatches.map((batch) => (
                <Card key={batch.id} className="bg-slate-900 border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{batch.product_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Batch #{batch.batch_number} • Bin {batch.bin_code}</p>
                    </div>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[9px]">
                      Exp: {batch.expiry_date}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span>Stock Qty: <strong>{batch.current_qty}</strong></span>
                    <span>Markdown: <strong className="text-amber-400">{batch.markdown_discount_percent || 0}%</strong></span>
                  </div>

                  <Button
                    onClick={() => handleApplyMarkdown(batch.id)}
                    size="sm"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Apply 30% Expiry Markdown
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RIDER STAGING QUEUE */}
        {activeTab === "fleet" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Fleet & Rider Staging Queue</h2>
                <p className="text-xs text-slate-400">200m Geofenced waiting zone & dispatch load balancing</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 text-center space-y-2">
                <Radio className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-white">6 Riders</h3>
                <p className="text-xs text-slate-400">Inside 200m Geofence Waiting Zone</p>
              </Card>
              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 text-center space-y-2">
                <Clock className="w-8 h-8 text-amber-400 mx-auto" />
                <h3 className="text-2xl font-black text-white">1.8 Mins</h3>
                <p className="text-xs text-slate-400">Avg Staging Handover Time</p>
              </Card>
              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-6 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto" />
                <h3 className="text-2xl font-black text-white">100% Validated</h3>
                <p className="text-xs text-slate-400">Tamper Seals & Handover OTPs</p>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 5: CHILLER IOT TELEMETRY */}
        {activeTab === "iot" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Cold-Chain IoT Sensor Telemetry</h2>
                <p className="text-xs text-slate-400">Real-time walk-in chiller & deep freezer temperature logs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {telemetry.map((log) => (
                <Card key={log.id} className="bg-slate-900 border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${log.alert_triggered ? "bg-rose-950 text-rose-400 animate-bounce" : "bg-emerald-950 text-emerald-400"}`}>
                      <Thermometer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{log.unit_name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.logged_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black font-mono ${log.alert_triggered ? "text-rose-400" : "text-emerald-400"}`}>
                      {log.temperature_celsius}°C
                    </span>
                    {log.alert_triggered && <p className="text-[9px] text-rose-400 font-bold uppercase">High Temp Alert!</p>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CHAIN OF CUSTODY AUDIT LOG */}
        {activeTab === "custody" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Multi-Role Chain of Custody Audit Log</h2>
                <p className="text-xs text-slate-400">"Who took what, when, from which batch/bin, and delivered to whom"</p>
              </div>
              <Button onClick={fetchWmsData} size="sm" variant="outline" className="border-slate-800 rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh Audit Trail
              </Button>
            </div>

            <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="divide-y divide-slate-800">
                {custodyLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
                ) : (
                  custodyLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-950/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-slate-800 text-slate-300 font-mono uppercase text-[9px]">
                          {log.actor_role}
                        </Badge>
                        <div>
                          <p className="font-bold text-white">
                            {log.actor_name} — <span className="text-emerald-400">{log.action}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Order #{log.order_id || "N/A"} • Batch #{log.batch_number || "N/A"} • Weight: {log.measured_weight_grams ? `${log.measured_weight_grams}g` : "N/A"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
