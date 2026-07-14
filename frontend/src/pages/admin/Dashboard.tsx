import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, Store, Users, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminStats({
    query: {
      refetchInterval: 30000,
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              title="Total Products" 
              value={stats.totalProducts} 
              icon={<Package className="w-5 h-5 text-blue-500" />} 
              trend="+12% this month"
            />
            <StatCard 
              title="Total Vendors" 
              value={stats.totalVendors} 
              icon={<Store className="w-5 h-5 text-purple-500" />} 
              trend="+4 new this week"
            />
            <StatCard 
              title="Total Users" 
              value={stats.totalUsers} 
              icon={<Users className="w-5 h-5 text-orange-500" />} 
              trend="+124 this month"
            />
            <StatCard 
              title="Active Vendors" 
              value={stats.activeVendors} 
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} 
              trend="94% approval rate"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-6">Product Catalog Breakdown</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                {stats.recentUsers.length > 0 ? stats.recentUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
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
                  {stats.recentVendors.length > 0 ? stats.recentVendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{vendor.firstName} {vendor.lastName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{vendor.location}</td>
                      <td className="px-6 py-4">{vendor.produce}</td>
                      <td className="px-6 py-4 text-muted-foreground">{format(new Date(vendor.createdAt), 'MMM d, yyyy')}</td>
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
        <p className="text-xs text-muted-foreground">{trend}</p>
      </div>
    </div>
  );
}
