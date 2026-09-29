import { IMapProvider, GeocodeResult } from "./map-provider.interface";
import { getApiUrl } from "@/lib/api-client";

export class MapplsMapProvider implements IMapProvider {
  readonly id = "mappls";
  readonly name = "Mappls MapmyIndia Engine";

  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  async getAccessToken(): Promise<string | null> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    try {
      const res = await fetch(getApiUrl("/api/mappls/token"));
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          this.token = data.access_token;
          this.tokenExpiresAt = Date.now() + 86400 * 1000;
          return this.token;
        }
      }
    } catch (err) {
      console.warn("Mappls token acquisition failed, fallback:", err);
    }
    return import.meta.env.VITE_MAPPLS_SDK_KEY || null;
  }

  async loadSdk(): Promise<boolean> {
    const token = await this.getAccessToken();
    if ((window as any).mappls) return true;

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = token
        ? `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk?v=3.0&layer=vector`
        : "https://apis.mappls.com/advancedmaps/api/default/map_sdk?v=3.0";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  getTileUrl(): string {
    return `https://apis.mappls.com/advancedmaps/v1/${this.token || "default"}/tile/{z}/{x}/{y}.png`;
  }

  getTileAttribution(): string {
    return '&copy; <a href="https://www.mappls.com" target="_blank">Mappls MapmyIndia</a>';
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`https://apis.mappls.com/advancedmaps/v1/${token}/rev_geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) return null;
      const data = await res.json();
      const item = data?.results?.[0];
      if (!item) return null;

      return {
        houseNo: item.houseNumber || "",
        street: item.street || item.subLocality || "",
        landmark: item.locality || "",
        city: item.city || item.district || "",
        state: item.state || "",
        pincode: item.pincode || "",
        formattedAddress: item.formatted_address || `${item.city || ""}, ${item.state || ""}`,
        lat,
        lng
      };
    } catch {
      return null;
    }
  }

  async searchPlaces(query: string): Promise<GeocodeResult[]> {
    const token = await this.getAccessToken();
    if (!token || !query || query.trim().length < 2) return [];

    try {
      const res = await fetch(`https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&region=IND`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();

      return (data?.suggestedLocations || []).map((loc: any) => ({
        houseNo: loc.houseNumber || "",
        street: loc.placeName || loc.placeAddress || "",
        city: loc.city || "",
        state: loc.state || "",
        pincode: loc.pincode || "",
        formattedAddress: loc.placeAddress || loc.placeName,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude)
      }));
    } catch {
      return [];
    }
  }
}
