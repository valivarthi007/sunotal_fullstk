import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, Store, Users, CheckCircle2, Bike, ShoppingBag, Server, Coins } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from "date-fns";

const safeFormatDate = (dateVal: any, formatStr: string, fallback = "N/A") => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminStats({
    query: {
      queryKey: ['adminStats'],
      refetchInterval: 30000,
      retry: false,
      throwOnError: false,
    },
  });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time metrics and recent activity across your platform.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Link href="/admin/orders-board" className="p-4 bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-2xl shadow-md hover:scale-[1.02] transition-transform">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Live Kanban</span>
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-lg font-black mt-2">Orders Board</h4>
              <p className="text-[11px] text-emerald-200/80 mt-1">Dark store packing & dispatch</p>
            </Link>

            <Link href="/admin/delivery-partners" className="p-4 bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-2xl shadow-md hover:scale-[1.02] transition-transform">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Rider Fleet</span>
                <Bike className="w-5 h-5 text-indigo-400" />
              </div>
              <h4 className="text-lg font-black mt-2">Delivery Partners</h4>
              <p className="text-[11px] text-indigo-200/80 mt-1">Live rider tracking & payouts</p>
            </Link>

            <Link href="/admin/analytics" className="p-4 bg-gradient-to-br from-purple-900 to-pink-900 text-white rounded-2xl shadow-md hover:scale-[1.02] transition-transform">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Growth & Sales</span>
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-lg font-black mt-2">Analytics & KPIs</h4>
              <p className="text-[11px] text-purple-200/80 mt-1">Revenue trends & top sellers</p>
            </Link>

            <Link href="/admin/coupons" className="p-4 bg-gradient-to-br from-amber-900 to-orange-900 text-white rounded-2xl shadow-md hover:scale-[1.02] transition-transform">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Promotions</span>
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-lg font-black mt-2">Coupon Manager</h4>
              <p className="text-[11px] text-amber-200/80 mt-1">Discounts & promo codes</p>
            </Link>
          </div>

          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">Delivery Fleet & Rider Payout Sub-Application</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Review completed delivery rider runs, distance rates (₹30 + ₹10/km), and approve dynamic payouts to riders.</p>
              </div>
            </div>
            <Link href="/admin/rider-payouts" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shrink-0 shadow-md flex items-center justify-center">
              Manage Rider Payouts →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              title="User Revenue (GMV)" 
              value={`₹${(stats.userRevenue || stats.totalRevenue || 0).toLocaleString('en-IN')}`} 
              icon={<ShoppingBag className="w-5 h-5 text-emerald-500" />} 
              trend="Customer Checkout Orders"
            />
            <StatCard 
              title="Vendor Charges" 
              value={`₹${(stats.vendorCharges || 0).toLocaleString('en-IN')}`} 
              icon={<Store className="w-5 h-5 text-purple-500" />} 
              trend="Procurement Payouts"
            />
            <StatCard 
              title="Rider Fleet Payouts" 
              value={`₹${(stats.deliveryCharges || 0).toLocaleString('en-IN')}`} 
              icon={<Bike className="w-5 h-5 text-amber-500" />} 
              trend="Trip & Distance Fees"
            />
            <StatCard 
              title="AWS Infrastructure Cost" 
              value={`$${stats.awsMonthlyCost || 134.00}/mo`} 
              icon={<Server className="w-5 h-5 text-blue-500" />} 
              trend="ECS + RDS + ElastiCache + ALB"
            />
          </div>

          <div className="mb-8 p-6 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-emerald-400">
                  <Coins className="w-5 h-5" /> Executive Financial Ledger & Cloud Overhead Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-1">Unified ledger recording Vendor Payouts, Customer Order Sales, Delivery Partner Fees, and AWS Cloud Infrastructure Costs.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500 text-emerald-400 bg-emerald-950/50 font-mono text-xs px-3 py-1">
                  Net Margin: ₹{((stats.userRevenue || 0) - (stats.vendorCharges || 0) - (stats.deliveryCharges || 0)).toLocaleString('en-IN')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[11px]">ECS Fargate Tasks (6 Microservices)</div>
                <div className="text-lg font-bold text-white mt-1">$48.50 <span className="text-[10px] text-slate-500 font-sans">/ month</span></div>
                <div className="text-[10px] text-slate-500 mt-1">0.25 vCPU & 0.5 GB RAM per task</div>
              </div>
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[11px]">RDS PostgreSQL (db.t4g.medium)</div>
                <div className="text-lg font-bold text-white mt-1">$54.20 <span className="text-[10px] text-slate-500 font-sans">/ month</span></div>
                <div className="text-[10px] text-slate-500 mt-1">Multi-AZ RDS + Automated Storage</div>
              </div>
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[11px]">ElastiCache Redis Cluster</div>
                <div className="text-lg font-bold text-white mt-1">$12.50 <span className="text-[10px] text-slate-500 font-sans">/ month</span></div>
                <div className="text-[10px] text-slate-500 mt-1">cache.t4g.micro Session & Inventory Cache</div>
              </div>
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[11px]">ALB + CloudFront CDN</div>
                <div className="text-lg font-bold text-white mt-1">$18.80 <span className="text-[10px] text-slate-500 font-sans">/ month</span></div>
                <div className="text-[10px] text-slate-500 mt-1">Application Load Balancer & Data Transfer</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-6">Product Catalog Breakdown</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.categoryBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--sidebar-primary))" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col">
              <h3 className="text-lg font-bold mb-4">Recent Users</h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {(stats?.recentUsers || []).length > 0 ? (stats?.recentUsers || []).map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{user?.name || user?.email || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge variant="outline" className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>
                      {user.role}
                    </Badge>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent users</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">Recent Vendor Applications</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-accent/50 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Produce</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(stats?.recentVendors || []).length > 0 ? (stats?.recentVendors || []).map(vendor => (
                    <tr key={vendor.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{vendor.firstName} {vendor.lastName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{vendor.location}</td>
                      <td className="px-6 py-4">{vendor.produce}</td>
                      <td className="px-6 py-4 text-muted-foreground">{safeFormatDate(vendor.createdAt, 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={
                          vendor.status === 'approved' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                          vendor.status === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                          'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                        }>
                          {vendor.status}
                        </Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No recent applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: number, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <p className="text-muted-foreground font-medium text-sm">{title}</p>
        <div className="p-2 bg-accent rounded-lg">{icon}</div>
      </div>
      <div>
        <h4 className="text-3xl font-bold text-foreground mb-1">{value}</h4>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </div>
    </div>
  );
}
