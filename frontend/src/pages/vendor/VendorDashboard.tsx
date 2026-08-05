import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, getGetCurrentUserQueryKey, useListCategories } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  LogOut, 
  Download, 
  User, 
  MapPin, 
  CreditCard,
  UserCheck,
  Scale
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const quotationSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  produce: z.string().min(2, "Produce name must be at least 2 characters"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
});

export default function VendorDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });
  const { data: categories } = useListCategories();

  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const form = useForm<z.infer<typeof quotationSchema>>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      category: "",
      produce: "",
      quantity: 1,
      price: 1,
    },
  });

  // Redirect if not vendor
  useEffect(() => {
    if (!isUserLoading && (!user || user.role !== "vendor")) {
      setLocation("/login");
    }
  }, [user, isUserLoading, setLocation]);

  // Fetch Vendor Profile & Quotations
  const fetchData = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("sunotal_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Get profile info (we query by /api/vendors passing user ID or fetching list and matching)
      const resVendors = await fetch("/api/vendors");
      const vendorsList = await resVendors.json();
      const profile = vendorsList.find((v: any) => v.userId === user.id);
      if (profile) setVendorProfile(profile);

      // Get quotations
      const resQuotes = await fetch("/api/vendors/quotations", { headers });
      if (resQuotes.ok) {
        const quotes = await resQuotes.json();
        setQuotations(quotes.reverse()); // latest first
      }

      // Get invoices
      const resInvoices = await fetch("/api/vendors/invoices", { headers });
      if (resInvoices.ok) {
        const invList = await resInvoices.json();
        setInvoices(invList.reverse());
      }
    } catch (err) {
      console.error("Failed to load vendor data", err);
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("sunotal_token");
    queryClient.clear();
    toast.success("Logged out successfully");
    setLocation("/");
  };

  const onSubmitQuotation = async (values: z.infer<typeof quotationSchema>) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("sunotal_token");
      
      // Convert Quintal to Kilograms (1 Quintal = 100 kg)
      // Convert Price per Quintal to Price per Kilogram
      const convertedValues = {
        ...values,
        quantity: Number(values.quantity) * 100,
        price: Number(values.price) / 100,
      };

      const response = await fetch("/api/vendors/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(convertedValues),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to submit quotation");
      }

      toast.success("Produce quotation submitted successfully!");
      form.reset();
      fetchData(); // reload list
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent/20">
        <p className="text-muted-foreground font-medium">Loading Portal...</p>
      </div>
    );
  }

  const isApproved = vendorProfile?.status === "approved";

  return (
    <div className="min-h-screen bg-accent/20 flex flex-col">
      {/* Top Header */}
      <header className="bg-background border-b py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-xl">
              SF
            </div>
            <div>
              <h1 className="font-bold text-lg text-secondary leading-none">Farmer Portal</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Sunotal Farms Supplier Network</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-secondary">
              Welcome, {user?.name}
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status Banner */}
        <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-card ${
          isApproved 
            ? "border-green-200" 
            : "border-yellow-200"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {isApproved ? <UserCheck className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-secondary">Vendor Profile Verification</h2>
                <Badge variant="secondary" className={
                  isApproved ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"
                }>
                  {vendorProfile?.status ? vendorProfile.status.toUpperCase() : "PENDING"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {isApproved 
                  ? "Your account is fully approved. You can submit produce quotations and review payouts."
                  : "Your application is currently under review by our farm sourcing team. We will activate your portal shortly."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Quotation Submission */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-secondary mb-1 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                Submit Produce Quotation
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Offer your farm-fresh harvest to Sunotal. Quotes are reviewed by admins.
              </p>

              {!isApproved ? (
                <div className="bg-accent/40 rounded-2xl p-4 text-center border text-sm text-muted-foreground">
                  Your account is pending admin approval. You can submit quotations once verified.
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitQuotation)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              )) || (
                                <>
                                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                                  <SelectItem value="Fruits">Fruits</SelectItem>
                                  <SelectItem value="Dairy">Dairy</SelectItem>
                                  <SelectItem value="Dry Fruits">Dry Fruits</SelectItem>
                                  <SelectItem value="Grains">Grains</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="produce"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produce Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Organic Carrots" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity (Quintals)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price / Quintal (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full h-11 font-bold mt-4" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Quote"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>

            {/* Profile Info */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-secondary flex items-center gap-2 border-b pb-2">
                <User className="w-5 h-5 text-primary" /> Profile Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-semibold text-secondary">{vendorProfile?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold text-secondary">{vendorProfile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-semibold text-secondary">{vendorProfile?.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aadhar:</span>
                  <span className="font-mono font-semibold text-secondary">{vendorProfile?.aadhar}</span>
                </div>
                {vendorProfile?.gstin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="font-mono font-semibold text-secondary">{vendorProfile?.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quotes List & Invoices */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quotations List */}
            <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b bg-accent/10">
                <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Your Quotations
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-accent/40 text-muted-foreground font-medium">
                    <tr>
                      <th className="px-6 py-3">Produce Details</th>
                      <th className="px-6 py-3">Qty & Price</th>
                      <th className="px-6 py-3 text-center">Acceptance</th>
                      <th className="px-6 py-3 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quotations.length > 0 ? (
                      quotations.map((q) => (
                        <tr key={q.id} className="hover:bg-accent/20 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-secondary">{q.produce}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{q.category}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-secondary">{(q.quantity / 100).toFixed(2).replace(/\.00$/, '')} Quintals</p>
                              <p className="text-xs text-muted-foreground">₹{Math.round(q.price * 100)} / Quintal</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className={
                              q.status === "accepted" ? "bg-green-100 text-green-700 border-green-200" :
                              q.status === "rejected" ? "bg-red-100 text-red-700 border-red-200" :
                              "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }>
                              {q.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className={
                              q.paymentStatus === "paid" ? "bg-blue-100 text-blue-700 border-blue-200" :
                              q.paymentStatus === "processing" ? "bg-purple-100 text-purple-700 border-purple-200" :
                              "bg-gray-100 text-gray-700 border-gray-200"
                            }>
                              {q.paymentStatus.toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                          No quotations submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generated Invoices */}
            <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b bg-accent/10">
                <h3 className="font-bold text-lg text-secondary flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Sourcing Invoices
                </h3>
              </div>
              <div className="divide-y divide-border">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <div key={inv.id} className="p-5 flex items-center justify-between hover:bg-accent/20 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-secondary">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Amount: <strong className="text-secondary">₹{inv.amount}</strong> • Generated: {new Date(inv.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <a 
                        href={inv.s3Url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                      >
                        <Download className="w-4 h-4" /> View Invoice
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted-foreground text-sm">
                    No generated invoices found. Invoices are generated once admin accepts and processes produce payouts.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
