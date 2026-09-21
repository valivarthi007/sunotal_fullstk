import React from "react";
import { ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface CartBarProps {
  onCheckout: () => void;
}

export const CartBar: React.FC<CartBarProps> = ({ onCheckout }) => {
  const { totalItems, totalPrice: subtotal } = useCart();

  if (totalItems === 0) return null;

  const freeDeliveryThreshold = 199;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-950 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex flex-col gap-2 backdrop-blur-lg bg-opacity-95">
        {/* Free Delivery Progress */}
        <div className="flex items-center justify-between text-[11px] font-medium text-emerald-300 px-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            {remainingForFreeDelivery === 0 ? (
              <span className="font-bold text-amber-300">🎉 You got FREE Express Delivery!</span>
            ) : (
              <span>Add ₹{remainingForFreeDelivery.toFixed(0)} more for FREE Delivery</span>
            )}
          </div>
          <span>{freeDeliveryProgress.toFixed(0)}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
            style={{ width: `${freeDeliveryProgress}%` }}
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">
                {totalItems} {totalItems === 1 ? "Item" : "Items"} • ₹{subtotal.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                Saved ₹{(subtotal * 0.15).toFixed(0)} on this order
              </div>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
