import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGeoapifyApiKey,
  getGeoapifyTileUrl,
  reverseGeocodeGeoapify,
  loadGeoapifySdk,
} from "./geoapify-sdk";

describe("Geoapify SDK Integration Module", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retrieves the configured Geoapify API Key or returns empty default string", () => {
    const key = getGeoapifyApiKey();
    expect(typeof key).toBe("string");
  });

  it("generates correct Geoapify Tile URL when style is provided", () => {
    const tileUrl = getGeoapifyTileUrl("osm-carto");
    expect(tileUrl).toContain("tile/osm-carto/{z}/{x}/{y}.png");
  });

  it("loadGeoapifySdk resolves to true in web browser environment", async () => {
    const loaded = await loadGeoapifySdk();
    expect(loaded).toBe(true);
  });

  it("reverseGeocodeGeoapify correctly parses GeoJSON feature properties", async () => {
    const mockGeojsonResponse = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            housenumber: "100",
            street: "MG Road",
            name: "Metro Station Landmark",
            city: "Bengaluru",
            state: "Karnataka",
            postcode: "560001",
            formatted: "100, MG Road, Bengaluru, Karnataka 560001, India",
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeojsonResponse,
    } as Response);

    // Mock key if empty
    vi.spyOn(import.meta, "env", "get").mockReturnValue({
      VITE_GEOAPIFY_API_KEY: "test_geoapify_key_123",
    });

    const result = await reverseGeocodeGeoapify(12.9716, 77.5946);

    expect(result).not.toBeNull();
    expect(result?.city).toBe("Bengaluru");
    expect(result?.state).toBe("Karnataka");
    expect(result?.pincode).toBe("560001");
    expect(result?.street).toBe("MG Road");
    expect(result?.houseNo).toBe("100");
    expect(result?.formattedAddress).toContain("MG Road");
  });

  it("reverseGeocodeGeoapify handles network errors gracefully without crashing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const result = await reverseGeocodeGeoapify(12.9716, 77.5946);
    expect(result).toBeNull();
  });
});
