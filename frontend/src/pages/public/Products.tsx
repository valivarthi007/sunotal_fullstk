import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/ui/ProductCard";
import { useListProducts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface ProductsPageProps {
  initialCategory?: string;
}

const categoryToPath = (category: string) => {
  switch (category) {
    case "Vegetables":
      return "/vegetables";
    case "Fruits":
      return "/fruits";
    case "Dairy":
      return "/dairy";
    case "Dry Fruits":
      return "/dry-fruits";
    case "Grains":
      return "/grains";
    default:
      return "/products";
  }
};

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

export default function ProductsPage({ initialCategory = "All" }: ProductsPageProps) {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const currentCategory = initialCategory !== "All" ? initialCategory : pathToCategory(location.split("?")[0]);

  const categories = ["All", "Vegetables", "Fruits", "Dairy", "Dry Fruits", "Grains"];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance'|'price_asc'|'price_desc'|'newest'>('relevance');

  const { data: products, isLoading } = useListProducts(
    {
      category: currentCategory !== "All" ? currentCategory : undefined,
      search: search.length > 2 ? search : undefined,
      organic: onlyOrganic || undefined,
      sort: sortBy === 'relevance' ? undefined : sortBy,
    },
    { query: { queryKey: ["products", currentCategory, search, onlyOrganic, sortBy] } }
  );

  const displayedProducts = products ?? [];

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
                onClick={() => setLocation(categoryToPath(c))}
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
            {isLoading ? "Loading products..." : `Showing ${displayedProducts.length || 0} products`}
          </p>
          <button className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-accent" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" /> Filter & Sort
          </button>
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter & Sort</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={onlyOrganic} onCheckedChange={(v: any) => setOnlyOrganic(Boolean(v))} />
                  <div>
                    <div className="font-semibold">Organic only</div>
                    <div className="text-sm text-muted-foreground">Show only organic products</div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-2">Sort by</div>
                  <div className="flex flex-col gap-2">
                    <label className={cn('p-2 rounded-lg border', sortBy==='relevance' ? 'bg-secondary text-white' : 'bg-card')}> 
                      <input type="radio" name="sort" value="relevance" checked={sortBy==='relevance'} onChange={() => setSortBy('relevance')} /> {' '} Relevance
                    </label>
                    <label className={cn('p-2 rounded-lg border', sortBy==='newest' ? 'bg-secondary text-white' : 'bg-card')}> 
                      <input type="radio" name="sort" value="newest" checked={sortBy==='newest'} onChange={() => setSortBy('newest')} /> {' '} Newest
                    </label>
                    <label className={cn('p-2 rounded-lg border', sortBy==='price_asc' ? 'bg-secondary text-white' : 'bg-card')}> 
                      <input type="radio" name="sort" value="price_asc" checked={sortBy==='price_asc'} onChange={() => setSortBy('price_asc')} /> {' '} Price: Low → High
                    </label>
                    <label className={cn('p-2 rounded-lg border', sortBy==='price_desc' ? 'bg-secondary text-white' : 'bg-card')}> 
                      <input type="radio" name="sort" value="price_desc" checked={sortBy==='price_desc'} onChange={() => setSortBy('price_desc')} /> {' '} Price: High → Low
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {isLoading ? (
            Array.from({ length: 15 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : displayedProducts && displayedProducts.length > 0 ? (
            displayedProducts.map((product) => (
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
