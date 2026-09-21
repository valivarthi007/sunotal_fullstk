import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, Package, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeImageUrl } from "@/lib/image-utils";
import { useLocation } from "wouter";

interface SearchResultProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
}

export function SearchAutocomplete() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search API call
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/storefront/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setResults(data.products.slice(0, 6));
          setIsOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (productId: string) => {
    setIsOpen(false);
    setQuery("");
    setLocation(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for fresh spinach, mangoes, milk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-9 h-11 bg-card border-border rounded-xl shadow-sm text-sm focus:border-emerald-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Searching fresh catalog...
            </div>
          ) : results.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border flex justify-between">
                <span>Matching Products</span>
                <span className="text-emerald-600">{results.length} Suggestions</span>
              </div>
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelect(product.id)}
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors"
                >
                  <img
                    src={normalizeImageUrl(product.image, product.category)}
                    alt={product.name}
                    className="w-10 h-10 object-cover rounded-lg bg-muted shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">{product.category}</p>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-600">
                    ₹{product.price}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No products found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
