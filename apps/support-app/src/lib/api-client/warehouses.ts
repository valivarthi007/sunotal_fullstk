import { customFetch } from "./custom-fetch";

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  freeDeliveryRadiusKm: number;
  baseDeliveryFee: number;
  perKmRate: number;
  maxServiceRadiusKm: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryFeeCalculation {
  distanceKm: number;
  deliveryFee: number;
  isFree: boolean;
  isServiceable?: boolean;
  freeRadiusKm: number;
  maxServiceRadiusKm?: number;
  warehouseName: string;
  warehouseCity: string;
  estimatedHours: string;
  message?: string;
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  return customFetch<Warehouse[]>("/api/warehouses");
}

export async function createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
  return customFetch<Warehouse>("/api/admin/warehouses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse> {
  return customFetch<Warehouse>(`/api/admin/warehouses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function calculateDeliveryFee(payload: { lat?: number; lng?: number; city?: string }): Promise<DeliveryFeeCalculation> {
  return customFetch<DeliveryFeeCalculation>("/api/delivery/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
