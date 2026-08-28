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
import { PaymentGatewayModal } from "@/components/ui/PaymentGatewayModal";
import { DeliverySlotPicker } from "@/components/ui/DeliverySlotPicker";
import { InteractiveMapPickerModal } from "@/components/ui/InteractiveMapPickerModal";
import { calculateDeliveryFee, createOrderCheckout, verifyPayment, DeliveryFeeCalculation } from "@/lib/api-client";
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
  FileCheck,
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
  
  // Payment Gateway Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  // Map Modal & Slot State
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("express_2hr");
  const [selectedSlotName, setSelectedSlotName] = useState("Express 2-Hour Delivery");

  // Dynamic Delivery Calculation State
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryFeeCalculation | null>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      streetAddress: "",
      city: userLoc.city || "Bengaluru",
      state: userLoc.state || "Karnataka",
      pincode: userLoc.pincode || "560100",
      companyName: "",
      gstin: "",
      poNumber: "",
      paymentMethod: "card",
    },
  });

  // Sync user location into checkout address form & calculate distance delivery fee
  const currentCity = form.watch("city") || "Bengaluru";

  useEffect(() => {
    if (userLoc.city) form.setValue("city", userLoc.city);
    if (userLoc.state) form.setValue("state", userLoc.state);
    if (userLoc.pincode) form.setValue("pincode", userLoc.pincode);
  }, [userLoc, form]);

  // Recalculate Delivery Fee when city changes
  useEffect(() => {
    calculateDeliveryFee({ city: currentCity })
      .then((res) => setDeliveryCalc(res))
      .catch((err) => console.error("Delivery fee calculation error:", err));
  }, [currentCity]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const deliveryFeeAmount = deliveryCalc ? deliveryCalc.deliveryFee : 0;
  const gstAmount = Math.round(totalPrice * 0.05);
  const finalPayable = totalPrice + gstAmount + deliveryFeeAmount;

  const handlePlaceOrder = async (values: CheckoutValues) => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const checkoutItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        price: i.product.price,
      }));

      const res = await createOrderCheckout({
        items: checkoutItems,
        shippingAddress: values.streetAddress,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        deliveryFee: deliveryFeeAmount,
        corporateGstin: values.gstin,
        corporatePoRef: values.poNumber,
        paymentMethod: values.paymentMethod === "corporate_po" ? "po" : values.paymentMethod,
      });

      setPendingOrder({
        ...res.order,
        values,
      });

      // Open Payment Gateway Modal
      setShowPaymentModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPaymentModal(false);
    if (!pendingOrder) return;

    const confirmData = {
      id: pendingOrder.orderNumber,
      orderId: pendingOrder.orderNumber,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      items: items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        unit: i.product.unit,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.image,
      })),
      totalPrice: finalPayable,
      status: "processing",
      estimatedDelivery: deliveryCalc?.estimatedHours || "Express 2-Hour Delivery",
      deliveryAddress: pendingOrder.shippingAddress,
      city: pendingOrder.city,
      state: pendingOrder.state,
      pincode: pendingOrder.pincode,
      paymentId,
      paymentMethod: pendingOrder.paymentMethod,
    };

    setOrderConfirmed(confirmData);
    clearCart();
    toast.success(`Payment verified! Order ${pendingOrder.orderNumber} placed successfully.`);
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
                Order Confirmed & Payment Captured
              </span>
              <h1 className="text-3xl font-extrabold text-secondary mt-3">Thank you for your order!</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Order Ref: <span className="font-mono font-bold text-secondary">{orderConfirmed.orderId}</span>
              </p>
            </div>

            <div className="bg-accent/40 rounded-2xl p-6 text-left space-y-3 text-sm border border-border">
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Delivery Destination:</span>
                <span className="font-bold text-secondary">{orderConfirmed.deliveryAddress}, {orderConfirmed.city}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Est. Delivery Promise:</span>
                <span className="font-bold text-green-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {orderConfirmed.estimatedDelivery}
                </span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-muted-foreground">Payment Transaction ID:</span>
                <span className="font-mono font-bold text-emerald-600">{orderConfirmed.paymentId}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-base">
                <span>Total Amount Paid:</span>
                <span className="text-primary">{fmt(orderConfirmed.totalPrice)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button className="flex-1 rounded-xl h-12 font-bold shadow-md" onClick={() => setLocation("/orders")}>
                View My Orders & Track Delivery <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const currentState = form.watch("state") || "Karnataka";
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
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-secondary">Delivery Destination</h2>
                        <p className="text-xs text-muted-foreground">Pin precise location on map or choose saved address</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowMapModal(true)} className="rounded-xl text-xs font-bold border-primary/30 text-primary">
                      <MapPin className="w-3.5 h-3.5 mr-1" /> Pin Map Location
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <DeliverySlotPicker
                      selectedSlotId={selectedSlotId}
                      onSelectSlot={(id, name) => {
                        setSelectedSlotId(id);
                        setSelectedSlotName(name);
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street / Building / Hub Address <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Building 4B, Electronic City Phase 1"
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
                              <Input className="h-11 rounded-xl font-mono" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Corporate Invoicing Details */}
                <div className="bg-card border border-border shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-secondary">Corporate GSTIN & PO Billing (Optional)</h2>
                      <p className="text-xs text-muted-foreground">Claim GST input tax credit for enterprise purchases</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company / Enterprise Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Sunotal Enterprises Pvt Ltd" className="h-11 rounded-xl" {...field} />
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
                  </div>
                </div>

                {/* Section 3: Payment Method Selection */}
                <div className="bg-card border border-border shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-secondary">Payment Method</h2>
                      <p className="text-xs text-muted-foreground">Encrypted test & sandbox payment simulator</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "card", label: "Credit / Debit Card", icon: CreditCard },
                      { id: "upi", label: "UPI / QR Code", icon: QrCode },
                      { id: "netbanking", label: "Net Banking", icon: Building2 },
                      { id: "corporate_po", label: "Corporate PO Account", icon: FileCheck },
                    ].map((pm) => {
                      const Icon = pm.icon;
                      const isSelected = currentPaymentMethod === pm.id;
                      return (
                        <label
                          key={pm.id}
                          onClick={() => form.setValue("paymentMethod", pm.id as any)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm font-semibold"
                              : "border-border hover:border-primary/40 text-muted-foreground"
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="text-xs">{pm.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {currentPaymentMethod === "corporate_po" && (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <FormField
                        control={form.control}
                        name="poNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purchase Order Reference Number <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="PO-2026-SUN-0091" className="h-11 rounded-xl font-mono uppercase" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-card border border-border shadow-xl rounded-3xl p-6 space-y-6 sticky top-24">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="font-bold text-lg text-secondary">Order Summary ({totalItems} items)</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      Express Hub
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {items.map((i) => (
                      <div key={i.product.id} className="flex items-center gap-3 text-xs">
                        <img
                          src={normalizeImageUrl(i.product.image)}
                          alt={i.product.name}
                          onError={handleImageError}
                          className="w-12 h-12 rounded-xl object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-secondary truncate">{i.product.name}</p>
                          <p className="text-muted-foreground text-[11px]">{i.quantity} x {fmt(i.product.price)}</p>
                        </div>
                        <span className="font-bold text-secondary font-mono">{fmt(i.product.price * i.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dynamic Distance & Delivery Fee Calculation */}
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-emerald-900 dark:text-emerald-200">
                      <span>Haversine Distance:</span>
                      <strong>{deliveryCalc ? `${deliveryCalc.distanceKm} km` : "Calculating..."}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-900 dark:text-emerald-200">
                      <span>Free Delivery Radius:</span>
                      <strong>25 km (₹0)</strong>
                    </div>
                    <div className="flex justify-between text-emerald-900 dark:text-emerald-200 font-bold border-t border-emerald-200 dark:border-emerald-800 pt-1.5">
                      <span>Calculated Delivery Fee:</span>
                      <span className={deliveryFeeAmount === 0 ? "text-emerald-600 font-extrabold" : "text-foreground"}>
                        {deliveryFeeAmount === 0 ? "FREE (₹0)" : fmt(deliveryFeeAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2 text-xs border-t pt-4">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items Subtotal:</span>
                      <span className="font-mono text-secondary">{fmt(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Estimated GST (5% Organic):</span>
                      <span className="font-mono text-secondary">{fmt(gstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Fee:</span>
                      <span className="font-mono text-emerald-600">{deliveryFeeAmount === 0 ? "FREE" : fmt(deliveryFeeAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t text-base font-extrabold text-secondary">
                      <span>Total Payable:</span>
                      <span className="text-primary font-mono">{fmt(finalPayable)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20"
                  >
                    Proceed to Secure Payment ({fmt(finalPayable)})
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}

        {/* Payment Gateway Modal */}
        {pendingOrder && (
          <PaymentGatewayModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            orderId={pendingOrder.id}
            amount={finalPayable}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Interactive Map Picker Modal */}
        <InteractiveMapPickerModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          onSelectAddress={(addr) => {
            form.setValue("streetAddress", `${addr.houseNo}, ${addr.street}`);
            form.setValue("city", addr.city);
            form.setValue("state", addr.state);
            form.setValue("pincode", addr.pincode);
          }}
        />
      </div>
    </PublicLayout>
  );
}
