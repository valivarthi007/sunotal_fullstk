import { IMapProvider } from "./map-provider.interface";
import { CartoDBVoyagerMapProvider } from "./cartodb-map.provider";

let currentMapProvider: IMapProvider | null = null;

/**
 * Map Provider Factory (Dependency Inversion / Factory Pattern)
 * Resolves the configured map provider dynamically based on environment config.
 * To switch to Google Maps or Mapbox in production, set VITE_MAP_PROVIDER=google / mapbox
 * and register the provider implementation here.
 */
export function getMapProvider(): IMapProvider {
  if (currentMapProvider) return currentMapProvider;

  const providerType = import.meta.env.VITE_MAP_PROVIDER || "cartodb";

  switch (providerType.toLowerCase()) {
    case "cartodb":
    default:
      currentMapProvider = new CartoDBVoyagerMapProvider();
      break;
  }

  return currentMapProvider;
}

export function setMapProvider(provider: IMapProvider): void {
  currentMapProvider = provider;
}
