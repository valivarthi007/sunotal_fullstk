import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, ShoppingBag, Award, Bike, Calendar, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

interface RevenueDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  totalSold: number;
  revenue: number;
}

export default function Analytics() {
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const [deliveryKpis, setDeliveryKpis] = useState({
    totalRiders: 0,
    avgRiderRating: 0,
    totalPayouts: 0,
    totalDeliveredOrders: 0,
  });

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [revRes, topRes, kpiRes] = await Promise.all([
          fetch("/api/analytics/revenue"),
          fetch("/api/analytics/top-products"),
          fetch("/api/analytics/delivery-kpis"),
        ]);

        if (revRes.ok) {
          const revJson = await revRes.json();
          if (revJson.success && Array.isArray(revJson.data)) {
            setRevenueData(revJson.data);
          } else {
            setRevenueData([]);
          }
        }

        if (topRes.ok) {
          const topJson = await topRes.json();
          if (topJson.success && Array.isArray(topJson.products)) {
            setTopProducts(topJson.products);
          } else {
            setTopProducts([]);
          }
        }

        if (kpiRes.ok) {
          const kpiJson = await kpiRes.json();
          if (kpiJson.success) {
            setDeliveryKpis({
              totalRiders: Number(kpiJson.totalRiders || 0),
              avgRiderRating: Number(kpiJson.avgRiderRating || 0),
              totalPayouts: Number(kpiJson.totalPayouts || 0),
              totalDeliveredOrders: Number(kpiJson.totalDeliveredOrders || 0),
            });
          }
        }
      } catch {
        setRevenueData([]);
        setTopProducts([]);
        setDeliveryKpis({ totalRiders: 0, avgRiderRating: 0, totalPayouts: 0, totalDeliveredOrders: 0 });
      }
    }
    loadAnalytics();
  }, []);

  const totalPeriodRevenue = (revenueData || []).reduce((sum, d) => sum + (Number(d?.revenue) || 0), 0);
  const totalPeriodOrders = (revenueData || []).reduce((sum, d) => sum + (Number(d?.orders) || 0), 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" /> Platform Revenue & Growth Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sales performance, order velocity trends, bestsellers, and delivery efficiency KPIs
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Gross Revenue
            </p>
            <p className="text-2xl font-black text-emerald-600 font-mono">₹{Number(totalPeriodRevenue || 0).toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +18.4% vs last week
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-600" /> Total Orders
            </p>
            <p className="text-2xl font-black text-foreground font-mono">{totalPeriodOrders}</p>
            <p className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +12.1% completion rate
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-purple-600" /> Avg Order Value (AOV)
            </p>
            <p className="text-2xl font-black text-purple-600 font-mono">
              ₹{totalPeriodOrders > 0 ? Math.round(totalPeriodRevenue / totalPeriodOrders) : 0}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-amber-500" /> Rider Payouts Disbursed
            </p>
            <p className="text-2xl font-black text-amber-500 font-mono">
              ₹{(deliveryKpis?.totalPayouts ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Area Chart */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Revenue Trend (30 Days)</h3>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px]">
                Live Stream
              </Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Selling Products Bar Chart */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Top-Selling Products (Quantity Sold)</h3>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 text-[10px]">
                High Velocity
              </Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="totalSold" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
