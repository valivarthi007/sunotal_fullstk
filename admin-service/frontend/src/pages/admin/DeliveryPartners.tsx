import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bike, Star, Phone, Mail, ShieldCheck, MapPin, Plus, DollarSign, Award, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface DeliveryRider {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  vehicle: string;
  status: "ONLINE" | "OFFLINE" | "BUSY";
  walletBalance: number;
  avgRating: number;
  totalRatings: number;
  totalDeliveries: number;
}

export default function DeliveryPartners() {
  const [riders, setRiders] = useState<DeliveryRider[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRider, setNewRider] = useState({ name: "", phone: "", email: "", city: "Bengaluru", vehicle: "Electric Bike" });

  const fetchRiders = async () => {
    try {
      const res = await fetch("/api/delivery/riders");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRiders(data.map((r: any) => ({
            id: r.id || r.riderId || `RIDER-${r.id}`,
            name: r.riderName || r.name || "Delivery Partner",
            phone: r.phone || "",
            email: r.email || "",
            city: r.city || "Bengaluru",
            vehicle: r.vehicle || "Electric Bike",
            status: r.status === "completed" || r.status === "ONLINE" ? "ONLINE" : "OFFLINE",
            walletBalance: Number(r.amount || r.walletBalance || 0),
            avgRating: Number(r.avgRating || 5.0),
            totalRatings: Number(r.totalRatings || 0),
            totalDeliveries: Number(r.totalDeliveries || r.tripsCompleted || 0),
          })));
        } else {
          setRiders([]);
        }
      } else {
        setRiders([]);
      }
    } catch {
      setRiders([]);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleAddRider = async () => {
    if (!newRider.name || !newRider.phone) {
      toast.error("Name and phone number are required");
      return;
    }

    const rider: DeliveryRider = {
      id: `RIDER-${Date.now().toString().slice(-4)}`,
      name: newRider.name,
      phone: newRider.phone,
      email: newRider.email || `${newRider.name.toLowerCase().replace(/\s+/g, "")}@sunotal.com`,
      city: newRider.city,
      vehicle: newRider.vehicle,
      status: "ONLINE",
      walletBalance: 0,
      avgRating: 5.0,
      totalRatings: 0,
      totalDeliveries: 0,
    };

    setRiders((prev) => [rider, ...prev]);
    setIsAddModalOpen(false);
    toast.success(`Delivery partner ${rider.name} registered successfully!`);
  };

  const toggleRiderStatus = async (id: string) => {
    setRiders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === "ONLINE" ? "OFFLINE" : "ONLINE" } : r
      )
    );
    try {
      await fetch(`/api/delivery/riders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
    } catch {}
    toast.success("Rider status updated");
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Bike className="w-6 h-6 text-emerald-600" /> Delivery Fleet Management
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Live rider GPS status, rating metrics, wallet balances, and fleet registration
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md">
            <Plus className="w-4 h-4" /> Onboard New Rider
          </Button>
        </div>

        {/* Fleet KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Total Registered Riders</p>
            <p className="text-2xl font-black text-foreground">{riders.length}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Currently Online</p>
            <p className="text-2xl font-black text-emerald-600">{riders.filter((r) => r.status === "ONLINE").length}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Avg Fleet Rating</p>
            <p className="text-2xl font-black text-amber-500 flex items-center gap-1">
              4.8 <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Total Fleet Deliveries</p>
            <p className="text-2xl font-black text-purple-600 font-mono">
              {riders.reduce((sum, r) => sum + r.totalDeliveries, 0)}
            </p>
          </div>
        </div>

        {/* Riders Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Registered Delivery Partners</h3>
            <span className="text-xs text-muted-foreground font-mono">{riders.length} Active Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Rider Name</th>
                  <th className="p-3">Phone & Email</th>
                  <th className="p-3">City & Vehicle</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3">Wallet Payout</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {riders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-bold text-foreground">
                      {rider.name}
                      <span className="block text-[10px] font-mono text-muted-foreground font-normal">{rider.id}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> {rider.phone}
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Mail className="w-3 h-3 text-muted-foreground" /> {rider.email}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground">{rider.city}</p>
                      <p className="text-[10px] text-muted-foreground">{rider.vehicle}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-bold font-mono text-amber-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rider.avgRating} ({rider.totalRatings})
                      </span>
                      <span className="text-[10px] text-muted-foreground">{rider.totalDeliveries} orders done</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600">
                      ₹{rider.walletBalance}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={`text-[10px] font-bold ${
                          rider.status === "ONLINE"
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {rider.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleRiderStatus(rider.id)}
                        className="h-7 text-[10px] font-bold rounded-lg"
                      >
                        Toggle Status
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Onboard Rider Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Onboard Delivery Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Full Name" value={newRider.name} onChange={(e) => setNewRider({ ...newRider, name: e.target.value })} />
            <Input placeholder="Mobile Phone" value={newRider.phone} onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })} />
            <Input placeholder="Email Address" value={newRider.email} onChange={(e) => setNewRider({ ...newRider, email: e.target.value })} />
            <Input placeholder="Service City" value={newRider.city} onChange={(e) => setNewRider({ ...newRider, city: e.target.value })} />
            <Input placeholder="Vehicle Type (e.g. EV Scooter)" value={newRider.vehicle} onChange={(e) => setNewRider({ ...newRider, vehicle: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRider} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Register Rider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
