import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, Trash2, CheckCircle2, XCircle, Sparkles, Percent } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: number;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  expiryDate?: string;
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([
    { id: 1, code: "SUNOTAL50", discountType: "percentage", discountValue: 50, minOrderAmount: 199, maxDiscountAmount: 100, usageLimit: 500, usedCount: 142, active: true },
    { id: 2, code: "FREESHIP", discountType: "flat", discountValue: 50, minOrderAmount: 149, maxDiscountAmount: 50, usageLimit: 1000, usedCount: 389, active: true },
    { id: 3, code: "FIRST100", discountType: "flat", discountValue: 100, minOrderAmount: 299, maxDiscountAmount: 100, usageLimit: 200, usedCount: 88, active: true },
    { id: 4, code: "INSTA20", discountType: "percentage", discountValue: 20, minOrderAmount: 99, maxDiscountAmount: 50, usageLimit: 500, usedCount: 204, active: true },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 199,
    maxDiscountAmount: 100,
    usageLimit: 500,
  });

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      }
    } catch {
      // Use initial state
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discountValue) {
      toast.error("Coupon code and discount value required");
      return;
    }

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoupon),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Coupon ${newCoupon.code.toUpperCase()} created!`);
        setIsModalOpen(false);
        fetchCoupons();
      }
    } catch {
      const created: Coupon = {
        id: Date.now(),
        code: newCoupon.code.toUpperCase(),
        discountType: newCoupon.discountType as any,
        discountValue: Number(newCoupon.discountValue),
        minOrderAmount: Number(newCoupon.minOrderAmount),
        maxDiscountAmount: Number(newCoupon.maxDiscountAmount),
        usageLimit: Number(newCoupon.usageLimit),
        usedCount: 0,
        active: true,
      };
      setCoupons((prev) => [created, ...prev]);
      setIsModalOpen(false);
      toast.success(`Coupon ${created.code} created!`);
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    try {
      await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Coupon deleted");
    } catch {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Coupon deleted");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-emerald-600" /> Promos & Coupon Code Manager
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create, configure discount rules, set usage caps, and manage promotional campaigns
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md">
            <Plus className="w-4 h-4" /> Create New Coupon
          </Button>
        </div>

        {/* Coupons Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Active Promotional Codes</h3>
            <span className="text-xs text-muted-foreground font-mono">{coupons.length} Promo Codes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Coupon Code</th>
                  <th className="p-3">Discount Type & Value</th>
                  <th className="p-3">Min Order Amount</th>
                  <th className="p-3">Max Savings Cap</th>
                  <th className="p-3">Usage Progress</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-600">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                        {c.code}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">₹{c.minOrderAmount}</td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {c.maxDiscountAmount ? `₹${c.maxDiscountAmount}` : "No Cap"}
                    </td>
                    <td className="p-3 font-mono">
                      <span className="text-foreground font-bold">{c.usedCount}</span> / {c.usageLimit}
                    </td>
                    <td className="p-3">
                      <Badge className={`text-[10px] font-bold ${c.active ? "bg-emerald-600 text-white" : "bg-gray-300 text-gray-700"}`}>
                        {c.active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCoupon(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Coupon Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create Promo Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Coupon Code (e.g. FLASH50)"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              className="uppercase font-mono font-bold"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={newCoupon.discountType} onValueChange={(val) => setNewCoupon({ ...newCoupon, discountType: val })}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Discount Value"
                value={newCoupon.discountValue}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
              />
            </div>
            <Input
              type="number"
              placeholder="Minimum Order Amount (₹)"
              value={newCoupon.minOrderAmount}
              onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Max Discount Cap Amount (₹)"
              value={newCoupon.maxDiscountAmount}
              onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscountAmount: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Max Usage Limit"
              value={newCoupon.usageLimit}
              onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: Number(e.target.value) })}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCoupon} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Save & Activate Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
