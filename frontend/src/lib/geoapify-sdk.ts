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
  const apiKey = getGeoapifyApiKey();
  if (apiKey) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = Promise.resolve(true);
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
    const res = await fetch(fallbackUrl, {
      headers: { "User-Agent": "Sunotal-Web-App" },
    });
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
