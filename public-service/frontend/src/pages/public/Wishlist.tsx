import { PublicLayout } from "@/components/layout/PublicLayout";
import { useWishlist } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Leaf,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";
import { toast } from "sonner";

export default function Wishlist() {
  const { wishlistItems, removeFromWishlist, clearWishlist, moveAllToCart, totalWishlistItems } = useWishlist();
  const { items: cartItems, addItem: addToCart, updateQuantity, removeItem: removeFromCart } = useCart();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const handleMoveAllToCart = () => {
    if (wishlistItems.length === 0) return;
    moveAllToCart();
    toast.success(`Moved ${wishlistItems.length} items to your cart!`, {
      description: "Ready for quick 10-15 min express delivery checkout.",
    });
  };

  const handleClearWishlist = () => {
    if (wishlistItems.length === 0) return;
    clearWishlist();
    toast.info("Wishlist cleared");
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">My Wishlist</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-inner">
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary tracking-tight">
                  My Wishlist
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Save your favorite organic produce & everyday essentials for quick re-ordering.
                </p>
              </div>
            </div>
          </div>

          {totalWishlistItems > 0 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearWishlist}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border h-10 px-4 rounded-xl gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
              <Button
                onClick={handleMoveAllToCart}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md hover:shadow-lg transition-all gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Move All to Cart ({totalWishlistItems})
              </Button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {totalWishlistItems === 0 ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl border border-dashed border-border shadow-sm my-4 space-y-5">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-10 h-10 text-rose-400" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-bold text-secondary">Your wishlist is currently empty</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Explore our fresh farm produce, organic fruits, daily essentials, and tap the heart icon on any item to save it for later.
              </p>
            </div>
            <Link href="/products">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 px-6 rounded-xl shadow-md gap-2">
                <ShoppingBag className="w-4 h-4" />
                Explore Fresh Products
              </Button>
            </Link>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((product) => {
              const cartItem = cartItems.find((i) => String(i.product.id) === String(product.id));
              const qtyInCart = cartItem ? cartItem.quantity : 0;
              const isOrganic = product.organic ?? product.isOrganic ?? false;
              const stock = product.stock !== undefined ? product.stock : 0;
              const originalPrice = product.originalPrice ?? product.price;
              const discountPercent = originalPrice > product.price 
                ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300"
                >
                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    <Badge variant="default" className="w-fit text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-sm">
                      {product.category}
                    </Badge>
                    {isOrganic && (
                      <Badge variant="secondary" className="w-fit text-[10px] bg-emerald-100 text-emerald-800 border-transparent hover:bg-emerald-100 flex items-center gap-1 uppercase tracking-wider px-2 py-0.5 shadow-sm">
                        <Leaf className="w-3 h-3" /> Organic
                      </Badge>
                    )}
                  </div>

                  {/* Remove Button */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={() => {
                        removeFromWishlist(product.id);
                        toast.info(`Removed ${product.name} from wishlist`);
                      }}
                      className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Image */}
                  <Link href={`/products/${product.id}`} className="aspect-square overflow-hidden bg-muted/20 block relative group cursor-pointer">
                    <img
                      src={normalizeImageUrl(product.image, product.category)}
                      alt={product.name}
                      onError={(e) => handleImageError(e, product.category)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {discountPercent > 0 && (
                      <div className="absolute bottom-2 left-2 bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        -{discountPercent}% OFF
                      </div>
                    )}
                  </Link>

                  {/* Content & Actions */}
                  <div className="flex flex-1 flex-col p-4 space-y-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">{product.unit || "1 kg"}</p>
                      <Link href={`/products/${product.id}`}>
                        <h3 className="font-bold text-secondary text-sm line-clamp-2 hover:text-emerald-600 transition-colors cursor-pointer">
                          {product.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="flex items-baseline justify-between mt-auto pt-2">
                      <div>
                        <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                          {fmt(product.price)}
                        </span>
                        {originalPrice > product.price && (
                          <span className="text-xs text-muted-foreground line-through ml-1.5 font-mono">
                            {fmt(originalPrice)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ⚡ Express 10m
                      </span>
                    </div>

                    {/* Cart Buttons */}
                    <div className="pt-2">
                      {qtyInCart > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl p-1">
                          <button
                            onClick={() => {
                              if (qtyInCart === 1) {
                                removeFromCart(Number(product.id));
                              } else {
                                updateQuantity(Number(product.id), qtyInCart - 1);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-sm text-emerald-900 dark:text-emerald-100 px-3">
                            {qtyInCart} in Cart
                          </span>
                          <button
                            onClick={() => updateQuantity(Number(product.id), qtyInCart + 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-600 shadow-sm flex items-center justify-center text-white hover:bg-emerald-700 font-bold transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            addToCart(product);
                            toast.success(`Added ${product.name} to cart`);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-sm gap-2"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
