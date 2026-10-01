import { customFetch } from "./custom-fetch";

export interface UserAddressApi {
  id: number;
  userId: number;
  tag: "home" | "work" | "office" | "other";
  houseNo: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
}

export interface DeliverySlotApi {
  id: string;
  name: string;
  price: number;
  tag: string;
  description: string;
}

export interface LiveTrackingTelemetry {
  orderId: string;
  status: string;
  warehouseOrigin: {
    name: string;
    lat: number;
    lng: number;
  };
  customerDestination: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  driverLocation: {
    lat: number;
    lng: number;
    speedKmh: number;
    heading: number;
  };
  etaMinutes: number;
  remainingDistanceKm: number;
  driverProfile: {
    name: string;
    phone: string;
    vehicleNo: string;
    rating: number;
    deliveriesCompleted: number;
    photo: string;
  };
  routePolyline: [number, number][];
}

export async function fetchUserAddresses(): Promise<UserAddressApi[]> {
  return customFetch<UserAddressApi[]>("/api/user/addresses");
}

export async function saveUserAddress(payload: Partial<UserAddressApi>): Promise<UserAddressApi> {
  return customFetch<UserAddressApi>("/api/user/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteUserAddress(id: number): Promise<{ success: boolean }> {
  return customFetch<{ success: boolean }>(`/api/user/addresses/${id}`, {
    method: "DELETE",
  });
}

export async function fetchDeliverySlots(): Promise<DeliverySlotApi[]> {
  try {
    return await customFetch<DeliverySlotApi[]>("/api/delivery/slots");
  } catch (err) {
    console.warn("Delivery slots endpoint warning, using standard express slots:", err);
    return [
      { id: "express_2hr", name: "Express 2-Hour Delivery", description: "Delivered within 2 hours", price: 29, isAvailable: true },
      { id: "morning_slot", name: "Tomorrow Morning (6 AM - 9 AM)", description: "Fresh morning slot", price: 0, isAvailable: true },
      { id: "evening_slot", name: "Tomorrow Evening (5 PM - 8 PM)", description: "Convenient evening slot", price: 15, isAvailable: true },
    ];
  }
}

export async function fetchLiveTrackingTelemetry(orderId: string): Promise<LiveTrackingTelemetry> {
  return customFetch<LiveTrackingTelemetry>(`/api/delivery/track/${orderId}`);
}

export interface DynamicEtaMetrics {
  success: boolean;
  darkStore: { id: number; name: string };
  distanceKm: number;
  etaMinutes: number;
  prepMins: number;
  transitMins: number;
  expressEligible: boolean;
  guaranteeText: string;
}

export async function fetchDynamicEta(lat?: number, lng?: number, itemCount: number = 1): Promise<DynamicEtaMetrics> {
  const params = new URLSearchParams();
  if (lat) params.append("lat", String(lat));
  if (lng) params.append("lng", String(lng));
  params.append("itemCount", String(itemCount));

  return customFetch<DynamicEtaMetrics>(`/api/eta/calculate?${params.toString()}`);
}
