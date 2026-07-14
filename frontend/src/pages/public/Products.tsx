import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/ui/ProductCard";
import { useListProducts, ProductCategory } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface ProductsPageProps {
  initialCategory?: string;
}

export default function ProductsPage({ initialCategory = "All" }: ProductsPageProps) {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);

  // Parse path to category if no initial category is passed but path suggests one
  const pathCategory = location === "/vegetables" ? "Vegetables" :
                       location === "/fruits" ? "Fruits" :
                       location === "/dairy" ? "Dairy" :
                       location === "/dry-fruits" ? "Dry Fruits" :
                       location === "/grains" ? "Grains" :
                       category;

  const currentCategory = initialCategory !== "All" ? initialCategory : pathCategory;

  const { data: products, isLoading } = useListProducts(
    { 
      params: { 
        category: currentCategory !== "All" ? currentCategory : undefined,
        search: search.length > 2 ? search : undefined
      } 
    },
    { query: { queryKey: ["products", currentCategory, search] } }
  );

  const categories = ["All", "Vegetables", "Fruits", "Dairy", "Dry Fruits", "Grains"];

  return (
    <PublicLayout>
      <div className="bg-accent/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-4 tracking-tight">
            {currentCategory === "All" ? "All Fresh Produce" : currentCategory}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Browse our selection of farm-fresh produce, delivered straight to your door.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-card border-border rounded-xl shadow-sm text-base"
            />
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 md:pb-0 hide-scroll">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border",
                  currentCategory === c 
                    ? "bg-secondary text-white border-secondary shadow-sm" 
                    : "bg-card text-secondary hover:border-secondary border-border"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground font-medium">
            {isLoading ? "Loading products..." : `Showing ${products?.length || 0} products`}
          </p>
          <button className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">
            <SlidersHorizontal className="w-4 h-4" /> Filter & Sort
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {isLoading ? (
            Array.from({ length: 15 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products && products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-card rounded-2xl border border-dashed flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-muted-foreground max-w-sm">We couldn't find any products matching your search criteria. Try a different category or search term.</p>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
