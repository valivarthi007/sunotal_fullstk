import { customFetch } from "./custom-fetch";

export interface OrderItemApi {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderApi {
  id: number;
  orderNumber: string;
  userId: number;
  totalAmount: number;
  discountAmount: number;
  deliveryFee: number;
  gstAmount: number;
  finalAmount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMethod: "card" | "upi" | "netbanking" | "po";
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  corporateGstin?: string;
  corporatePoRef?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemApi[];
}

export async function fetchUserOrders(): Promise<OrderApi[]> {
  return customFetch<OrderApi[]>("/api/orders");
}

export async function fetchOrderById(id: number): Promise<OrderApi> {
  return customFetch<OrderApi>(`/api/orders/${id}`);
}

export async function createOrderCheckout(payload: {
  items: { productId: number; quantity: number; price?: number }[];
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  deliveryFee?: number;
  corporateGstin?: string;
  corporatePoRef?: string;
  paymentMethod?: string;
}): Promise<{ success: boolean; message: string; order: OrderApi }> {
  return customFetch<{ success: boolean; message: string; order: OrderApi }>("/api/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function cancelUserOrder(id: number): Promise<{ success: boolean; message: string }> {
  return customFetch<{ success: boolean; message: string }>(`/api/orders/${id}/cancel`, {
    method: "POST",
  });
}

export async function updateOrderStatusAdmin(id: number, status: string, paymentStatus?: string): Promise<OrderApi> {
  return customFetch<OrderApi>(`/api/orders/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, paymentStatus }),
  });
}
