/**
 * Dynamic Geoapify Maps SDK & Geocoding Service Loader
 * Supports workflow injection via VITE_GEOAPIFY_API_KEY environment variable.
 */

const DEFAULT_GEOAPIFY_KEY = "";

export function getGeoapifyApiKey(): string {
  return (
    import.meta.env.VITE_GEOAPIFY_API_KEY ||
    (typeof window !== "undefined" && (window as any).__GEOAPIFY_API_KEY__) ||
    DEFAULT_GEOAPIFY_KEY
  );
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically ensures Geoapify map layer resources / Leaflet assets are available.
 */
export function loadGeoapifySdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).L) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve) => {
    // 1. Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet JS
    if (document.getElementById("leaflet-js")) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.warn("Failed to load Leaflet JS script");
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface GeoapifyGeocodeResult {
  houseNo?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formattedAddress?: string;
}

/**
 * Reverse Geocodes lat & lng coordinates using Geoapify REST API
 * with automatic environment key injection and GeoJSON parsing.
 */
export async function reverseGeocodeGeoapify(
  lat: number,
  lng: number
): Promise<GeoapifyGeocodeResult | null> {
  const apiKey = getGeoapifyApiKey();

  if (apiKey) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geoapify API HTTP status ${res.status}`);

      const data = await res.json();
      const feature = data.features && data.features[0] ? data.features[0] : null;

      if (feature && feature.properties) {
        const props = feature.properties;

        const houseNo = props.housenumber || props.building || props.house_number || "";
        const street = props.street || props.road || props.suburb || props.district || "";
        const landmark = props.name || props.poi || props.suburb || "";
        const city = props.city || props.town || props.county || props.state_district || "";
        const state = props.state || "";
        const pincode = props.postcode || props.pincode || "";
        const formattedAddress =
          props.formatted ||
          [houseNo, street, city, state, pincode].filter(Boolean).join(", ");

        return {
          houseNo,
          street,
          landmark,
          city,
          state,
          pincode,
          formattedAddress,
        };
      }
    } catch (err) {
      console.warn("Geoapify reverse geocoding request failed, trying Nominatim fallback:", err);
    }
  }

  // Fallback to OpenStreetMap Nominatim reverse geocoding
  try {
    const fallbackUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const houseNo = addr.house_number || addr.building || "";
        const street = addr.road || addr.suburb || addr.neighbourhood || "";
        const landmark = addr.amenity || addr.shop || addr.suburb || "";
        const city = addr.city || addr.town || addr.village || addr.county || "";
        const state = addr.state || "";
        const pincode = addr.postcode || "";
        const formattedAddress = data.display_name || [houseNo, street, city, state, pincode].filter(Boolean).join(", ");

        return {
          houseNo,
          street,
          landmark,
          city,
          state,
          pincode,
          formattedAddress,
        };
      }
    }
  } catch (fallbackErr) {
    console.warn("Nominatim fallback reverse geocoding failed:", fallbackErr);
  }

  return null;
}

/**
 * Generates tile layer URL for Leaflet / Map rendering using Geoapify Map Tiles API.
 */
export function getGeoapifyTileUrl(style: string = "osm-carto"): string {
  const apiKey = getGeoapifyApiKey();
  if (apiKey) {
    return `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${apiKey}`;
  }
  // Standard OpenStreetMap fallback tiles if no Geoapify key is set
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}

export interface GeoapifySearchResult {
  formatted: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  pincode?: string;
  street?: string;
}

/**
 * Forward Geocoding / Place Search Autocomplete using Geoapify REST API & Nominatim fallback
 */
export async function searchPlaceGeoapify(query: string): Promise<GeoapifySearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const apiKey = getGeoapifyApiKey();

  if (apiKey) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${apiKey}&limit=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features) {
          return data.features.map((f: any) => ({
            formatted: f.properties.formatted || f.properties.name || query,
            lat: f.properties.lat,
            lng: f.properties.lon,
            city: f.properties.city || f.properties.town || "",
            state: f.properties.state || "",
            pincode: f.properties.postcode || "",
            street: f.properties.street || f.properties.road || "",
          }));
        }
      }
    } catch (err) {
      console.warn("Geoapify place search failed, trying Nominatim fallback:", err);
    }
  }

  // Fallback to OpenStreetMap Nominatim search
  try {
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      return data.map((item: any) => ({
        formatted: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
    }
  } catch (err) {
    console.warn("Nominatim search failed:", err);
  }

  return [];
}
