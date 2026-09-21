import React from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Filter, RotateCcw, Star, Sparkles, DollarSign, Tag } from "lucide-react";

export interface FilterOptions {
  category: string;
  minPrice: number;
  maxPrice: number;
  isOrganicOnly: boolean;
  minRating: number;
  sortBy: string;
}

interface FilterSidebarProps {
  categories: Array<{ id: number; name: string; icon?: string }>;
  filters: FilterOptions;
  onFilterChange: (newFilters: Partial<FilterOptions>) => void;
  onReset: () => void;
  totalProductsCount: number;
}

export function FilterSidebar({
  categories,
  filters,
  onFilterChange,
  onReset,
  totalProductsCount,
}: FilterSidebarProps) {
  return (
    <aside className="w-full lg:w-72 shrink-0 self-start sticky top-20 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Filter & Sort</h3>
            <p className="text-xs text-muted-foreground">{totalProductsCount} Products Available</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-emerald-600" /> Category
        </Label>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-sm">
          <div
            onClick={() => onFilterChange({ category: "All" })}
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
              filters.category === "All"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "hover:bg-muted/50 text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📦</span> All Categories
            </span>
            {filters.category === "All" && (
              <Badge variant="secondary" className="bg-emerald-600 text-white text-[10px]">
                Selected
              </Badge>
            )}
          </div>

          {categories.map((cat) => {
            const isSelected = filters.category.toLowerCase() === cat.name.toLowerCase();
            return (
              <div
                key={cat.id}
                onClick={() => onFilterChange({ category: cat.name })}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span>{cat.icon || "📦"}</span> {cat.name}
                </span>
                {isSelected && (
                  <Badge variant="secondary" className="bg-emerald-600 text-white text-[10px]">
                    Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Max Price
          </Label>
          <span className="text-xs font-mono font-bold text-emerald-600">
            Up to ₹{filters.maxPrice}
          </span>
        </div>
        <Slider
          value={[filters.maxPrice]}
          min={10}
          max={1000}
          step={10}
          onValueChange={(val) => onFilterChange({ maxPrice: val[0] })}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>₹10</span>
          <span>₹500</span>
          <span>₹1000</span>
        </div>
      </div>

      {/* Organic Preference Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Organic Certified Only
          </Label>
          <p className="text-[11px] text-muted-foreground">Show 100% organic produce</p>
        </div>
        <Switch
          checked={filters.isOrganicOnly}
          onCheckedChange={(checked) => onFilterChange({ isOrganicOnly: checked })}
        />
      </div>

      {/* Rating Filter */}
      <div className="space-y-3 pt-2 border-t border-border">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" /> Minimum Rating
        </Label>
        <RadioGroup
          value={String(filters.minRating)}
          onValueChange={(val) => onFilterChange({ minRating: Number(val) })}
          className="space-y-1.5"
        >
          {[
            { label: "All Ratings", value: "0" },
            { label: "4.5★ & above", value: "4.5" },
            { label: "4.0★ & above", value: "4.0" },
            { label: "3.5★ & above", value: "3.5" },
          ].map((r) => (
            <div key={r.value} className="flex items-center space-x-2">
              <RadioGroupItem value={r.value} id={`rating-${r.value}`} />
              <Label htmlFor={`rating-${r.value}`} className="text-xs font-medium cursor-pointer">
                {r.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sort Options */}
      <div className="space-y-3 pt-2 border-t border-border">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Sort By
        </Label>
        <RadioGroup
          value={filters.sortBy}
          onValueChange={(val) => onFilterChange({ sortBy: val })}
          className="space-y-1.5"
        >
          {[
            { label: "Relevance & Popularity", value: "default" },
            { label: "Price: Low to High", value: "price-low" },
            { label: "Price: High to Low", value: "price-high" },
            { label: "Top Rated", value: "rating" },
          ].map((s) => (
            <div key={s.value} className="flex items-center space-x-2">
              <RadioGroupItem value={s.value} id={`sort-${s.value}`} />
              <Label htmlFor={`sort-${s.value}`} className="text-xs font-medium cursor-pointer">
                {s.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </aside>
  );
}
