import { Product } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Leaf, Check, MapPin, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";
import { useState } from "react";

export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, removeItem, updateQuantity } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  
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

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    fetch("/api/wishlists", {
      method: isWishlisted ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: 1, productId: product.id }),
    }).catch(() => null);
  };

  return (
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
        {product.stock > 0 && product.stock <= 5 && (
          <Badge variant="destructive" className="w-fit text-[10px] bg-amber-500 text-white animate-pulse px-2 py-0.5 shadow-sm">
            Only {product.stock} left!
          </Badge>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={handleToggleWishlist}
          className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shadow-sm"
          title="Add to Wishlist"
        >
          <span className={isWishlisted ? "text-red-500" : "text-muted-foreground"}>{isWishlisted ? "❤️" : "🤍"}</span>
        </button>
        {product.discountPercentage > 0 && (
          <Badge variant="secondary" className="bg-red-100 text-red-700 border-transparent hover:bg-red-100 font-bold px-2 py-0.5 shadow-sm font-mono text-[10px]">
            -{product.discountPercentage}%
          </Badge>
        )}
      </div>

      <div className="aspect-square overflow-hidden bg-muted/30">
        <img
          src={normalizeImageUrl(product.image, product.category)}
          alt={product.name}
          onError={(e) => handleImageError(e, product.category)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-4 pb-16">
        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">{product.unit}</p>
          <h3 className="font-bold text-secondary line-clamp-2 leading-tight">{product.name}</h3>
          {product.location && (
            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1 line-clamp-1">
              <MapPin className="w-3 h-3 shrink-0" /> {product.location}
            </p>
          )}
          {product.stock !== undefined && (
            <p className={`text-[10px] font-semibold mt-1.5 ${product.stock > 0 ? "text-green-600" : "text-destructive"}`}>
              {product.stock > 0 ? `${product.stock} kg available` : "Out of stock"}
            </p>
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

      {/* BigBasket-Style Instant Quantity Stepper & Add Button */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-card border-t border-border">
        {currentQuantity === 0 ? (
          <Button
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Out of stock" : <><ShoppingCart className="w-3.5 h-3.5" /> ADD</>}
          </Button>
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
