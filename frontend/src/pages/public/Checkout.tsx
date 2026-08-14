import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getGetCurrentUserQueryKey, useGetCurrentUser } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useLocationState } from "@/lib/location-context";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  MapPin,
  Truck,
  ShieldCheck,
  CreditCard,
  Building2,
  Receipt,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const checkoutSchema = z.object({
  streetAddress: z.string().min(5, "Street address must be at least 5 characters long"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Pincode"),
  companyName: z.string().optional(),
  gstin: z.string().optional().refine((val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val), {
    message: "Invalid GSTIN format (e.g. 36AAACB1234C1ZV)",
  }),
  poNumber: z.string().optional(),
  paymentMethod: z.enum(["card", "upi", "netbanking", "corporate_po"]),
}).superRefine((val, ctx) => {
  if (val.paymentMethod === "corporate_po" && (!val.poNumber || !val.poNumber.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["poNumber"],
      message: "PO Reference Number is required for Corporate PO billing",
    });
  }
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { location: userLoc } = useLocationState();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<any>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      streetAddress: "",
      city: userLoc.city || "Hyderabad",
      state: userLoc.state || "Telangana",
      pincode: userLoc.pincode || "500033",
      companyName: "",
      gstin: "",
      poNumber: "",
      paymentMethod: "card",
    },
  });

  // Sync user location into checkout address form if defaults change
  useEffect(() => {
    if (userLoc.city) form.setValue("city", userLoc.city);
    if (userLoc.state) form.setValue("state", userLoc.state);
    if (userLoc.pincode) form.setValue("pincode", userLoc.pincode);
  }, [userLoc, form]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const handlePlaceOrder = async (values: CheckoutValues) => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("sunotal_token");
      const checkoutItems = items.map(i => ({
        productId: i.product.id,
        quantity: i.quantity
      }));

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: checkoutItems })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process stock deduction for this order");
      }

      const orderRef = `SUN-${Math.floor(100000 + Math.random() * 900000)}`;
      const confirmData: any = {
        id: orderRef,
        orderId: orderRef,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          unit: i.product.unit,
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.image,
          farmerName: "Verified Local Farmer",
        })),
        totalPrice,
        status: "out_for_delivery",
        estimatedDelivery: `Express 2-Hour Delivery (${values.city})`,
        deliveryAddress: values.streetAddress,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        streetAddress: values.streetAddress,
        gstin: values.gstin,
        poNumber: values.poNumber,
        paymentMethod: values.paymentMethod === "card" ? "Credit / Debit Card" : values.paymentMethod === "upi" ? "UPI" : values.paymentMethod === "netbanking" ? "Net Banking" : "Corporate PO Invoice",
        driverName: "Ramesh Kumar",
        driverPhone: "+91 98765 43210",
        vehicleNo: "EV-DEL-4412",
      };

      // Persist to user orders in localStorage so it appears in My Orders & Tracking
      try {
        const existingRaw = localStorage.getItem("sunotal_user_orders");
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem("sunotal_user_orders", JSON.stringify([confirmData, ...existing]));
      } catch (err) {
        console.error("Failed to save order to storage", err);
      }

      setOrderConfirmed(confirmData);
      clearCart();
      toast.success(`Order ${orderRef} placed successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderConfirmed) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <div className="bg-card border border-border shadow-xl rounded-3xl p-8 sm:p-12 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                Order Confirmed
              </span>
              <h1 className="text-3xl font-extrabold text-secondary mt-3">Thank you for your order!</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Order Ref: <span className="font-mono font-bold text-secondary">{orderConfirmed.orderId}</span>
              </p>
            </div>

            <div className="bg-accent/40 rounded-2xl p-6 text-left space-y-3 text-sm border border-border">
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Delivery Location:</span>
                <span className="font-bold text-secondary">{orderConfirmed.streetAddress}, {orderConfirmed.city}, {orderConfirmed.state} - {orderConfirmed.pincode}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Est. Guaranteed Delivery:</span>
                <span className="font-bold text-green-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 2-Hour Express Delivery in {orderConfirmed.city}
                </span>
              </div>
              {orderConfirmed.gstin && (
                <div className="flex justify-between border-b pb-3">
                  <span className="text-muted-foreground">GSTIN Billing:</span>
                  <span className="font-mono font-bold text-secondary">{orderConfirmed.gstin}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-bold text-base">
                <span>Total Amount Paid:</span>
                <span className="text-primary">{fmt(orderConfirmed.totalPrice)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button className="flex-1 rounded-xl h-12 font-bold shadow-md" onClick={() => setLocation("/products")}>
                Continue Shopping <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const currentCity = form.watch("city") || "Hyderabad";
  const currentState = form.watch("state") || "Telangana";
  const currentPaymentMethod = form.watch("paymentMethod");

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Corporate Checkout</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Location-aware fresh produce delivery for corporate hubs & residences.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <MapPin className="w-4 h-4" />
            Auto-Detected Hub: <strong className="text-secondary">{currentCity}, {currentState}</strong>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Truck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-secondary mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground text-sm mb-6">Add farm-fresh produce to proceed with checkout.</p>
            <Button onClick={() => setLocation("/products")} className="rounded-full px-8">
              Browse Products
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePlaceOrder)} className="grid lg:grid-cols-12 gap-8">
              {/* Left Column: Delivery Address & Payment Options */}
              <div className="lg:col-span-7 space-y-6">
                {/* Section 1: Shipping Address */}
                <div className="bg-card border border-border shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-secondary">Delivery Destination</h2>
                      <p className="text-xs text-muted-foreground">Auto-filled from your location settings</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street / Building / Hub Address <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Building 4B, Mindspace IT Park, HITEC City"
                              className="h-11 rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="500033" className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-accent/40 border border-border flex items-center gap-3 text-xs text-secondary font-medium">
                      <Truck className="w-5 h-5 text-primary shrink-0" />
                      <span>
                        Guaranteed <strong>2-Hour Express Delivery</strong> available for <strong>{currentCity}</strong> region.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Corporate B2B Details (Optional) */}
                <div className="bg-card border border-border shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-secondary">Corporate Invoice Details</h2>
                      <p className="text-xs text-muted-foreground">Optional fields for company billing & GST claiming</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Technologies Pvt Ltd" className="h-11 rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GSTIN Number</FormLabel>
                          <FormControl>
                            <Input placeholder="36AAACB1234C1ZV" className="h-11 rounded-xl font-mono uppercase" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="poNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Corporate PO Reference Number {currentPaymentMethod === "corporate_po" && <span className="text-destructive">*</span>}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="PO-2026-8891" className="h-11 rounded-xl font-mono" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Payment Method */}
                <div className="bg-card border border-border shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-secondary">Payment Method</h2>
                      <p className="text-xs text-muted-foreground">Secure 256-bit encrypted checkout</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "card", label: "Credit / Debit Card", icon: CreditCard },
                      { id: "upi", label: "UPI / QR Code", icon: QrCode },
                      { id: "netbanking", label: "Net Banking", icon: Receipt },
                      { id: "corporate_po", label: "Corporate PO / Invoice", icon: Building2 },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = currentPaymentMethod === m.id;
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => form.setValue("paymentMethod", m.id as any)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                            isSel
                              ? "border-primary bg-primary/5 shadow-sm font-bold text-primary"
                              : "border-border/70 hover:border-primary/40 bg-background text-secondary"
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="text-xs font-semibold leading-tight">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary & Place Order */}
              <div className="lg:col-span-5">
                <div className="bg-card border border-border shadow-lg rounded-3xl p-6 sticky top-28 space-y-6">
                  <h2 className="font-bold text-xl text-secondary border-b pb-4">Order Summary</h2>

                  <ul className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
                    {items.map(({ product, quantity }) => (
                      <li key={product.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={normalizeImageUrl(product.image, product.category)}
                            alt={product.name}
                            onError={(e) => handleImageError(e, product.category)}
                            className="w-12 h-12 rounded-xl object-cover border"
                          />
                          <div>
                            <p className="font-semibold text-secondary text-sm leading-tight">{product.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Qty: {quantity} × {product.unit}</p>
                          </div>
                        </div>
                        <span className="font-bold text-secondary text-sm">{fmt(product.price * quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3 pt-4 border-t text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal ({totalItems} items)</span>
                      <span className="font-semibold text-secondary">{fmt(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Express Delivery ({currentCity})</span>
                      <span className="text-green-600 font-bold">FREE</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Estimated Taxes & GST</span>
                      <span className="font-semibold text-secondary">Included</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-xl text-secondary border-t pt-3">
                      <span>Total Amount</span>
                      <span className="text-primary">{fmt(totalPrice)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-2xl font-bold text-base shadow-xl shadow-primary/20"
                  >
                    {isSubmitting ? (
                      "Authorizing Order..."
                    ) : (
                      <>
                        Place Order • {fmt(totalPrice)} <Sparkles className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span>Traceable Farm Guarantee & 100% Quality Assurance</span>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        )}
      </div>
    </PublicLayout>
  );
}

