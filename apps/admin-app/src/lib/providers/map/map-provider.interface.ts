/**
 * IMapProvider - SOLID Strategy Pattern Interface for Mapping & Geocoding Engine
 * High-level UI components (InteractiveMapPickerModal, LiveDeliveryMapTracker, location-context)
 * consume this interface via map-provider.factory.ts
 */

export interface GeocodeResult {
  houseNo?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
}

export interface IMapProvider {
  readonly id: string;
  readonly name: string;
  loadSdk(): Promise<boolean>;
  getTileUrl(style?: string): string;
  getTileAttribution(): string;
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null>;
  searchPlaces(query: string): Promise<GeocodeResult[]>;
}
