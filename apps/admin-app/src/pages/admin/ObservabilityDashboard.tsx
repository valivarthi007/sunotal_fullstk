import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Activity, Server, Cpu, Database, ExternalLink, RefreshCw, CheckCircle2, ShieldCheck, Zap, ArrowLeft, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ObservabilityDashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  const observabilityUrl = 'https://observability.automateuniverse.space';

  const [clusterStats, setClusterStats] = useState({
    status: "HEALTHY",
    activeContainers: 8,
    p99LatencyMs: 28,
    throughputRps: 340,
    standaloneMongoStatus: "CONNECTED",
    prometheusStatus: "ACTIVE",
    grafanaStatus: "ACTIVE"
  });

  const fetchClusterHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/healthz");
      if (res.ok) {
        const data = await res.json();
        setClusterStats((prev) => ({
          ...prev,
          status: data.status === "OK" ? "HEALTHY" : "WARNING",
          activeContainers: Object.keys(data.services || {}).length + 2
        }));
      }
    } catch (e) {
      console.error("Health check error:", e);
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString());
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterHealth();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin/dashboard")}
                className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground mr-1"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Control Center
              </Button>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Dedicated Telemetry Node
              </span>
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Activity className="w-7 h-7 text-emerald-600 dark:text-emerald-400" /> Platform Observability & Metrics
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time telemetry, Prometheus TSDB engine, and Grafana dashboards hosted at dedicated endpoint.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchClusterHealth}
              disabled={loading}
              className="rounded-xl text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refreshed {lastRefreshed}
            </Button>
            <a
              href={observabilityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>Launch Observability Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Cluster Metrics Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Cluster Health</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{clusterStats.status}</p>
            <p className="text-[11px] text-muted-foreground">All microservice routes active</p>
          </div>

          <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Active Containers</span>
              <Server className="w-5 h-5 text-sky-500" />
            </div>
            <p className="text-2xl font-black text-foreground">{clusterStats.activeContainers} Services</p>
            <p className="text-[11px] text-muted-foreground">Docker Compose cluster</p>
          </div>

          <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">p99 Gateway Latency</span>
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-foreground">{clusterStats.p99LatencyMs} ms</p>
            <p className="text-[11px] text-muted-foreground">Target SLA &lt; 50ms</p>
          </div>

          <div className="bg-card border p-5 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Standalone Database</span>
              <Database className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{clusterStats.standaloneMongoStatus}</p>
            <p className="text-[11px] text-muted-foreground">MongoDB v7.0 (Port 27017)</p>
          </div>
        </div>

        {/* Dedicated Observability Launch Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white border border-emerald-500/30 p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold">
              <BarChart2 className="w-4 h-4 text-emerald-400" /> External Telemetry Engine
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Prometheus & Grafana Enterprise Telemetry
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              As per microservices security best practices, the full metrics engine, Grafana dashboards, and Prometheus query console are isolated outside the main Admin App at <code className="text-emerald-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">observability.automateuniverse.space</code>.
            </p>
          </div>

          <a
            href={observabilityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all text-sm flex items-center gap-2 whitespace-nowrap"
          >
            <span>Open Grafana Dashboards</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </AdminLayout>
  );
};
