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
  if (!url || typeof url !== "string" || url.trim() === "" || url === "/placeholder.jpg") {
    return CATEGORY_FALLBACK_IMAGES[category || "Default"] || CATEGORY_FALLBACK_IMAGES.Default;
  }

  const trimmed = url.trim();

  // If already full HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    // If it's the old unauthenticated direct S3 bucket URL that returns 403 Forbidden, map it to fallback or CloudFront
    if (trimmed.includes("jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com")) {
      const filename = trimmed.split("/").pop() || "";
      // Check if it's one of the seed names like tomatoes.jpg
      if (filename.includes("tomato") || filename.includes("vegetable") || filename.includes("spinach")) {
        return CATEGORY_FALLBACK_IMAGES.Vegetables;
      }
      if (filename.includes("mango") || filename.includes("apple") || filename.includes("fruit")) {
        return CATEGORY_FALLBACK_IMAGES.Fruits;
      }
      if (filename.includes("milk") || filename.includes("dairy")) {
        return CATEGORY_FALLBACK_IMAGES.Dairy;
      }
      if (filename.includes("rice") || filename.includes("grain")) {
        return CATEGORY_FALLBACK_IMAGES.Grains;
      }
      if (filename.includes("cashew") || filename.includes("dry")) {
        return CATEGORY_FALLBACK_IMAGES["Dry Fruits"];
      }
      return `https://d2ncpl9skd2fp0.cloudfront.net/images/${filename}`;
    }
    return trimmed;
  }

  // If domain string without protocol (e.g. d2ncpl9skd2fp0.cloudfront.net/images/...)
  if (trimmed.includes("cloudfront.net") || trimmed.includes("s3.") || trimmed.includes("amazonaws.com")) {
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
