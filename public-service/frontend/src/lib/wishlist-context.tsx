import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from "react";
import type { Product } from "@workspace/api-client-react";
import { useCart } from "./cart-context";

interface WishlistContextValue {
  wishlistItems: Product[];
  toggleWishlist: (product: Product) => Promise<boolean>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: number | string) => Promise<void>;
  isInWishlist: (productId: number | string) => boolean;
  clearWishlist: () => void;
  moveAllToCart: () => void;
  totalWishlistItems: number;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const WISHLIST_STORAGE_KEY = "sunotal_wishlist_items";

function loadWishlistFromStorage(): Product[] {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishlistToStorage(items: Product[]) {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota fallback
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<Product[]>(() => loadWishlistFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const { addItem: addToCart } = useCart();

  // Get current user id from JWT token if available
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("sunotal_token") : null;
  const userId = useMemo(() => {
    if (!token) return "guest";
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        return String(payload.id || payload.userId || payload.sub || "guest");
      }
    } catch {}
    return "guest";
  }, [token]);

  // Sync with API on mount or when userId changes
  useEffect(() => {
    let isSubscribed = true;

    async function fetchServerWishlist() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/wishlists/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch wishlist");
        const data = await res.json();
        if (data.success && Array.isArray(data.wishlist) && isSubscribed) {
          setWishlistItems(data.wishlist);
          saveWishlistToStorage(data.wishlist);
        }
      } catch {
        // Fallback to local storage if API request fails
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    fetchServerWishlist();

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  // Always update local storage when items change
  useEffect(() => {
    saveWishlistToStorage(wishlistItems);
  }, [wishlistItems]);

  const isInWishlist = useCallback(
    (productId: number | string) => {
      const targetId = String(productId);
      return wishlistItems.some((item) => String(item.id) === targetId);
    },
    [wishlistItems]
  );

  const toggleWishlist = useCallback(
    async (product: Product): Promise<boolean> => {
      const targetId = String(product.id);
      const currentlyWishlisted = wishlistItems.some((item) => String(item.id) === targetId);

      let updatedList: Product[];
      if (currentlyWishlisted) {
        updatedList = wishlistItems.filter((item) => String(item.id) !== targetId);
      } else {
        updatedList = [product, ...wishlistItems.filter((item) => String(item.id) !== targetId)];
      }

      setWishlistItems(updatedList);
      saveWishlistToStorage(updatedList);

      // Trigger backend async sync
      try {
        await fetch("/api/wishlists/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, productId: product.id }),
        });
      } catch (e) {
        console.warn("Async wishlist API toggle failed, fallback to local state.");
      }

      return !currentlyWishlisted;
    },
    [wishlistItems, userId]
  );

  const addToWishlist = useCallback(
    async (product: Product) => {
      const targetId = String(product.id);
      if (wishlistItems.some((item) => String(item.id) === targetId)) return;

      const updatedList = [product, ...wishlistItems];
      setWishlistItems(updatedList);
      saveWishlistToStorage(updatedList);

      try {
        await fetch("/api/wishlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, productId: product.id }),
        });
      } catch {}
    },
    [wishlistItems, userId]
  );

  const removeFromWishlist = useCallback(
    async (productId: number | string) => {
      const targetId = String(productId);
      const updatedList = wishlistItems.filter((item) => String(item.id) !== targetId);
      setWishlistItems(updatedList);
      saveWishlistToStorage(updatedList);

      try {
        await fetch(`/api/wishlists/${userId}/${productId}`, {
          method: "DELETE",
        });
      } catch {}
    },
    [wishlistItems, userId]
  );

  const clearWishlist = useCallback(() => {
    setWishlistItems([]);
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
  }, []);

  const moveAllToCart = useCallback(() => {
    wishlistItems.forEach((product) => {
      addToCart(product);
    });
  }, [wishlistItems, addToCart]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        moveAllToCart,
        totalWishlistItems: wishlistItems.length,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
