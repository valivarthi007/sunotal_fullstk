import { useState } from "react";
import { useLocation } from "wouter";
import { Product } from "@workspace/api-client-react";
import { createSubscription } from "@/lib/api-client/subscriptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Minus, CheckCircle2, Zap, RefreshCw, Sun, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function SubscribeModal({ open, onOpenChange, product }: SubscribeModalProps) {
  const [, setLocation] = useLocation();

  const [frequency, setFrequency] = useState<"daily" | "alternate" | "weekdays" | "weekends">("daily");
  const [deliverySlot, setDeliverySlot] = useState("6:00 AM - 7:30 AM");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) return null;

  const unitPrice = product.price || 50;
  const estimatedDays = frequency === "daily" ? 30 : frequency === "alternate" ? 15 : frequency === "weekdays" ? 22 : 8;
  const estimatedMonthlyTotal = unitPrice * quantity * estimatedDays;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const handleSubscribeSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await createSubscription({
        productId: Number(product.id),
        productName: product.name,
        frequency,
        deliverySlot,
        quantity,
        price: unitPrice,
      });

      toast.success(res.message || `Subscribed to ${product.name}!`, {
        action: {
          label: "View Subscriptions",
          onClick: () => setLocation("/subscriptions"),
        },
      });

      onOpenChange(false);
    } catch {
      toast.error("Failed to set up subscription. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              🥛
            </span>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Daily Subscription Plan
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Get fresh farm produce delivered every morning directly to your doorstep.
          </DialogDescription>
        </DialogHeader>

        {/* Product Preview Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/40 border border-border/60 my-2">
          <img
            src={normalizeImageUrl(product.image, product.category)}
            alt={product.name}
            onError={(e) => handleImageError(e, product.category)}
            className="w-14 h-14 rounded-xl object-cover border border-border/50 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.unit || "1 unit"}</p>
            <p className="text-emerald-600 font-extrabold text-sm mt-0.5">{fmt(unitPrice)} <span className="text-[10px] text-muted-foreground font-normal">per delivery</span></p>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {/* Frequency Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Delivery Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "daily", label: "Every Day", desc: "Mon to Sun (30 deliveries/mo)", icon: Sun },
                { id: "alternate", label: "Alternate Days", desc: "Every 2nd day (15 deliveries/mo)", icon: CalendarDays },
                { id: "weekdays", label: "Weekdays Only", desc: "Mon to Fri (22 deliveries/mo)", icon: Calendar },
                { id: "weekends", label: "Weekends Only", desc: "Sat & Sun (8 deliveries/mo)", icon: Calendar },
              ].map((f) => {
                const isSelected = frequency === f.id;
                const IconComponent = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id as any)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-600/20 text-emerald-900 dark:text-emerald-100"
                        : "border-border hover:border-emerald-600/40 bg-card text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-600" : "text-muted-foreground"}`} />
                        {f.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] opacity-80 mt-1">{f.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Morning Delivery Slot
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["6:00 AM - 7:30 AM", "7:30 AM - 9:00 AM"].map((slot) => {
                const isSelected = deliverySlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setDeliverySlot(slot)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-600/20"
                        : "border-border bg-card text-muted-foreground hover:border-emerald-600/40"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-accent/30 border border-border/50">
            <div>
              <p className="text-xs font-bold text-foreground">Quantity per Delivery</p>
              <p className="text-[10px] text-muted-foreground">Adjust anytime from subscription dashboard</p>
            </div>
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-sm w-4 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monthly Cost Breakdown */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <span>Estimated Monthly Budget</span>
              <span className="text-emerald-700 dark:text-emerald-300 text-sm font-black">{fmt(estimatedMonthlyTotal)}</span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              No upfront lock-in. Pay daily or auto-debit from wallet. Pause anytime!
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl font-bold border-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubscribeSubmit}
              disabled={isSubmitting}
              className="flex-[2] h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? "Setting Up..." : "Start Daily Subscription"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
