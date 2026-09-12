import React from "react";
import { ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface CartBarProps {
  onCheckout: () => void;
}

export const CartBar: React.FC<CartBarProps> = ({ onCheckout }) => {
  const { totalItems, totalPrice: subtotal } = useCart();

  if (totalItems === 0) return null;

  const minOrderThreshold = 250;
  const remainingForMinOrder = Math.max(0, minOrderThreshold - subtotal);
  const minOrderProgress = Math.min(100, (subtotal / minOrderThreshold) * 100);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-950 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex flex-col gap-2 backdrop-blur-lg bg-opacity-95">
        {/* Minimum Order Progress */}
        <div className="flex items-center justify-between text-[11px] font-medium text-emerald-300 px-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            {remainingForMinOrder === 0 ? (
              <span className="font-bold text-amber-300">🎉 Minimum Order Threshold Met (₹250+) • FREE Express Delivery!</span>
            ) : (
              <span className="font-semibold text-amber-400">Add ₹{remainingForMinOrder.toFixed(0)} more to reach minimum order value of ₹250</span>
            )}
          </div>
          <span>{minOrderProgress.toFixed(0)}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
            style={{ width: `${minOrderProgress}%` }}
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
                {subtotal < 250 ? `Min order value: ₹250` : `Saved ₹${(subtotal * 0.15).toFixed(0)} on this order`}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (subtotal < 250) {
                alert(`Minimum order value is ₹250. Please add ₹${remainingForMinOrder.toFixed(0)} more items to proceed.`);
                return;
              }
              onCheckout();
            }}
            className={`flex items-center gap-2 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all ${
              subtotal < 250
                ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
            }`}
          >
            <span>{subtotal < 250 ? `Add ₹${remainingForMinOrder.toFixed(0)} More` : "Proceed to Checkout"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
