/**
 * Dynamic Mappls (MapmyIndia) Web Map SDK & Geocoding Service Loader
 * Supports workflow injection via VITE_MAPPLS_API_KEY environment variable.
 */

const DEFAULT_MAPPLS_KEY = "";

export function getMapplsApiKey(): string {
  return (
    import.meta.env.VITE_MAPPLS_API_KEY ||
    (typeof window !== "undefined" && (window as any).__MAPPLS_API_KEY__) ||
    DEFAULT_MAPPLS_KEY
  );
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically injects the Mappls Web Map JS SDK script tag into document <head>
 * during application execution / workflow running.
 */
export function loadMapplsSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).mappls) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  const apiKey = getMapplsApiKey();

  scriptLoadingPromise = new Promise((resolve) => {
    // Check if script element already exists
    const existingScript = document.querySelector(`script[src*="apis.mappls.com"]`);
    if (existingScript) {
      if ((window as any).mappls) {
        resolve(true);
        return;
      }
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://apis.mappls.com/advancedmaps/v1/${apiKey}/map_load?v=3.0`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("✅ Mappls Map JS SDK loaded successfully");
      resolve(true);
    };
    script.onerror = (err) => {
      console.warn("⚠️ Mappls SDK script injection error:", err);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface MapplsGeocodeResult {
  houseNo?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formattedAddress?: string;
}

/**
 * Reverse Geocodes lat & lng coordinates using Mappls REST API
 * with automatic workflow environment key injection and fallback.
 */
export async function reverseGeocodeMappls(
  lat: number,
  lng: number
): Promise<MapplsGeocodeResult | null> {
  const apiKey = getMapplsApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://apis.mappls.com/advancedmaps/v1/${apiKey}/rev_geocode?lat=${lat}&lng=${lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mappls API HTTP status ${res.status}`);

    const data = await res.json();
    const result = data.results && data.results[0] ? data.results[0] : data;

    if (result) {
      const houseNo = result.houseNumber || result.houseName || "";
      const street = result.street || result.locality || result.subLocality || "";
      const city = result.city || result.district || result.subDistrict || "";
      const state = result.state || "";
      const pincode = result.pincode || result.postCode || "";
      const formattedAddress =
        result.formatted_address ||
        [houseNo, street, city, state, pincode].filter(Boolean).join(", ");

      return {
        houseNo,
        street,
        landmark: result.poi || result.landmark || "",
        city,
        state,
        pincode,
        formattedAddress,
      };
    }
  } catch (err) {
    console.warn("Mappls reverse geocoding request failed:", err);
  }
  return null;
}
