import { IMapProvider, GeocodeResult } from "./map-provider.interface";

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * CartoDBVoyagerMapProvider - High-DPI Crisp Vector-Style Tile Map Provider
 * Uses CartoDB Voyager tile servers & Nominatim REST API.
 * Zero API Key requirement, ultra-clean Google/Uber-like aesthetic for grocery delivery.
 */
export class CartoDBVoyagerMapProvider implements IMapProvider {
  readonly id = "cartodb-voyager";
  readonly name = "CartoDB Voyager High-DPI Engine";

  loadSdk(): Promise<boolean> {
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
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn("Failed to load Leaflet script");
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return scriptLoadingPromise;
  }

  getTileUrl(_style?: string): string {
    // Google Maps Vector-Style Clean Tile Layer
    return "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  }

  getTileAttribution(): string {
    return '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>';
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    const fallbackResult: GeocodeResult = {
      houseNo: "",
      street: "Central Avenue",
      landmark: "",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      formattedAddress: "Bengaluru, Karnataka, India",
      lat,
      lng,
    };

    if (Date.now() < nominatimBlockedUntil) {
      return fallbackResult;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { "User-Agent": "SunotalGroceryApp/1.0" } }).catch(() => null);
      
      if (!res || !res.ok) {
        if (res?.status === 429) {
          nominatimBlockedUntil = Date.now() + 60000;
        }
        return fallbackResult;
      }

      const data = await res.json().catch(() => null);
      if (data && data.address) {
        const addr = data.address;
        const houseNo = addr.house_number || addr.building || "";
        const street = addr.road || addr.suburb || addr.neighbourhood || addr.residential || "";
        const landmark = addr.amenity || addr.shop || addr.suburb || "";
        const city = addr.city || addr.town || addr.village || addr.county || "Bengaluru";
        const state = addr.state || "Karnataka";
        const pincode = addr.postcode || "";
        const formattedAddress =
          data.display_name || [houseNo, street, city, state, pincode].filter(Boolean).join(", ");

        const result: GeocodeResult = {
          houseNo,
          street,
          landmark,
          city,
          state,
          pincode,
          formattedAddress,
          lat,
          lng,
        };

        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch {
      nominatimBlockedUntil = Date.now() + 60000;
    }
    return fallbackResult;
  }

  async searchPlaces(query: string): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 2) return [];
    if (Date.now() < nominatimBlockedUntil) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5`;
      const res = await fetch(url, { headers: { "User-Agent": "SunotalGroceryApp/1.0" } }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            formattedAddress: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            city: item.address?.city || item.address?.town || "",
            state: item.address?.state || "",
            pincode: item.address?.postcode || "",
          }));
        }
      } else if (res?.status === 429) {
        nominatimBlockedUntil = Date.now() + 60000;
      }
    } catch {
      nominatimBlockedUntil = Date.now() + 60000;
    }

    return [];
  }
}
