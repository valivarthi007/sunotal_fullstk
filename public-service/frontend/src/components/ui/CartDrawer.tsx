import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { ShoppingCart, Trash2, Plus, Minus, Tag, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { normalizeImageUrl } from "@/lib/image-utils";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [, setLocation] = useLocation();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const deliveryFee = totalPrice >= 199 || totalPrice === 0 ? 0 : 30;
  const platformFee = totalPrice > 0 ? 15 : 0;
  const finalTotal = Math.max(0, totalPrice + deliveryFee + platformFee - appliedDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidating(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), orderAmount: totalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedDiscount(data.discountAmount);
        setAppliedCoupon(data.code);
        toast.success(data.message || `Coupon ${data.code} applied! Saved ₹${data.discountAmount}`);
      } else {
        toast.error(data.message || "Invalid coupon code");
      }
    } catch {
      // Fallback client-side check if backend offline
      if (couponCode.toUpperCase() === "SUNOTAL50" && totalPrice >= 199) {
        const d = Math.min(100, Math.round(totalPrice * 0.5));
        setAppliedDiscount(d);
        setAppliedCoupon("SUNOTAL50");
        toast.success(`Coupon SUNOTAL50 applied! Saved ₹${d}`);
      } else if (couponCode.toUpperCase() === "FREESHIP") {
        setAppliedDiscount(30);
        setAppliedCoupon("FREESHIP");
        toast.success("Coupon FREESHIP applied! Free Delivery unlocked");
      } else {
        toast.error("Invalid coupon code or minimum order amount not met");
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleCheckout = () => {
    onClose();
    setLocation("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l border-border bg-background shadow-2xl">
        {/* Drawer Header */}
        <SheetHeader className="p-5 border-b border-border bg-emerald-950 text-white space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-800/60 rounded-xl text-emerald-300">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <SheetTitle className="text-lg font-bold text-white">My Cart</SheetTitle>
            </div>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono font-bold">
              {totalItems} Items
            </Badge>
          </div>
          <SheetDescription className="text-xs text-emerald-200/80 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Delivery in 10–15 Minutes to your location
          </SheetDescription>
        </SheetHeader>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                <ShoppingCart className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">Your cart is empty</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Add farm-fresh produce and daily essential groceries to start shopping.
                </p>
              </div>
              <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs">
                Browse Products
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl shadow-sm hover:border-emerald-500/30 transition-colors"
              >
                <img
                  src={normalizeImageUrl(item.product.image, item.product.category)}
                  alt={item.product.name}
                  className="w-14 h-14 object-cover rounded-xl bg-muted/30 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">{item.product.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{item.product.unit}</p>
                  <p className="text-xs font-bold font-mono text-emerald-600 mt-1">
                    ₹{item.product.price * item.quantity}{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      (₹{item.product.price} each)
                    </span>
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
                  <button
                    onClick={() =>
                      item.quantity === 1 ? removeItem(item.product.id) : updateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="p-1 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold font-mono px-1">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-1 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Coupons */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border bg-card space-y-4">
            {/* Promo Code Input */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter Promo Code (e.g. SUNOTAL50)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="h-10 text-xs rounded-xl uppercase font-mono"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={isValidating || !couponCode.trim()}
                  className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  Apply
                </Button>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-200">
                  <span className="flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Coupon '{appliedCoupon}' Active
                  </span>
                  <span className="font-bold text-emerald-700">-₹{appliedDiscount}</span>
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div className="space-y-1.5 text-xs border-t border-border pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="font-mono">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Fee</span>
                <span className="font-mono">
                  {deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Handling & Platform Fee</span>
                <span className="font-mono">₹{platformFee}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Savings</span>
                  <span className="font-mono">-₹{appliedDiscount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2">
                <span>Total Amount Payable</span>
                <span className="font-mono text-emerald-600 text-base">₹{finalTotal}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              onClick={handleCheckout}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl gap-2 shadow-lg"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
