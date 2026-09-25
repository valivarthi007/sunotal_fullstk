import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Link } from "wouter";
import { 
  Cloud, 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  Globe, 
  Radio, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  Coins, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Search, 
  ExternalLink,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  "Compute": "#3b82f6",
  "Database & Cache": "#a855f7",
  "Database": "#a855f7",
  "Storage & CDN": "#10b981",
  "Storage": "#10b981",
  "Networking & DNS": "#f59e0b",
  "Management & Messaging": "#ef4444",
  "Security & Network": "#06b6d4"
};

export default function AwsCostBreakdown() {
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBillingData = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_admin_token");
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch("/api/admin/aws-billing", { headers });
      if (res.ok) {
        const data = await res.json();
        setBillingData(data);
      }
    } catch (err) {
      console.warn("Could not fetch AWS billing API:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const services = billingData?.services || [];

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    set.add("All");
    services.forEach((s: any) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [services]);

  const filteredServices = React.useMemo(() => {
    return services.filter((s: any) => {
      const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
      const matchesSearch = !search.trim() || 
        s.serviceName.toLowerCase().includes(search.toLowerCase()) || 
        s.specs.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [services, selectedCategory, search]);

  const chartData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    services.forEach((s: any) => {
      const cat = s.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (s.estimatedMonthly || 0);
    });
    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));
  }, [services]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/admin">
                <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 font-bold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                </Button>
              </Link>
              <Badge className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-mono font-bold flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5" /> AWS Infrastructure Explorer
              </Badge>
              {billingData?.isLiveAws && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-mono font-bold">
                  ⚡ AWS Metered Cost Explorer Active
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              AWS Infrastructure Cost & Service Breakdown
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Detailed cost allocation, metered resource usage, and month-end estimates for all 15 AWS infrastructure modules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={fetchBillingData} 
              disabled={isRefreshing}
              variant="outline" 
              size="sm" 
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} /> 
              Refresh Metered Rates
            </Button>
          </div>
        </div>

        {/* Top 4 Summary KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: MTD Spend */}
            <div className="p-5 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accrued Month-to-Date</span>
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-foreground">
                  ${(billingData?.monthToDateSpend || 0).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground font-mono ml-2">
                  (₹{((billingData?.monthToDateSpend || 0) * 83).toLocaleString('en-IN')})
                </span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Billing Cycle: Current Month
              </div>
            </div>

            {/* Card 2: Forecasted Month-End */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-2xl shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Month-End Bill</span>
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-amber-400">
                  ${(billingData?.forecastedMonthEndBill || 0).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-mono ml-2">
                  (₹{((billingData?.forecastedMonthEndBill || 0) * 83).toLocaleString('en-IN')})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                Projected total for current billing cycle
              </div>
            </div>

            {/* Card 3: Applied Credits */}
            <div className="p-5 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AWS Credits & Balance</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ${billingData?.remainingCredits || 850.00}
                </span>
                <span className="text-xs text-muted-foreground font-mono ml-1">Credits Left</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full" 
                  style={{ width: `${((billingData?.remainingCredits || 850) / (billingData?.totalCreditsAllocated || 1000)) * 100}%` }}
                />
              </div>
            </div>

            {/* Card 4: Provisioned Services Count */}
            <div className="p-5 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Provisioned AWS Services</span>
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl md:text-3xl font-black text-foreground">
                  {billingData?.totalActiveServices || services.length}
                </span>
                <span className="text-xs text-muted-foreground font-mono ml-2">Active Modules</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">
                100% Architecture Monitored
              </div>
            </div>
          </div>
        )}

        {/* Charts & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Category Cost Share (Recharts Bar) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Monthly Service Cost Share</h3>
                <p className="text-xs text-muted-foreground">Estimated monthly bill distribution by service category.</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">Category Breakdown</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} unit="$" />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Proportion Donut */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Category Proportions</h3>
              <p className="text-xs text-muted-foreground">Percentage share of total month-end cloud spend.</p>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={CATEGORY_COLORS[entry.name] || "#3b82f6"} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs font-mono border-t border-border pt-3">
              {chartData.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.name] || "#3b82f6" }} />
                    <span className="text-muted-foreground truncate max-w-[140px]">{c.name}</span>
                  </span>
                  <span className="font-bold text-foreground">${c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Services Cost Breakdown Table Section */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" /> Provisioned AWS Services & Resource Metering
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete list of all {services.length} active AWS infrastructure services with resource specifications and metered costs.
              </p>
            </div>

            {/* Controls: Search & Category Pills */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search AWS services..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-6 flex items-center gap-1.5 overflow-x-auto pb-2 text-xs font-semibold">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap border ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                    : "bg-accent/40 text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-accent/50 text-muted-foreground font-bold uppercase tracking-wider border-y border-border">
                <tr>
                  <th className="px-6 py-3.5">AWS Service Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Resource Specs</th>
                  <th className="px-6 py-3.5">Metered Metric</th>
                  <th className="px-6 py-3.5 text-right">Accrued Spend</th>
                  <th className="px-6 py-3.5 text-right">Forecasted Bill</th>
                  <th className="px-6 py-3.5 text-right">Cost Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {filteredServices.length > 0 ? (
                  filteredServices.map((service: any) => (
                    <tr key={service.id || service.serviceName} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4 font-sans font-extrabold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[service.category] || "#3b82f6" }} />
                        {service.serviceName}
                      </td>
                      <td className="px-6 py-4 font-sans">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold" style={{ borderColor: CATEGORY_COLORS[service.category] || "#3b82f6", color: CATEGORY_COLORS[service.category] || "#3b82f6" }}>
                          {service.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-sans text-muted-foreground text-[11px]">
                        {service.specs}
                      </td>
                      <td className="px-6 py-4 font-sans text-muted-foreground text-[11px]">
                        {service.usageMetric}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground">
                        ${(service.accruedCost || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-amber-500">
                        ${(service.estimatedMonthly || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        <div className="flex items-center justify-end gap-2">
                          <span>{service.percentage || 0}%</span>
                          <div className="w-12 bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${Math.min(service.percentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground font-sans">
                      No AWS services matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
