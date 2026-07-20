import { Product } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Leaf, Check, MapPin } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const handleAddToCart = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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
      </div>

      {product.discountPercentage > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="bg-red-100 text-red-700 border-transparent hover:bg-red-100 font-bold px-2 py-0.5 shadow-sm">
            {product.discountPercentage}% OFF
          </Badge>
        </div>
      )}

      <div className="aspect-square overflow-hidden bg-muted/30">
        <img
          src={product.image || "/placeholder.jpg"}
          alt={product.name}
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

      {/* Add to Cart — always visible on mobile, hover on desktop */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 ease-out">
        <Button
          className={`w-full shadow-lg gap-2 font-semibold transition-all ${added ? "bg-green-600 hover:bg-green-700" : ""}`}
          onClick={handleAddToCart}
        >
          {added ? (
            <><Check className="w-4 h-4" /> Added!</>
          ) : (
            <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
          )}
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
