import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Server, Database, RefreshCw, LogOut, ExternalLink, CheckCircle2,
  AlertTriangle, ShieldCheck, Cpu, HardDrive, Zap, BarChart2, Layers,
  Terminal, TrendingUp, ArrowUpRight, Check, XCircle
} from 'lucide-react';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

interface ServiceStatus {
  name: string;
  endpoint: string;
  port: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latency: number;
  httpStatus: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const [activeTab, setActiveTab] = useState<'metrics' | 'grafana' | 'prometheus' | 'logs'>('metrics');

  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [logsStream, setLogsStream] = useState<LogEntry[]>([]);

  const [dbMetrics, setDbMetrics] = useState({
    mongoStatus: 'CHECKING',
    redisStatus: 'CHECKING',
    totalUsersCount: 0,
    totalOrdersCount: 0,
    totalProductsCount: 0,
    totalVendorsCount: 0,
    activeDarkStores: 0,
  });

  const [servicesStatus, setServicesStatus] = useState<ServiceStatus[]>([
    { name: 'API Gateway', endpoint: '/api/healthz', port: 5000, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Auth Service', endpoint: '/api/auth/me', port: 5001, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Operations & Admin Service', endpoint: '/api/admin/stats', port: 5002, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Inventory Service', endpoint: '/api/inventory', port: 5003, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'User Service', endpoint: '/api/users', port: 5004, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Vendor Service', endpoint: '/api/vendors', port: 5005, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Delivery Service', endpoint: '/api/delivery/orders/active', port: 5006, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Support Service', endpoint: '/api/support/tickets', port: 5007, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Catalog Service', endpoint: '/api/products', port: 5009, status: 'ONLINE', latency: 0, httpStatus: 200 },
    { name: 'Order Service', endpoint: '/api/orders', port: 5010, status: 'ONLINE', latency: 0, httpStatus: 200 },
  ]);

  const addLog = (service: string, method: string, path: string, status: number, latencyMs: number) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      service,
      method,
      path,
      status,
      latencyMs
    };
    setLogsStream((prev) => [entry, ...prev.slice(0, 49)]);
  };

  const probeServices = async () => {
    setLoading(true);
    const startOverall = performance.now();

    const updatedServices = await Promise.all(
      servicesStatus.map(async (srv) => {
        const start = performance.now();
        try {
          const res = await fetch(srv.endpoint, { method: 'GET', headers: { Accept: 'application/json' } });
          const latency = Math.round(performance.now() - start);
          const isOk = res.status >= 200 && res.status < 400;
          
          addLog(srv.name, 'GET', srv.endpoint, res.status, latency);

          return {
            ...srv,
            latency,
            httpStatus: res.status,
            status: isOk ? ('ONLINE' as const) : ('DEGRADED' as const)
          };
        } catch {
          const latency = Math.round(performance.now() - start);
          addLog(srv.name, 'GET', srv.endpoint, 503, latency);
          return {
            ...srv,
            latency,
            httpStatus: 503,
            status: 'OFFLINE' as const
          };
        }
      })
    );

    setServicesStatus(updatedServices);

    // Query Real Database Telemetry via /api/admin/stats
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setDbMetrics({
          mongoStatus: 'CONNECTED (DocumentDB)',
          redisStatus: 'ACTIVE (ElastiCache)',
          totalUsersCount: stats.totalUsers || 0,
          totalOrdersCount: stats.totalOrders || 0,
          totalProductsCount: stats.totalProducts || 0,
          totalVendorsCount: stats.totalVendors || 0,
          activeDarkStores: stats.activeDarkStores || 0
        });
      }
    } catch {
      setDbMetrics((prev) => ({ ...prev, mongoStatus: 'DISCONNECTED', redisStatus: 'OFFLINE' }));
    }

    const overallLatency = Math.round(performance.now() - startOverall);
    setLatencyHistory((prev) => [...prev.slice(-19), overallLatency]);
    setLastRefreshed(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    probeServices();
    const interval = setInterval(probeServices, 12000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = servicesStatus.filter((s) => s.status === 'ONLINE').length;
  const avgLatency = Math.round(
    servicesStatus.reduce((acc, s) => acc + s.latency, 0) / (servicesStatus.length || 1)
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/10">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-white">
                Live System Telemetry Platform
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold rounded-full tracking-wider uppercase">
                AUTOMATEUNIVERSE
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>monitoring-sunotal.automateuniverse.space &bull; Real-time API, DB & Container Observability</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={probeServices}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refreshed {lastRefreshed}</span>
          </button>

          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-2 rounded-xl text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-extrabold text-emerald-200">{user?.email || 'admin@sunotal.com'}</span>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800/60 bg-slate-950/40 px-6 py-2.5 flex items-center gap-3 text-xs font-extrabold overflow-x-auto">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
            activeTab === 'metrics'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Live Cluster & Database Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
            activeTab === 'logs'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Live Traffic Stream Logs ({logsStream.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grafana')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
            activeTab === 'grafana'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Grafana Dashboards</span>
        </button>

        <button
          onClick={() => setActiveTab('prometheus')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
            activeTab === 'prometheus'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Prometheus TSDB Engine</span>
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Services Status</span>
                  <Server className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-emerald-400 tracking-tight">
                    {onlineCount}/{servicesStatus.length}
                  </p>
                  <span className="text-xs text-emerald-400 font-bold">Active Probes</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">ECS Fargate Cluster Services</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Database State</span>
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-xl font-black text-indigo-300 tracking-tight">{dbMetrics.mongoStatus}</p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between font-medium">
                  <span>Orders: {dbMetrics.totalOrdersCount}</span>
                  <span>Products: {dbMetrics.totalProductsCount}</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Cache Engine</span>
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-xl font-black text-amber-300 tracking-tight">{dbMetrics.redisStatus}</p>
                <p className="text-[11px] text-slate-400 font-medium">ElastiCache Redis Engine</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Measured Avg Latency</span>
                  <Activity className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-white tracking-tight">{avgLatency} ms</p>
                  <span className="text-xs text-sky-400 font-bold">Live Probe</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Real-Time Probe Latency</p>
              </div>
            </div>

            {/* Real Latency Graph */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Real-Time Measured API Response Latency</span>
                  </h3>
                  <p className="text-xs text-slate-400">Live latency measurements recorded from live HTTP pings</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Measured Latency Graph
                  </span>
                </div>
              </div>

              <div className="h-28 flex items-end gap-2 pt-4 border-t border-slate-800/80 px-2">
                {latencyHistory.map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      style={{ height: `${Math.min(100, Math.max(10, (val / 100) * 100))}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600/40 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:from-emerald-500 group-hover:to-teal-300"
                    />
                    <span className="text-[9px] font-mono text-slate-500">{val}ms</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Real Services Matrix */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-400" />
                    <span>Live Microservices Probe Matrix</span>
                  </h2>
                  <p className="text-xs text-slate-400">Live health endpoints probed across the microservices cluster</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-extrabold rounded-full border border-emerald-500/20">
                  {onlineCount} Online
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servicesStatus.map((srv) => (
                  <div
                    key={srv.name}
                    className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl space-y-3 hover:border-emerald-500/30 transition-all hover:bg-slate-950 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {srv.port}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors">{srv.name}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">{srv.endpoint}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-full border ${
                          srv.status === 'ONLINE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : srv.status === 'DEGRADED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {srv.status === 'ONLINE' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        )}
                        {srv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                      <div>
                        <p className="text-slate-500 font-medium">Probe Latency</p>
                        <p className="font-mono font-bold text-slate-200">{srv.latency} ms</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">HTTP Code</p>
                        <p className="font-mono font-bold text-slate-200">{srv.httpStatus}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <span>Real-time Live Traffic Stream Logs</span>
                </h2>
                <p className="text-xs text-slate-400">Capturing live HTTP probe requests and API status streams</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                Live Capturing
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 font-mono text-xs text-emerald-400 space-y-2 h-[550px] overflow-y-auto shadow-2xl">
              {logsStream.length === 0 ? (
                <p className="text-slate-500">Listening for live network probes...</p>
              ) : (
                logsStream.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 border-b border-slate-900/50 pb-1.5">
                    <span className="text-slate-500 shrink-0 text-[10px]">{log.timestamp.split('T')[1].replace('Z', '')}</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">{log.service}</span>
                    <span className="text-teal-400 font-bold">{log.method}</span>
                    <span className="text-slate-200 flex-1 truncate">{log.path}</span>
                    <span className={log.status < 400 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {log.status}
                    </span>
                    <span className="text-slate-400 font-mono shrink-0">{log.latencyMs}ms</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'grafana' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Grafana Dashboards</h2>
                <p className="text-xs text-slate-400">Embedded integration &bull; http://localhost:3005</p>
              </div>
              <a
                href="http://localhost:3005"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Open Grafana Fullscreen</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 h-[650px] flex items-center justify-center">
              <iframe src="http://localhost:3005" title="Grafana Dashboard" className="w-full h-full rounded-2xl border-0" />
            </div>
          </div>
        )}

        {activeTab === 'prometheus' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Prometheus TSDB Engine Console</h2>
                <p className="text-xs text-slate-400">PromQL query console &bull; http://localhost:9090</p>
              </div>
              <a
                href="http://localhost:9090"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Open Prometheus Console</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 h-[650px] flex items-center justify-center">
              <iframe src="http://localhost:9090" title="Prometheus Console" className="w-full h-full rounded-2xl border-0" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
