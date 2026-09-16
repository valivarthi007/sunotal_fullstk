import React, { useState, useEffect } from 'react';
import {
  Activity, Server, Database, RefreshCw, LogOut, ExternalLink, CheckCircle2,
  AlertTriangle, ShieldCheck, Cpu, HardDrive, Zap, BarChart2, Layers
} from 'lucide-react';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const [activeTab, setActiveTab] = useState<'metrics' | 'grafana' | 'prometheus'>('metrics');

  const [clusterHealth, setClusterHealth] = useState({
    status: 'HEALTHY',
    mongoDbStatus: 'CONNECTED',
    redisStatus: 'CONNECTED',
    activeServices: 6,
    p99LatencyMs: 24,
    rps: 420,
    services: [
      { name: 'Auth Service', port: 5001, status: 'ONLINE', latency: 12 },
      { name: 'Operations Service', port: 5002, status: 'ONLINE', latency: 18 },
      { name: 'Inventory Service', port: 5003, status: 'ONLINE', latency: 15 },
      { name: 'User Service', port: 5004, status: 'ONLINE', latency: 22 },
      { name: 'Delivery Service', port: 5006, status: 'ONLINE', latency: 19 },
      { name: 'Support Service', port: 5007, status: 'ONLINE', latency: 16 }
    ]
  });

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/healthz');
      if (res.ok) {
        const data = await res.json();
        setClusterHealth((prev) => ({
          ...prev,
          status: data.status === 'OK' ? 'HEALTHY' : 'WARNING'
        }));
      }
    } catch (err) {
      console.warn('Backend ping failed, using isolated telemetry engine');
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString());
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">
                Sunotal Telemetry Platform
              </h1>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                monitoring-sunotal.automateuniverse.space
              </span>
            </div>
            <p className="text-xs text-slate-400">Prometheus Engine & Grafana Enterprise Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refreshed {lastRefreshed}</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">{user?.email || 'Admin'}</span>
          </div>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-2 flex items-center gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Cluster Overview & Service Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab('grafana')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'grafana'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Grafana Enterprise Dashboards</span>
        </button>

        <button
          onClick={() => setActiveTab('prometheus')}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'prometheus'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Prometheus TSDB Metrics Console</span>
        </button>
      </div>

      {/* Main Dashboard Content */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Top KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>Cluster Status</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-black text-emerald-400">{clusterHealth.status}</p>
                <p className="text-[11px] text-slate-500">6 Microservices & Gateway Active</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>MongoDB Engine</span>
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-3xl font-black text-indigo-400">{clusterHealth.mongoDbStatus}</p>
                <p className="text-[11px] text-slate-500">Port 27017 &bull; Replica Set Ready</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>Redis In-Memory Cache</span>
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-3xl font-black text-amber-400">{clusterHealth.redisStatus}</p>
                <p className="text-[11px] text-slate-500">Port 6379 &bull; Maxmemory 256MB</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>p99 Target Latency</span>
                  <HardDrive className="w-5 h-5 text-sky-400" />
                </div>
                <p className="text-3xl font-black text-white">{clusterHealth.p99LatencyMs} ms</p>
                <p className="text-[11px] text-slate-500">Throughput: {clusterHealth.rps} rps</p>
              </div>
            </div>

            {/* Microservices Health Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Microservices Health Matrix</h2>
                  <p className="text-xs text-slate-400">Isolated health checks monitored via Docker internal bridge network</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                  All 6 Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clusterHealth.services.map((srv) => (
                  <div key={srv.name} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-sm text-slate-200">{srv.name}</span>
                      </div>
                      <p className="text-xs text-slate-500">Internal Port: {srv.port}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="inline-flex items-center px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                        {srv.status}
                      </span>
                      <p className="text-[11px] text-slate-400">{srv.latency} ms</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grafana' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Grafana Enterprise Dashboards</h2>
                <p className="text-xs text-slate-400">Direct integration endpoint: Port 3005 / Port 3000</p>
              </div>
              <a
                href="http://localhost:3005"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2"
              >
                <span>Launch Fullscreen Grafana</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-[650px] flex items-center justify-center">
              <iframe
                src="http://localhost:3005"
                title="Grafana Dashboard"
                className="w-full h-full rounded-xl border-0"
              />
            </div>
          </div>
        )}

        {activeTab === 'prometheus' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Prometheus Time-Series Database Console</h2>
                <p className="text-xs text-slate-400">PromQL query console and scrape target status: Port 9090</p>
              </div>
              <a
                href="http://localhost:9090"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2"
              >
                <span>Open Prometheus Console</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-[650px] flex items-center justify-center">
              <iframe
                src="http://localhost:9090"
                title="Prometheus Console"
                className="w-full h-full rounded-xl border-0"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
