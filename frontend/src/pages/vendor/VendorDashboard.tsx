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
  category: z.string().min(1, "Please select a produce category"),
  produce: z.string().min(2, "Produce name must be at least 2 characters"),
  unit: z.string().min(1, "Please select a unit"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
  qualityGrade: z.string().min(1, "Please select a quality grade"),
  expectedHarvestDate: z.string().optional(),
  darkStoreAllocation: z.string().min(1, "Please select target Dark Store"),
  notes: z.string().optional(),
});

export default function VendorDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false }
  });
  const { data: categories } = useListCategories();
  const { data: productDefs } = useListProductDefinitions();
  const { data: products } = useListProducts();

  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
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
    if (user) {
      setVendorProfile({
        firstName: user.name.split(" ")[0] || "Vendor",
        lastName: user.name.split(" ").slice(1).join(" ") || "",
        phone: user.phone || "N/A",
        location: user.city || "Direct Sourcing Mandal",
        status: user.active ? "approved" : "pending",
      });

      fetch("/api/vendors/quotations")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setQuotations(data);
        })
        .catch(() => setQuotations([]));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"submit" | "history" | "payouts">("submit");

  const form = useForm<z.infer<typeof quotationSchema>>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      category: "Grains",
      produce: "",
      unit: "Quintal",
      quantity: 10,
      price: 3500,
      qualityGrade: "Grade A (Organic / Premium)",
      expectedHarvestDate: new Date().toISOString().split("T")[0],
      darkStoreAllocation: "HSR Layout Dark Store #104",
      notes: "",
    },
  });

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
    if (list.length === 0) {
      if (selectedCategory === "Vegetables") return ["Organic Tomatoes", "Farm Fresh Potatoes", "Fresh Onions", "Green Capsicum", "Organic Spinach"];
      if (selectedCategory === "Fruits") return ["Shimla Apples", "Robusta Bananas", "Nagpur Oranges", "Alphonso Mangoes"];
      if (selectedCategory === "Dairy") return ["A2 Desi Cow Milk", "Fresh Paneer", "Amul Butter 500g", "Fresh Curd"];
      if (selectedCategory === "Grains") return ["Sona Masoori Rice", "Whole Wheat Atta", "Toor Dal", "Basmati Rice"];
      return ["Sona Masoori Rice", "Organic Tomatoes", "A2 Desi Cow Milk", "Shimla Apples", "Amul Butter 500g"];
    }
    return list;
  }, [productDefs, products, selectedCategory]);

  // Automatically update unit options when category changes
  useEffect(() => {
    if (selectedCategory === "Dairy") {
      form.setValue("unit", "Liters");
    } else if (selectedCategory === "Grains" || selectedCategory === "Vegetables") {
      form.setValue("unit", "Quintal");
    } else if (selectedCategory === "Fruits") {
      form.setValue("unit", "Kg");
    }
  }, [selectedCategory, form]);

  const totalValue = quantity * price;

  const onSubmitQuotation = async (values: z.infer<typeof quotationSchema>) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("sunotal_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch("/api/vendors/quotations", {
        method: "POST",
        headers,
        body: JSON.stringify(values),
      });

      if (res.ok) {
        const newQuote = await res.json();
        setQuotations((prev) => [newQuote, ...prev]);
        toast.success(`Harvest Supply quotation for ${values.produce} submitted to ${values.darkStoreAllocation}!`);
      } else {
        // Local POC fallback insertion
        const newQuote = {
          id: Date.now(),
          ...values,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setQuotations((prev) => [newQuote, ...prev]);
        toast.success(`Harvest Supply quotation for ${values.produce} submitted successfully!`);
      }

      form.reset({
        category: values.category,
        produce: "",
        unit: values.unit,
        quantity: 10,
        price: values.price,
        qualityGrade: values.qualityGrade,
        expectedHarvestDate: new Date().toISOString().split("T")[0],
        darkStoreAllocation: values.darkStoreAllocation,
        notes: "",
      });
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quotation");
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
                🌾
              </div>
              <div>
                <div className="font-bold text-base text-secondary flex items-center gap-2">
                  <span>{vendorProfile?.firstName} {vendorProfile?.lastName}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] uppercase font-mono font-bold">
                    VERIFIED FARM VENDOR
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>📍 {vendorProfile?.location}</span>
                  <span>• {vendorProfile?.farmSize || "10 Acres"}</span>
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
          <div className="flex border-b border-border gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("submit")}
              className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 rounded-t-xl ${
                activeTab === "submit"
                  ? "border-emerald-600 text-emerald-600 font-bold bg-accent/40"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Submit Crop Harvest Supply
            </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "border-emerald-400 text-emerald-400 font-bold bg-slate-900/60 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" /> Supply Batches & Quotations ({quotations.length})
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "payouts"
                ? "border-emerald-400 text-emerald-400 font-bold bg-slate-900/60 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Direct Farmer Settlement Payouts
          </button>
        </div>

        {/* TAB 1: Submit Produce Form */}
        {activeTab === "submit" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Submit Harvest Produce Quotation
                </h2>
                <p className="text-xs text-slate-400">
                  Supply farm-fresh crops, vegetables, grains, or dairy direct to Sunotal Dark Stores.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitQuotation)} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category - Strict Admin Control */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 font-bold">Produce Category (Admin Catalog)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs">
                                <SelectValue placeholder="Select Admin Category" />
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
                                  <SelectItem value="Grains">🌾 Grains, Atta & Rice</SelectItem>
                                  <SelectItem value="Vegetables">🥦 Fresh Vegetables</SelectItem>
                                  <SelectItem value="Fruits">🍎 Fresh Fruits</SelectItem>
                                  <SelectItem value="Dairy">🥛 Dairy & Fresh Milk</SelectItem>
                                  <SelectItem value="Dry Fruits">🥜 Dry Fruits & Nuts</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Produce Name - Strict Admin Control */}
                    <FormField
                      control={form.control}
                      name="produce"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 font-bold">Produce Crop Name (Admin Defined Catalog)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs">
                                <SelectValue placeholder="Select Product defined by Admin..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                              {availableProduceItems.map((prodName) => (
                                <SelectItem key={prodName} value={prodName}>
                                  🌱 {prodName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Scale className="w-3.5 h-3.5 text-amber-400" /> Supply Unit
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs font-bold">
                                <SelectValue placeholder="Select Unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                              {selectedCategory === "Dairy" ? (
                                <>
                                  <SelectItem value="Liters">Liters (L)</SelectItem>
                                  <SelectItem value="Milliliters">Milliliters (mL)</SelectItem>
                                </>
                              ) : selectedCategory === "Fruits" ? (
                                <>
                                  <SelectItem value="Quintal">Quintals (100 kg/unit)</SelectItem>
                                  <SelectItem value="Kg">Kilograms (kg)</SelectItem>
                                  <SelectItem value="Dozen">Dozen</SelectItem>
                                  <SelectItem value="Pack">Boxes / Packs</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="Quintal">Quintals (100 kg/unit)</SelectItem>
                                  <SelectItem value="Kg">Kilograms (kg)</SelectItem>
                                  <SelectItem value="Tons">Metric Tons</SelectItem>
                                </>
                              )}
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
                          <FormLabel className="text-slate-300 font-bold">Available Quantity ({selectedUnit})</FormLabel>
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

                    {/* Price */}
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 font-bold">Asking Price (₹ per {selectedUnit})</FormLabel>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Quality Grade */}
                    <FormField
                      control={form.control}
                      name="qualityGrade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 font-bold">Quality Grade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs">
                                <SelectValue placeholder="Grade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                              <SelectItem value="Grade A (Organic / Premium)">Grade A (100% Organic Premium)</SelectItem>
                              <SelectItem value="Grade B (Standard)">Grade B (Standard Quality)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Harvest Date */}
                    <FormField
                      control={form.control}
                      name="expectedHarvestDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Harvest Date
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                            />
                          </FormControl>
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
                            <Building2 className="w-3.5 h-3.5 text-amber-400" /> Target Dark Store
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
                                <>
                                  <SelectItem value="Bengaluru Central Fulfillment Hub (Bengaluru)">
                                    🏢 Bengaluru Central Hub — Indiranagar, Bengaluru
                                  </SelectItem>
                                  <SelectItem value="Vijayawada Logistics Center (Vijayawada)">
                                    🏢 Vijayawada Logistics Center — Bhavani Puram, Vijayawada
                                  </SelectItem>
                                  <SelectItem value="Hyderabad Express Hub (Hyderabad)">
                                    🏢 Hyderabad Express Hub — HITEC City, Hyderabad
                                  </SelectItem>
                                  <SelectItem value="HSR Layout Dark Store #104 (Bengaluru)">
                                    🏢 HSR Layout Dark Store #104 — HSR Layout, Bengaluru
                                  </SelectItem>
                                  <SelectItem value="Indiranagar Dark Store #108 (Bengaluru)">
                                    🏢 Indiranagar Dark Store #108 — Indiranagar, Bengaluru
                                  </SelectItem>
                                  <SelectItem value="Whitefield Dark Store #102 (Bengaluru)">
                                    🏢 Whitefield Dark Store #102 — Whitefield, Bengaluru
                                  </SelectItem>
                                </>
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
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 border border-emerald-900/60 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold uppercase tracking-wider">ESTIMATED BATCH VALUE</span>
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] font-mono">
                    2-DAY SETTLEMENT
                  </Badge>
                </div>

                <div className="text-3xl font-extrabold font-mono text-white">
                  ₹{totalValue.toLocaleString("en-IN")}
                </div>

                <div className="space-y-2 pt-2 border-t border-emerald-900/60 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Supply Quantity:</span>
                    <span className="font-bold text-white font-mono">{quantity} {selectedUnit}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Asking Unit Price:</span>
                    <span className="font-bold text-white font-mono">₹{price} / {selectedUnit}</span>
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-lg text-white">Direct Farmer Bank Payouts & Advance Ledger</h3>
            <p className="text-xs text-slate-400">
              Payments are automatically credited to your UPI / Bank account upon Dark Store quality inspection.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Settled Earnings</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">₹63,000.00</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Pending QC Inspection</div>
                <div className="text-2xl font-extrabold font-mono text-amber-400">₹27,500.00</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Next Payout Schedule</div>
                <div className="text-base font-extrabold font-mono text-white pt-1">Tomorrow, 10:00 AM</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </VendorLayout>
  );
}
