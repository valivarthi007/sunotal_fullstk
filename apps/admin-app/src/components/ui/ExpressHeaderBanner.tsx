import React from "react";
import { Zap, MapPin, Search, ShoppingBag, ChevronDown } from "lucide-react";
import { useLocation } from "@/lib/location-context";
import { useCart } from "@/lib/cart-context";

interface ExpressHeaderBannerProps {
  onOpenLocationModal: () => void;
  onOpenCart?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const ExpressHeaderBanner: React.FC<ExpressHeaderBannerProps> = ({
  onOpenLocationModal,
  onOpenCart,
  searchQuery = "",
  onSearchChange,
}) => {
  const { location } = useLocation();
  const { totalItems, totalPrice: subtotal } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-md border-b border-emerald-900">
      {/* Top Strip - Express Delivery Badge */}
      <div className="bg-emerald-900/80 px-4 py-1 flex items-center justify-between text-xs text-emerald-200 border-b border-emerald-800/50">
        <div className="flex items-center gap-2 font-medium">
          <span className="bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] animate-pulse">
            <Zap className="w-3 h-3 fill-slate-950" /> 10-15 MINS
          </span>
          <span>Hyperlocal Dark Store Delivery Active</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px]">
          <span>⚡ Free Express Delivery on orders above ₹199</span>
          <span className="text-emerald-400 font-semibold">Live Inventory</span>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Location Picker */}
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-xl text-slate-950 shadow-md">
              S
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                SUNOTAL <span className="text-emerald-400 font-bold text-xs bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-700">GROCERY</span>
              </span>
            </div>
          </a>

          {/* Location Selector Pill */}
          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-2 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-800 transition-all text-xs max-w-[220px] sm:max-w-xs text-left group"
          >
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <div className="font-bold flex items-center gap-1 text-[11px] text-white">
                Delivering to: <ChevronDown className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-[11px] text-emerald-200/80 truncate">
                {location.formattedAddress || `${location.city}, ${location.state}`}
              </div>
            </div>
          </button>
        </div>

        {/* Search Input */}
        {onSearchChange && (
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400/80" />
            <input
              type="text"
              placeholder="Search vegetables, milk, bread, chips..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-emerald-900/40 border border-emerald-800 rounded-xl text-xs text-white placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-emerald-900/80 transition-all"
            />
          </div>
        )}

        {/* Quick Cart Pill */}
        {onOpenCart && (
          <button
            onClick={onOpenCart}
            className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-slate-950 text-emerald-400 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-emerald-400">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] uppercase font-semibold text-slate-900">Cart</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
