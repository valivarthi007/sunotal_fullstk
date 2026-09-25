import React, { useState, useEffect } from "react";
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
  Scale,
  Sparkles,
  Zap,
  Building2,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { VendorLayout } from "@/components/layout/VendorLayout";
import { fetchWarehouses, Warehouse, useListProductDefinitions, useListProducts } from "@/lib/api-client";

const quotationSchema = z.object({
  category: z.string().min(1, "Please select a supply category"),
  produce: z.string().min(2, "Product/Item name must be at least 2 characters"),
  brand: z.string().optional(),
  batchNo: z.string().optional(),
  expiryOrWarranty: z.string().optional(),
  unit: z.string().min(1, "Please select a unit"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(1, "Wholesale price must be at least 1"),
  suggestedMrp: z.coerce.number().optional(),
  qualityGrade: z.string().min(1, "Please select a quality grade"),
  expectedHarvestDate: z.string().optional(),
  darkStoreAllocation: z.string().min(1, "Please select target Dark Store Hub"),
  notes: z.string().optional(),
});

export default function VendorDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });
  const { data: rawCategories } = useListCategories();
  const { data: rawProductDefs } = useListProductDefinitions();
  const { data: rawProducts } = useListProducts();

  const categories = Array.isArray(rawCategories) ? rawCategories : (Array.isArray((rawCategories as any)?.categories) ? (rawCategories as any).categories : []);
  const productDefs = Array.isArray(rawProductDefs) ? rawProductDefs : [];
  const products = Array.isArray(rawProducts) ? rawProducts : (Array.isArray((rawProducts as any)?.products) ? (rawProducts as any).products : []);

  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [targetWarehouses, setTargetWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetchWarehouses()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const activeStores = data.filter((w) => w.isActive);
          setTargetWarehouses(activeStores);
          if (activeStores.length > 0 && activeStores[0]?.name) {
            const defaultStoreStr = `${activeStores[0].name} (${activeStores[0].city})`;
            form.setValue("darkStoreAllocation", defaultStoreStr);
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch warehouses dynamically:", err);
      });
  }, []);

  useEffect(() => {
    const userName = user?.name || user?.email || "Vendor";
    setVendorProfile({
      firstName: userName.split(" ")[0] || "Vendor",
      lastName: userName.split(" ").slice(1).join(" ") || "",
      phone: user?.phone || "N/A",
      location: user?.city || "Central Sourcing Hub",
      status: user?.active ? "approved" : "pending",
    });

    const token = localStorage.getItem("sunotal_vendor_token") || localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_admin_token");
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    fetch("/api/vendors/quotations", { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setQuotations(data);
      })
      .catch(() => setQuotations([]));

    fetch("/api/vendors/invoices", { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setInvoices(data);
      })
      .catch(() => setInvoices([]));
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"submit" | "history" | "payouts">("submit");

  const form = useForm<z.infer<typeof quotationSchema>>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      category: "",
      produce: "",
      brand: "",
      batchNo: "",
      expiryOrWarranty: "",
      unit: "Pieces",
      quantity: 50,
      price: 250,
      suggestedMrp: 350,
      qualityGrade: "Grade A (Verified / Premium)",
      expectedHarvestDate: new Date().toISOString().split("T")[0],
      darkStoreAllocation: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (categories && categories.length > 0 && !form.getValues("category")) {
      form.setValue("category", categories[0].name);
    }
  }, [categories, form]);

  const selectedCategory = form.watch("category");
  const quantity = form.watch("quantity") || 0;
  const price = form.watch("price") || 0;
  const selectedUnit = form.watch("unit");

  const availableProduceItems = React.useMemo(() => {
    const list: string[] = [];
    const set = new Set<string>();

    for (const def of productDefs || []) {
      if (def.name && (!selectedCategory || def.category === selectedCategory || selectedCategory === "All") && !set.has(def.name)) {
        set.add(def.name);
        list.push(def.name);
      }
    }
    for (const p of products || []) {
      if (p.name && (!selectedCategory || p.category === selectedCategory || selectedCategory === "All") && !set.has(p.name)) {
        set.add(p.name);
        list.push(p.name);
      }
    }
    return list;
  }, [productDefs, products, selectedCategory]);

  // Set default unit dynamically based on category
  useEffect(() => {
    if (!form.getValues("unit")) {
      const cat = (selectedCategory || "").toLowerCase();
      if (cat.includes("dairy") || cat.includes("beverage") || cat.includes("drink")) form.setValue("unit", "Liters");
      else if (cat.includes("fresh") || cat.includes("produce") || cat.includes("grain")) form.setValue("unit", "Kg");
      else form.setValue("unit", "Pieces");
    }
  }, [selectedCategory, form]);

  const totalValue = quantity * price;

  const onSubmitQuotation = async (values: z.infer<typeof quotationSchema>) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("sunotal_vendor_token") || localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_admin_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const payload = {
        ...values,
        vendorId: user?.id || 'VND-' + Date.now(),
        vendorName: `${vendorProfile?.firstName || 'Vendor'} ${vendorProfile?.lastName || ''}`.trim(),
        phone: vendorProfile?.phone || '',
        attributes: {
          brand: values.brand || '',
          batchNo: values.batchNo || '',
          expiryOrWarranty: values.expiryOrWarranty || '',
          suggestedMrp: values.suggestedMrp || values.price,
        }
      };

      const res = await fetch("/api/vendors/quotations", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newQuote = await res.json();
        setQuotations((prev) => [newQuote, ...prev]);
        toast.success(`Wholesale supply proposal for ${values.produce} submitted to ${values.darkStoreAllocation}!`);
      } else {
        const newQuote = {
          id: Date.now(),
          ...payload,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setQuotations((prev) => [newQuote, ...prev]);
        toast.success(`Wholesale supply proposal for ${values.produce} submitted successfully!`);
      }

      form.reset({
        category: values.category,
        produce: "",
        brand: "",
        batchNo: "",
        expiryOrWarranty: "",
        unit: values.unit,
        quantity: 50,
        price: values.price,
        suggestedMrp: values.price * 1.3,
        qualityGrade: values.qualityGrade,
        expectedHarvestDate: new Date().toISOString().split("T")[0],
        darkStoreAllocation: values.darkStoreAllocation,
        notes: "",
      });
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sunotal_vendor_token");
    localStorage.removeItem("sunotal_token");
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    setLocation("/vendor/login");
  };

  return (
    <VendorLayout user={user}>
      <div className="py-8 bg-background">
        {/* Main Container */}
        <main className="max-w-7xl mx-auto w-full flex-1 p-4 md:p-6 space-y-6">
          {/* Top Vendor Profile Banner */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                🛍️
              </div>
              <div>
                <div className="font-bold text-base text-secondary flex items-center gap-2">
                  <span>{vendorProfile?.firstName} {vendorProfile?.lastName}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] uppercase font-mono font-bold">
                    VERIFIED QUICK-COMMERCE VENDOR
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>📍 {vendorProfile?.location}</span>
                  <span>• Multi-Category Sourcing Partner</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-bold gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab("submit")}
              className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 rounded-t-xl whitespace-nowrap ${
                activeTab === "submit"
                  ? "border-emerald-600 text-emerald-600 font-bold bg-accent/40"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Submit Wholesale Supply Proposal
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "history"
                  ? "border-emerald-400 text-emerald-400 font-bold bg-slate-900/60 rounded-t-xl"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" /> Wholesale Proposals ({quotations.length})
            </button>
            <button
              onClick={() => setActiveTab("payouts")}
              className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "payouts"
                  ? "border-emerald-400 text-emerald-400 font-bold bg-slate-900/60 rounded-t-xl"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-4 h-4" /> Vendor Settlement Payouts
            </button>
          </div>

          {/* TAB 1: Submit Wholesale Proposal Form */}
          {activeTab === "submit" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Submit Wholesale Supply Proposal
                  </h2>
                  <p className="text-xs text-slate-400">
                    Supply FMCG, Electronics & Tech, Fresh Produce, Dairy, or Household goods direct to Sunotal Dark Stores.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitQuotation)} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category */}
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Supply Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs">
                                  <SelectValue placeholder="Select Quick-Commerce Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                {categories && categories.length > 0 ? (
                                  categories.map((cat: any) => (
                                    <SelectItem key={cat.id || cat.name} value={cat.name}>
                                      📦 {cat.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="Fresh Produce & Organic">🍏 Fresh Produce & Organic</SelectItem>
                                    <SelectItem value="Dairy, Bread & Eggs">🥛 Dairy, Bread & Eggs</SelectItem>
                                    <SelectItem value="Beverages & Drinks">🥤 Beverages & Drinks</SelectItem>
                                    <SelectItem value="Snacks & Munchies">🍿 Snacks & Munchies</SelectItem>
                                    <SelectItem value="Electronics & Tech Accessories">🔌 Electronics & Tech Accessories</SelectItem>
                                    <SelectItem value="Cleaning & Household">🧹 Cleaning & Household</SelectItem>
                                    <SelectItem value="Personal Care & Hygiene">🧼 Personal Care & Hygiene</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Product Name Input */}
                      <FormField
                        control={form.control}
                        name="produce"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Product / Item Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Fast Charging USB-C Cable 65W / Organic Alphonso Mangoes"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Brand Name */}
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Brand / OEM Manufacturer</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Boat / Amul / Tata / Sony"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Batch / Model No */}
                      <FormField
                        control={form.control}
                        name="batchNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Model # / Batch No</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. BATCH-2026-09 / MOD-X65"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Expiry / Warranty */}
                      <FormField
                        control={form.control}
                        name="expiryOrWarranty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Warranty / Expiry Info</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. 1 Year OEM Warranty / Best Before Oct 2026"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Unit Selector */}
                      <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold flex items-center gap-1">
                              <Scale className="w-3.5 h-3.5 text-amber-400" /> Supply Packaging Unit
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-bold">
                                  <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="Pieces">Pieces / Units</SelectItem>
                                <SelectItem value="Packs">Packs / Boxes</SelectItem>
                                <SelectItem value="Cartons">Wholesale Cartons</SelectItem>
                                <SelectItem value="Kg">Kilograms (kg)</SelectItem>
                                <SelectItem value="Liters">Liters (L)</SelectItem>
                                <SelectItem value="Quintal">Quintals (100 kg/unit)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Supply Quantity ({selectedUnit})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-mono font-bold"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Wholesale Price */}
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Wholesale Quote (₹ per {selectedUnit})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-mono font-bold text-amber-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Suggested MRP */}
                      <FormField
                        control={form.control}
                        name="suggestedMrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Suggested Retail MRP (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-mono font-bold text-emerald-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quality Grade */}
                      <FormField
                        control={form.control}
                        name="qualityGrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold">Quality & Compliance Grade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs">
                                  <SelectValue placeholder="Grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="Grade A (Verified / Premium)">Grade A (Verified OEM / Sealed)</SelectItem>
                                <SelectItem value="Grade A (Organic Certified)">Grade A (Organic Certified)</SelectItem>
                                <SelectItem value="Grade B (Standard Commercial)">Grade B (Standard Commercial)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Dark Store Allocation */}
                      <FormField
                        control={form.control}
                        name="darkStoreAllocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300 font-bold flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" /> Target Dark Store Hub
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs">
                                  <SelectValue placeholder="Select Target Store / Warehouse" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                                {targetWarehouses.length > 0 ? (
                                  targetWarehouses.map((wh) => {
                                    const labelVal = `${wh.name} (${wh.city})`;
                                    return (
                                      <SelectItem key={wh.id} value={labelVal}>
                                        🏢 {wh.name} — {wh.address}, {wh.city}
                                      </SelectItem>
                                    );
                                  })
                                ) : (
                                  <SelectItem value="none" disabled>No active dark stores created in DB. Please create a warehouse in Admin Panel first.</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300 font-bold">Additional Notes / Organic Certifications</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. Certified Organic by Jaivik Bharat, harvested using drip irrigation."
                            {...field}
                            className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs shadow-lg transition-all"
                  >
                    {isSubmitting ? "Submitting Harvest Quotation..." : "Submit Produce Supply Quotation"}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Calculations & Quick Conversion Helper */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-emerald-900/80 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-400" /> BATCH YIELD & MARGIN STUDIO
                  </span>
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] font-mono">
                    2-DAY SETTLEMENT
                  </Badge>
                </div>

                <div className="text-3xl font-extrabold font-mono text-white flex items-baseline justify-between">
                  <span>₹{totalValue.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-emerald-400 font-sans font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    +{Math.max(8, Math.round((((form.watch("suggestedMrp") || price * 1.3) - price) / (form.watch("suggestedMrp") || price * 1.3)) * 100))}% Projected Margin
                  </span>
                </div>

                {/* Freshness Index Meter */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Harvest Freshness Index
                    </span>
                    <span className="font-mono font-bold text-emerald-400">94% (Cold-Chain Grade A)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[94%] shadow-sm"></div>
                  </div>
                  <p className="text-[10px] text-slate-400">Optimal intake slot reserved at target Dark Store Hub.</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-emerald-900/60 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Supply Quantity:</span>
                    <span className="font-bold text-white font-mono">{quantity} {selectedUnit}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Wholesale Unit Price:</span>
                    <span className="font-bold text-white font-mono">₹{price} / {selectedUnit}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Target Retail RRP:</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{form.watch("suggestedMrp") || Math.round(price * 1.3)} / {selectedUnit}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Dark Store Processing Fee:</span>
                    <span className="font-mono text-amber-300">₹{(totalValue * 0.02).toFixed(2)} (2%)</span>
                  </div>
                  {selectedUnit === "Quintal" && (
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-emerald-800/40 text-[11px] text-amber-300 font-mono">
                      💡 Conversion: {quantity} Quintals = {quantity * 100} Kilograms
                    </div>
                  )}
                  {selectedUnit === "Liters" && (
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-emerald-800/40 text-[11px] text-amber-300 font-mono">
                      🥛 Milk Volume: {quantity} Liters (Direct Cold-Chain Pickup)
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Farmer Guarantee Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-xs space-y-3">
                <div className="flex items-center gap-2 font-extrabold text-white">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Sunotal Direct Farmer Guarantee</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                  <li>• Zero middleman commission—you get 100% of agreed price.</li>
                  <li>• Cold-chain logistics vehicle provided for doorstep farm pickup.</li>
                  <li>• Direct bank account transfer within 48 hours of Dark Store QC.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: History & Quotations List */}
        {activeTab === "history" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-white">Harvest Supply Quotations</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Produce Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Quantity & Unit</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Dark Store</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">#{q.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{q.produce}</td>
                      <td className="py-3 px-4">{q.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-300">{q.quantity} {q.unit || "Quintal"}</td>
                      <td className="py-3 px-4 font-mono">₹{q.price}</td>
                      <td className="py-3 px-4 text-slate-400">{q.darkStoreAllocation || "HSR Dark Store #104"}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`text-[10px] uppercase font-mono font-bold ${
                            q.status === "accepted"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-400/20 text-amber-300 border-amber-400/30"
                          }`}
                        >
                          {q.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Farmer Payouts & Advance Settlements */}
        {activeTab === "payouts" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Direct Farmer Bank Payouts & Settlement Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Payments are automatically credited to your bank account upon Dark Store quality inspection and admin invoice issuance.
                </p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 font-mono text-xs">
                VERIFIED FARM VENDOR
              </Badge>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Settled Earnings</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">
                  ₹{quotations.filter((q) => q.paymentStatus === "paid" || q.status === "accepted").reduce((acc, q) => acc + (q.quantity * q.price), 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">100% Direct Bank Transfer</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pending QC / Payouts</div>
                <div className="text-2xl font-extrabold font-mono text-amber-400">
                  ₹{quotations.filter((q) => q.status === "pending" || q.paymentStatus === "processing").reduce((acc, q) => acc + (q.quantity * q.price), 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">QC Clearance within 48h</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Invoices Generated</div>
                <div className="text-2xl font-extrabold font-mono text-white">
                  {invoices.length > 0 ? invoices.length : quotations.filter((q) => q.status === "accepted").length}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Official GST & Mandi Records</div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Settled Invoices & Payout Receipts
              </h4>

              {invoices.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Quotation ID</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4 text-right">Invoice Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {invoices.map((inv) => {
                        const token = localStorage.getItem("sunotal_vendor_token") || localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_admin_token");
                        const downloadUrl = `/api/vendors/invoices/${inv.id}/download?token=${token}`;
                        return (
                          <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-amber-400">{inv.invoiceNumber}</td>
                            <td className="py-3 px-4 text-slate-300 font-mono">{new Date(inv.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">#{inv.quotationId}</td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400">₹{Number(inv.amount).toLocaleString("en-IN")}</td>
                            <td className="py-3 px-4">
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-mono font-bold">
                                PAID & SETTLED
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
                              >
                                <Download className="w-3.5 h-3.5" /> Download HTML Invoice
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 text-slate-400 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-xs text-slate-300">Previous Transactions Registered in Ledger</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Quotations accepted by admin show up in your Harvest Supply Quotations tab. Invoices generated by admin will be available for download here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
    </VendorLayout>
  );
}
