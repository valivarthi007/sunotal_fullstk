import { customFetch } from "./custom-fetch";

export interface SubscriptionApi {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  frequency: "daily" | "alternate" | "weekdays" | "weekends";
  deliverySlot: string;
  quantity: number;
  price: number;
  walletAutoDebit: boolean;
  status: "active" | "paused" | "cancelled";
  createdAt: string;
}

export async function fetchUserSubscriptions(): Promise<SubscriptionApi[]> {
  try {
    const data = await customFetch<{ success: boolean; subscriptions: SubscriptionApi[] }>("/api/subscriptions");
    if (data && Array.isArray(data.subscriptions)) {
      return data.subscriptions;
    }
    return [];
  } catch {
    const stored = localStorage.getItem("sunotal_user_subscriptions");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }
}

export async function createSubscription(payload: {
  productId: number;
  productName: string;
  frequency: string;
  deliverySlot?: string;
  quantity: number;
  price: number;
}): Promise<{ success: boolean; subscription: SubscriptionApi; message: string }> {
  try {
    const res = await customFetch<{ success: boolean; subscription: SubscriptionApi; message: string }>("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Also cache locally for offline support
    const existing = await fetchUserSubscriptions();
    const newSub = res.subscription || {
      id: Date.now(),
      userId: 1,
      productId: payload.productId,
      productName: payload.productName,
      frequency: payload.frequency as any,
      deliverySlot: payload.deliverySlot || "6:00 AM - 7:30 AM",
      quantity: payload.quantity,
      price: payload.price,
      walletAutoDebit: true,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const updated = [newSub, ...existing];
    localStorage.setItem("sunotal_user_subscriptions", JSON.stringify(updated));

    return res;
  } catch {
    const newSub: SubscriptionApi = {
      id: Date.now(),
      userId: 1,
      productId: payload.productId,
      productName: payload.productName,
      frequency: payload.frequency as any,
      deliverySlot: payload.deliverySlot || "6:00 AM - 7:30 AM",
      quantity: payload.quantity,
      price: payload.price,
      walletAutoDebit: true,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const stored = localStorage.getItem("sunotal_user_subscriptions");
    let existing: SubscriptionApi[] = [];
    if (stored) {
      try { existing = JSON.parse(stored); } catch {}
    }
    const updated = [newSub, ...existing];
    localStorage.setItem("sunotal_user_subscriptions", JSON.stringify(updated));

    return {
      success: true,
      subscription: newSub,
      message: `Subscribed to ${payload.productName} (${payload.frequency})!`,
    };
  }
}

export async function toggleSubscriptionStatus(id: number, status: "active" | "paused"): Promise<boolean> {
  try {
    await customFetch(`/api/subscriptions/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch {
    // local fallback
  }

  const stored = localStorage.getItem("sunotal_user_subscriptions");
  if (stored) {
    try {
      const existing: SubscriptionApi[] = JSON.parse(stored);
      const updated = existing.map((s) => (s.id === id ? { ...s, status } : s));
      localStorage.setItem("sunotal_user_subscriptions", JSON.stringify(updated));
    } catch {}
  }
  return true;
}

export async function cancelSubscription(id: number): Promise<boolean> {
  try {
    await customFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
  } catch {
    // local fallback
  }

  const stored = localStorage.getItem("sunotal_user_subscriptions");
  if (stored) {
    try {
      const existing: SubscriptionApi[] = JSON.parse(stored);
      const updated = existing.filter((s) => s.id !== id);
      localStorage.setItem("sunotal_user_subscriptions", JSON.stringify(updated));
    } catch {}
  }
  return true;
}
