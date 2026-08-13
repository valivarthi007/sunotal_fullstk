import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListProducts } from "@/lib/api-client";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  IndianRupee, 
  FileCheck2, 
  PlusCircle 
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function QuotationsAdmin() {
  const [, setLocation] = useLocation();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  
  // Mapping popup
  const [acceptId, setAcceptId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("auto");
  const [accepting, setAccepting] = useState(false);

  const { data: products } = useListProducts(undefined, { retry: false, throwOnError: false });

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sunotal_admin_token");
      if (!token) {
        toast.error("Not authenticated as admin");
        setLocation("/admin/login");
        return;
      }
      const res = await fetch("/api/admin/quotations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.reverse());
      } else {
        if (res.status === 401 || res.status === 403) {
          toast.error("Admin session expired or unauthorized. Please login again.");
          localStorage.removeItem("sunotal_admin_token");
          setLocation("/admin/login");
          return;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error("Failed to load quotations", err);
      toast.error(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleUpdateStatus = async (id: number, status: string, productId?: string) => {
    if (status === "accepted") {
      setAccepting(true);
    }
    try {
      const token = localStorage.getItem("sunotal_admin_token");
      const body: any = { status };
      if (productId && productId !== "auto") {
        body.productId = Number(productId);
      }
      
      const res = await fetch(`/api/admin/quotations/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update quotation status");
      }

      toast.success(`Quotation #${id} marked as ${status}`);
      setAcceptId(null);
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setAccepting(false);
    }
  };

  const handleGenerateInvoice = async (id: number) => {
    try {
      const token = localStorage.getItem("sunotal_admin_token");
      const res = await fetch(`/api/admin/quotations/${id}/invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate invoice");
      }

      toast.success("Invoice generated and uploaded to S3!");
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invoice");
    }
  };

  const handlePayout = async (id: number) => {
    try {
      const token = localStorage.getItem("sunotal_admin_token");
      const res = await fetch(`/api/admin/quotations/${id}/payout`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentStatus: "paid" })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to confirm payout");
      }

      toast.success("Payout marked as PAID!");
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment status");
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesTab = activeTab === "All" || q.status === activeTab.toLowerCase();
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      q.name.toLowerCase().includes(searchLower) ||
      q.produce.toLowerCase().includes(searchLower) ||
      q.address.toLowerCase().includes(searchLower);
    return matchesTab && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Produce Quotations</h1>
          <p className="text-muted-foreground mt-1">Review farmer offers, accept into inventory, process invoices and payouts.</p>
        </div>
      </div>

      {/* Accept Mapping Dialog */}
      <Dialog open={acceptId !== null} onOpenChange={(open) => !open && setAcceptId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Produce Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <p className="text-muted-foreground">
              Map this produce offer to an existing catalog product, or choose to automatically create a new draft catalog item.
            </p>
            <div className="space-y-2">
              <label className="font-bold text-secondary">Select Product Mapping</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Map Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-create new catalog item (or match by name)</SelectItem>
                  {products?.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={accepting}>Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white font-bold" 
              onClick={() => acceptId && handleUpdateStatus(acceptId, "accepted", selectedProductId)}
              disabled={accepting}
            >
              {accepting ? "Processing..." : "Accept & Add to Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-accent/50 p-1 rounded-xl w-fit">
            {["All", "Pending", "Accepted", "Rejected"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by farmer, produce name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-accent/30 h-10 rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-accent/30 text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Farmer Details</th>
                <th className="px-6 py-4 font-medium">Produce Offer</th>
                <th className="px-6 py-4 font-medium">Pricing</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">Payment</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading quotations...</td></tr>
              ) : filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => {
                  const total = q.quantity * q.price;
                  return (
                    <tr key={q.id} className="hover:bg-accent/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground text-base">{q.name}</p>
                          <p className="text-muted-foreground text-xs">{q.phone} • {q.address}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Aadhar: {q.aadhar} {q.gstin ? `| GSTIN: ${q.gstin}` : ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{q.produce}</p>
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase mt-1">{q.category}</Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-foreground">
                            {q.quantity} kg <span className="text-xs text-muted-foreground font-normal">({q.quantity / 100} Quintals)</span>
                          </p>
                          <p className="text-muted-foreground text-xs">
                            ₹{q.price}/kg <span className="text-[10px] text-muted-foreground/80 font-normal">(₹{Math.round(q.price * 100)}/Quintal)</span>
                          </p>
                          <p className="text-xs font-bold text-primary mt-1">Total: ₹{total}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="secondary" className={cn(
                          "font-medium",
                          q.status === "accepted" ? "bg-green-100 text-green-700 border-green-200" :
                          q.status === "rejected" ? "bg-red-100 text-red-700 border-red-200" :
                          "bg-yellow-100 text-yellow-700 border-yellow-200"
                        )}>
                          {q.status.toUpperCase()}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Offered: {format(new Date(q.createdAt), 'MMM d')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="secondary" className={cn(
                          "font-medium",
                          q.paymentStatus === "paid" ? "bg-blue-100 text-blue-700 border-blue-200" :
                          q.paymentStatus === "processing" ? "bg-purple-100 text-purple-700 border-purple-200" :
                          "bg-gray-100 text-gray-700 border-gray-200"
                        )}>
                          {q.paymentStatus.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {q.status === "pending" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="border-green-600 text-green-600 hover:bg-green-50 h-8 font-bold" 
                                onClick={() => {
                                  setSelectedProductId("auto");
                                  setAcceptId(q.id);
                                }}
                              >
                                Accept
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="border-destructive text-destructive hover:bg-red-50 h-8 font-bold" 
                                onClick={() => handleUpdateStatus(q.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {q.status === "accepted" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-primary text-primary hover:bg-primary/5 h-8 font-bold gap-1"
                                onClick={() => handleGenerateInvoice(q.id)}
                              >
                                <FileText className="w-3.5 h-3.5" /> Invoice
                              </Button>
                              
                              {q.paymentStatus !== "paid" && (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 font-bold gap-1"
                                  onClick={() => handlePayout(q.id)}
                                >
                                  <IndianRupee className="w-3.5 h-3.5" /> Pay Farmer
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    No produce quotations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
