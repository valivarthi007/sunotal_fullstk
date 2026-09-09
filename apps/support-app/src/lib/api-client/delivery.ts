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
  return customFetch<DeliverySlotApi[]>("/api/delivery/slots");
}

export async function fetchLiveTrackingTelemetry(orderId: string): Promise<LiveTrackingTelemetry> {
  return customFetch<LiveTrackingTelemetry>(`/api/delivery/track/${orderId}`);
}
