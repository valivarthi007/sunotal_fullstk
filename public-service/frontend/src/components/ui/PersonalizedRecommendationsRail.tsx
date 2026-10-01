import { useState, useEffect } from "react";
import { Sparkles, ShoppingBag, Star, ShieldCheck, ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { normalizeImageUrl } from "@/lib/image-utils";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-client";
import { useLocation } from "wouter";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  unit: string;
  image?: string;
  isOrganic?: boolean;
  rating?: number;
}

export function PersonalizedRecommendationsRail({ title = "Recommended For You", className = "" }: { title?: string; className?: string }) {
  const [, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryTag, setCategoryTag] = useState("Fresh Produce");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const userId = user?.id ? String(user.id) : null;
      if (userId) {
        try {
          const res = await fetch(getApiUrl(`/api/recommendations/personalized?userId=${userId}&limit=6`));
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
              setProducts(data.recommendations);
              if (data.preferredCategory) setCategoryTag(data.preferredCategory);
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch ML recommendations:", e);
        }
      }

      // Catalog fallback for guests / default
      try {
        const res = await fetch(getApiUrl("/api/products"));
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.products || []);
          setProducts(list.slice(0, 6));
        }
      } catch {} finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  const handleAddToCart = (p: Product) => {
    addItem({
      id: Number(p.id) || Math.floor(Math.random() * 10000),
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice || p.price * 1.2,
      unit: p.unit || "kg",
      image: p.image || "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&q=80",
      stock: 25,
      rating: p.rating || 5,
      active: true,
      organic: p.isOrganic ?? true,
      createdAt: new Date().toISOString()
    }, 1);

    toast.success(`Added ${p.name} to cart!`);

    // Log interaction event to ML service
    fetch(getApiUrl("/api/recommendations/interactions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id ? String(user.id) : "guest", productId: String(p.id), actionType: "cart" })
    }).catch(() => {});
  };

  if (loading || products.length === 0) return null;

  return (
    <section className={`py-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white tracking-wider">
                ML AI Powered
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">Personalized based on your produce preferences & ordering history</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setLocation("/products")} className="text-xs text-emerald-600 font-bold gap-1 rounded-xl">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="group bg-card border border-border/80 hover:border-emerald-500/60 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-lg"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-accent/30 mb-2">
              <img
                src={normalizeImageUrl(p.image)}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {p.isOrganic && (
                <span className="absolute top-1.5 left-1.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  ORGANIC
                </span>
              )}
            </div>

            <div className="space-y-1 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block truncate">{p.category}</span>
                <h3 className="font-bold text-xs text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
                  {p.name}
                </h3>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border/40">
                <div>
                  <span className="text-xs font-bold text-foreground">₹{p.price}</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">/ {p.unit}</span>
                </div>
                <Button
                  size="icon"
                  onClick={() => handleAddToCart(p)}
                  className="w-7 h-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
