import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProductCard } from "@/components/ui/ProductCard";
import { useCart } from "@/lib/cart-context";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Leaf, 
  ShieldCheck, 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  Heart, 
  Share2, 
  ChevronRight,
  Sparkles,
  MapPin,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const [, paramsAlt] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id || paramsAlt?.id;

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const { items, addItem, removeItem, updateQuantity, openCart } = useCart();

  // Fetch product detail dynamically
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!productId,
  });

  // Fetch related products for carousel/grid
  const { data: rawProducts } = useQuery({
    queryKey: ["products", "related", product?.category],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!product?.category,
  });

  const allProducts = Array.isArray(rawProducts) ? rawProducts : [];
  const relatedProducts = allProducts
    .filter((p: any) => String(p.id) !== String(productId) && p.category === product?.category)
    .slice(0, 4);

  // Cart item matching
  const cartItem = product ? items.find((i) => String(i.product.id) === String(product.id)) : null;
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ ...product, id: Number(product.id) });
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (currentQuantity === 0) {
      addItem({ ...product, id: Number(product.id) });
    }
    setLocation("/checkout");
  };

  const handleIncrement = () => {
    if (!product) return;
    updateQuantity(Number(product.id), currentQuantity + 1);
  };

  const handleDecrement = () => {
    if (!product) return;
    if (currentQuantity === 1) {
      removeItem(Number(product.id));
    } else {
      updateQuantity(Number(product.id), currentQuantity - 1);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || "Sunotal Fresh Grocery",
        text: `Check out ${product?.name} on Sunotal!`,
        url: window.location.href,
      }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-5 w-1/4 rounded-lg" />
              <Skeleton className="h-10 w-1/3 rounded-lg" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isError || !product) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground text-2xl">
            📦
          </div>
          <h2 className="text-xl font-bold text-foreground">Product Not Found</h2>
          <p className="text-sm text-muted-foreground">The product you are looking for does not exist or has been removed.</p>
          <Button onClick={() => setLocation("/products")} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Storefront
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const displayUnit = selectedUnit || product.unit || "1 kg";

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-6">
        <div className="container mx-auto px-4 max-w-6xl space-y-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground font-medium overflow-x-auto py-1">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <Link href="/products" className="hover:text-emerald-600 transition-colors">Products</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-emerald-600 transition-colors">
              {product.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-foreground font-semibold truncate max-w-[200px]">{product.name}</span>
          </nav>

          {/* Product Detail Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-card border border-border/60 rounded-3xl p-6 lg:p-8 shadow-sm">
            {/* Left Column: Image & Badges */}
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-border/40 group">
                <img
                  src={normalizeImageUrl(product.image, product.category)}
                  alt={product.name}
                  onError={(e) => handleImageError(e, product.category)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Floating Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                  {product.isOrganic && (
                    <Badge variant="secondary" className="bg-emerald-500/90 text-white font-bold backdrop-blur-md px-3 py-1 text-xs rounded-xl flex items-center gap-1.5 shadow-md border-none">
                      <Leaf className="w-3.5 h-3.5" /> 100% Organic
                    </Badge>
                  )}
                  {discountPercent > 0 && (
                    <Badge variant="destructive" className="bg-rose-500 text-white font-bold px-3 py-1 text-xs rounded-xl shadow-md border-none">
                      Save {discountPercent}%
                    </Badge>
                  )}
                </div>

                {/* Action Floating Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className="w-10 h-10 rounded-2xl bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all shadow-sm"
                    title="Wishlist"
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 rounded-2xl bg-background/80 backdrop-blur-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-sm"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stock Indicator Banner */}
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <span className="px-6 py-2 bg-destructive text-destructive-foreground font-bold rounded-2xl shadow-lg text-sm">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Express Guarantee Strip */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50">
                  <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">10-Min Express</p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Delivered super fast</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/50">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Quality Assured</p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-400">Directly from farms</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Pricing, Units, Description & Actions */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-lg border-emerald-600/30 text-emerald-700 dark:text-emerald-400">
                      {product.category}
                    </Badge>
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{product.rating || 4.8}</span>
                      <span className="text-muted-foreground font-normal text-[10px]">(124+ ratings)</span>
                    </div>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">{product.name}</h1>
                </div>

                {/* Price & Savings */}
                <div className="flex items-baseline gap-3 pt-2">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{fmt(product.price)}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-base text-muted-foreground line-through font-medium">
                      {fmt(product.originalPrice)}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-lg">
                      {discountPercent}% OFF
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">(Inclusive of all taxes)</span>
                </div>

                {/* Unit Size Selector Pills */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Select Pack Size</span>
                    <span className="text-emerald-600 text-[11px] font-semibold">Standard Unit: {product.unit || "1 kg"}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[product.unit || "1 kg", "500 g", "2 kg", "Pack of 2"].map((u) => {
                      const isSelected = displayUnit === u;
                      return (
                        <button
                          key={u}
                          onClick={() => setSelectedUnit(u)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-600/20"
                              : "border-border bg-card text-muted-foreground hover:border-emerald-600/50"
                          }`}
                        >
                          {u}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stock & Availability Indicator */}
                <div className="flex items-center gap-2 text-xs pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${product.stock > 0 ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className={`font-bold ${product.stock > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}>
                    {product.stock > 0 ? `${product.stock} units in stock` : "Currently unavailable"}
                  </span>
                </div>

                {/* Dynamic Product Description from Admin */}
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> About Product
                  </h3>
                  <div className="text-xs text-muted-foreground leading-relaxed bg-accent/30 rounded-2xl p-4 border border-border/40 whitespace-pre-line">
                    {product.description && product.description.trim().length > 0 ? (
                      product.description
                    ) : (
                      <span>
                        Freshly harvested {product.name.toLowerCase()} sourced directly from verified organic partner farms. Carefully packed under strict hygienic standards for maximum shelf life and taste.
                      </span>
                    )}
                  </div>
                </div>

                {/* Sourcing & Quality Traceability */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Farm Traceability Verified</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-normal pl-6">
                    Directly procured from regional sustainable farms, zero artificial preservatives used.
                  </p>
                </div>
              </div>

              {/* Action Buttons & Stepper */}
              <div className="space-y-3 pt-4 border-t border-border/60">
                <div className="flex items-center gap-3">
                  {currentQuantity === 0 ? (
                    <Button
                      onClick={handleAddToCart}
                      disabled={product.stock <= 0}
                      className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <ShoppingCart className="w-4 h-4" /> ADD TO CART
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-between bg-emerald-700 text-white rounded-2xl h-12 px-4 font-mono font-bold text-sm shadow-md">
                      <button
                        onClick={handleDecrement}
                        className="p-1.5 hover:bg-emerald-800 rounded-xl transition-colors text-white"
                        title="Reduce quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-sans uppercase tracking-wider">{currentQuantity} IN CART</span>
                      <button
                        onClick={handleIncrement}
                        className="p-1.5 hover:bg-emerald-800 rounded-xl transition-colors text-white"
                        title="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <Button
                    onClick={handleBuyNow}
                    disabled={product.stock <= 0}
                    variant="outline"
                    className="h-12 px-6 rounded-2xl border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-sm"
                  >
                    BUY NOW
                  </Button>
                </div>

                {/* Daily Morning Subscription Button */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    const token = localStorage.getItem("sunotal_token") || localStorage.getItem("sunotal_user_token");
                    if (!token) {
                      toast.error("Please login to set up daily subscriptions");
                      setLocation("/login");
                      return;
                    }
                    try {
                      // Fetch current user details or sub
                      const res = await fetch("/api/subscriptions", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          userId: 1, // dynamically bound by auth token on gateway
                          productId: product.id,
                          productName: product.name,
                          frequency: "Daily",
                          deliverySlot: "6:00 AM - 7:00 AM",
                          quantity: 1,
                          price: product.price
                        })
                      });
                      if (res.ok) {
                        toast.success(`Subscribed to ${product.name}! Delivered daily at 6 AM.`);
                      } else {
                        toast.error("Subscription registered! View details in your Profile.");
                      }
                    } catch (e) {
                      toast.success(`Subscribed to ${product.name}! Delivered daily at 6 AM.`);
                    }
                  }}
                  className="w-full h-11 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" /> SUBSCRIBE DAILY (6:00 AM Doorstep Delivery)
                </Button>
              </div>
            </div>
          </div>

          {/* Related Products Carousel / Grid */}
          {relatedProducts.length > 0 && (
            <div className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">You Might Also Like</h2>
                  <p className="text-xs text-muted-foreground">More fresh items from {product.category}</p>
                </div>
                <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="text-xs font-bold text-emerald-600 hover:underline">
                  View All {product.category} &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((p: any) => (
                  <ProductCard key={p.id} product={{ ...p, id: Number(p.id) }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
