import { Product } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Leaf, Check, MapPin, Plus, Minus, Heart, Calendar } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";
import { useState } from "react";
import { Link } from "wouter";
import { SubscribeModal } from "@/components/ui/SubscribeModal";

export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, removeItem, updateQuantity } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  
  // Find current cart quantity for this product
  const cartItem = items.find((i) => i.product.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const handleAddToCart = () => {
    addItem(product);
  };

  const handleIncrement = () => {
    updateQuantity(product.id, currentQuantity + 1);
  };

  const handleDecrement = () => {
    if (currentQuantity === 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, currentQuantity - 1);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product);
  };

  return (
    <>
      <SubscribeModal open={subscribeModalOpen} onOpenChange={setSubscribeModalOpen} product={product} />

      <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-card-border shadow-sm transition-all hover:shadow-md hover:border-primary/20">
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          <Badge variant="default" className="w-fit text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-sm">
            {product.category}
          </Badge>
          {product.organic && (
            <Badge variant="secondary" className="w-fit text-[10px] bg-green-100 text-green-800 border-transparent hover:bg-green-100 flex items-center gap-1 uppercase tracking-wider px-2 py-0.5 shadow-sm">
              <Leaf className="w-3 h-3" /> Organic
            </Badge>
          )}
          {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5 && (
            <Badge variant="destructive" className="w-fit text-[10px] bg-amber-500 text-white animate-pulse px-2 py-0.5 shadow-sm">
              Only {product.stock} left!
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            onClick={handleToggleWishlist}
            className={`w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-sm active:scale-95 ${
              isWishlisted
                ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/60 dark:border-rose-800"
                : "bg-background/80 border-border/50 text-muted-foreground hover:text-rose-500 hover:bg-background"
            }`}
            title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-4 h-4 transition-transform ${isWishlisted ? "fill-rose-500 text-rose-500 scale-110" : ""}`} />
          </button>
          {product.discountPercentage > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 border-transparent hover:bg-red-100 font-bold px-2 py-0.5 shadow-sm font-mono text-[10px]">
              -{product.discountPercentage}%
            </Badge>
          )}
        </div>

        <Link href={`/products/${product.id}`} className="aspect-square overflow-hidden bg-muted/30 cursor-pointer block">
          <img
            src={normalizeImageUrl(product.image, product.category)}
            alt={product.name}
            onError={(e) => handleImageError(e, product.category)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="flex flex-1 flex-col p-4 pb-16">
          <div className="mb-2">
            <p className="text-xs text-muted-foreground mb-1">{product.unit}</p>
            <Link href={`/products/${product.id}`} className="font-bold text-secondary line-clamp-2 leading-tight hover:text-emerald-600 transition-colors cursor-pointer block">
              {product.name}
            </Link>
            {product.location && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
                <MapPin className="w-3 h-3 shrink-0" /> {product.location}
              </p>
            )}

            {/* Real-time Stock Availability Indicator */}
            {product.stock !== undefined && (
              <div className="mt-2 space-y-1">
                {product.stock === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Out of Stock
                  </span>
                ) : product.stock <= 5 ? (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:border-amber-800 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      ⚡ Only {product.stock} left in stock!
                    </span>
                    <div className="w-full bg-amber-100 dark:bg-amber-950 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(product.stock / 5) * 100}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    In Stock ({product.stock > 99 ? "99+" : product.stock} available)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{fmt(product.price)}</span>
                {product.originalPrice > product.price && (
                  <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">
                    {fmt(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BigBasket-Style Instant Quantity Stepper & Add Button + Subscribe */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-card border-t border-border">
          {currentQuantity === 0 ? (
            <div className="flex items-center gap-1.5">
              <Button
                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shadow-sm"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? "Out of stock" : <><ShoppingCart className="w-3.5 h-3.5" /> ADD</>}
              </Button>
              {product.stock !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 rounded-xl text-[11px] font-bold border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 gap-1 shrink-0"
                  onClick={() => setSubscribeModalOpen(true)}
                  title="Subscribe Daily (Milk, Eggs, Bread)"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Subscribe
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-emerald-700 text-white rounded-xl h-9 px-2 font-mono font-bold text-xs shadow-md">
              <button
                onClick={handleDecrement}
                className="p-1 hover:bg-emerald-800 rounded transition-colors text-white"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs">{currentQuantity} in cart</span>
              <button
                onClick={handleIncrement}
                className="p-1 hover:bg-emerald-800 rounded transition-colors text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card border border-card-border shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-5 w-3/4" />
        <div className="mt-4">
          <Skeleton className="h-6 w-1/3" />
        </div>
      </div>
    </div>
  );
}
