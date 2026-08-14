/**
 * Image URL normalization and resilient fallback handlers for Sunotal Farms
 */

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Vegetables: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80",
  Fruits: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
  Dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
  Grains: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
  "Dry Fruits": "https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?auto=format&fit=crop&w=600&q=80",
  "Herbs & Spices": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=600&q=80",
  Banners: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  Default: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
};

/**
 * Normalizes any image URL string into a fully qualified HTTPS URL.
 * Handles protocol-less CloudFront domains, direct S3 URLs, data URIs, and local uploads.
 */
export function normalizeImageUrl(url?: string | null, category?: string): string {
  const fallback = CATEGORY_FALLBACK_IMAGES[category || "Default"] || CATEGORY_FALLBACK_IMAGES.Default;

  if (!url || typeof url !== "string" || url.trim() === "" || url === "/placeholder.jpg" || url === "/placeholder.svg") {
    return fallback;
  }

  const trimmed = url.trim();

  // If it's the direct S3 bucket URL that returns 403 Forbidden (due to OAC), map it immediately
  if (trimmed.includes("s3.us-east-1.amazonaws.com") || trimmed.includes("s3.amazonaws.com") || trimmed.includes("jcs-raju-sunotal-final")) {
    const lower = trimmed.toLowerCase();
    if (lower.includes("tomato") || lower.includes("vegetable") || lower.includes("spinach") || lower.includes("onion")) {
      return CATEGORY_FALLBACK_IMAGES.Vegetables;
    }
    if (lower.includes("mango") || lower.includes("apple") || lower.includes("fruit")) {
      return CATEGORY_FALLBACK_IMAGES.Fruits;
    }
    if (lower.includes("milk") || lower.includes("dairy") || lower.includes("butter")) {
      return CATEGORY_FALLBACK_IMAGES.Dairy;
    }
    if (lower.includes("rice") || lower.includes("grain") || lower.includes("wheat")) {
      return CATEGORY_FALLBACK_IMAGES.Grains;
    }
    if (lower.includes("cashew") || lower.includes("dry") || lower.includes("nut")) {
      return CATEGORY_FALLBACK_IMAGES["Dry Fruits"];
    }
    return fallback;
  }

  // If already full HTTP/HTTPS URL or Data URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // If domain string without protocol (e.g. d2ncpl9skd2fp0.cloudfront.net/images/...)
  if (trimmed.includes("cloudfront.net")) {
    return `https://${trimmed}`;
  }

  // Relative path
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Standard onError event handler for <img> elements.
 * Automatically replaces broken URLs with high-quality category placeholders.
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string
) {
  const target = event.currentTarget;
  const fallback = CATEGORY_FALLBACK_IMAGES[category || "Default"] || CATEGORY_FALLBACK_IMAGES.Default;
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
