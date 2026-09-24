import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/ui/ProductCard";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Package, Sparkles } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { FilterSidebar, FilterOptions } from "@/components/ui/FilterSidebar";

interface ProductsPageProps {
  initialCategory?: string;
}

const pathToCategory = (path: string) => {
  switch (path) {
    case "/vegetables":
      return "Vegetables";
    case "/fruits":
      return "Fruits";
    case "/dairy":
      return "Dairy";
    case "/dry-fruits":
      return "Dry Fruits";
    case "/grains":
      return "Grains";
    default:
      return "All";
  }
};

const getCategoryFromUrl = () => {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get("category");
    if (cat) return cat;
  }
  return null;
};

export default function ProductsPage({ initialCategory = "All" }: ProductsPageProps) {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const currentCategory = initialCategory !== "All"
    ? initialCategory
    : (getCategoryFromUrl() || pathToCategory(location.split("?")[0]));

  const { data: rawDbCategories } = useListCategories();
  const dbCategories = Array.isArray(rawDbCategories) ? rawDbCategories : [];

  const categories = useMemo(() => {
    const list: Array<{ id: number; name: string; icon?: string }> = [];
    if (Array.isArray(dbCategories)) {
      for (const c of dbCategories) {
        if (c?.name) {
          list.push({ id: c.id || Math.random(), name: c.name, icon: c.icon || "📦" });
        }
      }
    }
    return list;
  }, [dbCategories]);

  // Comprehensive Filter State
  const [filters, setFilters] = useState<FilterOptions>({
    category: currentCategory,
    minPrice: 0,
    maxPrice: 1000,
    isOrganicOnly: false,
    minRating: 0,
    sortBy: "default",
  });

  // Sync state if URL changes
  useEffect(() => {
    const catFromUrl = getCategoryFromUrl();
    if (catFromUrl && catFromUrl.toLowerCase() !== filters.category.toLowerCase()) {
      setFilters((prev) => ({ ...prev, category: catFromUrl }));
    }
  }, [location]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      if (newFilters.category !== undefined) {
        const newUrl = updated.category === "All" ? "/products" : `/products?category=${encodeURIComponent(updated.category)}`;
        window.history.pushState(null, "", newUrl);
      }
      return updated;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      category: "All",
      minPrice: 0,
      maxPrice: 1000,
      isOrganicOnly: false,
      minRating: 0,
      sortBy: "default",
    });
    setSearch("");
    window.history.pushState(null, "", "/products");
  };

  const { data: rawProducts, isLoading } = useListProducts(
    {
      category: filters.category !== "All" ? filters.category : undefined,
      search: search.length > 2 ? search : undefined,
    },
    { query: { queryKey: ["products", filters.category, search] } }
  );

  const displayedProducts = useMemo(() => {
    let list = rawProducts ? [...rawProducts] : [];

    // Explicit Filter by Category
    if (filters.category && filters.category !== "All") {
      list = list.filter(
        (p) => p.category && p.category.toLowerCase().trim() === filters.category.toLowerCase().trim()
      );
    }

    // Filter by Price
    list = list.filter((p) => p.price <= filters.maxPrice);

    // Filter by Organic
    if (filters.isOrganicOnly) {
      list = list.filter((p) => p.organic === true);
    }

    // Filter by Rating
    if (filters.minRating > 0) {
      list = list.filter((p) => ((p as any).rating || 4.5) >= filters.minRating);
    }

    // Sort
    if (filters.sortBy === "price-low") {
      list.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price-high") {
      list.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === "rating") {
      list.sort((a, b) => (((b as any).rating || 0) - ((a as any).rating || 0)));
    }

    return list;
  }, [rawProducts, filters]);

  const productsByCategory = useMemo(() => {
    if (filters.category !== "All" || search.length > 0) return null;
    const groups: Record<string, typeof displayedProducts> = {};
    for (const p of displayedProducts) {
      const cat = p.category || "Produce & Essentials";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [displayedProducts, filters.category, search]);

  return (
    <PublicLayout>
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white py-10 border-b border-emerald-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
                  ⚡ Express 10-Min Delivery
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                {filters.category === "All" ? "Storefront Catalog" : filters.category}
              </h1>
              <p className="text-emerald-100/80 text-sm md:text-base mt-2 max-w-xl">
                Farm-fresh vegetables, organic fruits, daily essential dairy, and cold-pressed oils.
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-emerald-200/60 rounded-xl shadow-inner text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout with Left Sticky Sidebar */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT STICKY SIDEBAR */}
          <FilterSidebar
            categories={categories}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            totalProductsCount={displayedProducts.length}
          />

          {/* RIGHT PRODUCT GRID */}
          <main className="flex-1 w-full space-y-8">
            {/* Grid Header Info */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-foreground">
                  {filters.category === "All" ? "All Categories & Produce" : filters.category}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono">
                  {displayedProducts.length} Items
                </span>
              </div>

              {filters.isOrganicOnly && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5" /> Organic Filter Active
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : productsByCategory && Object.keys(productsByCategory).length > 0 ? (
              /* CATEGORY-WISE GROUPED VIEW */
              <div className="space-y-10">
                {Object.entries(productsByCategory).map(([catName, items]) => (
                  <section key={catName} className="space-y-4">
                    <div className="flex items-center justify-between bg-accent/30 px-4 py-2.5 rounded-2xl border border-border/60">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-foreground">{catName}</h3>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                          {items.length} items
                        </span>
                      </div>
                      <button
                        onClick={() => handleFilterChange({ category: catName })}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        View Category →
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {items.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : displayedProducts && displayedProducts.length > 0 ? (
              /* FLAT GRID VIEW FOR SPECIFIC FILTER */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-card rounded-2xl border border-dashed flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">No matching products</h3>
                <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                  We couldn't find any products matching your current filters or search query.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </PublicLayout>
  );
}

