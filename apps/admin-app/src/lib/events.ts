/**
 * Sunotal Cross-Tab & Cross-Module Realtime Event Bus
 * Synchronizes Order status changes, inventory deductions, and delivery state across portals.
 */

export function notifyOrderStatusChanged(orderId?: string, status?: string) {
  if (typeof window === "undefined") return;

  // Broadcast standard browser storage event
  window.dispatchEvent(new Event("storage"));

  // Broadcast custom order status change event
  window.dispatchEvent(
    new CustomEvent("order-status-changed", {
      detail: { orderId, status, timestamp: Date.now() },
    })
  );

  // Broadcast custom order placed event
  window.dispatchEvent(
    new CustomEvent("sunotal-order-placed", {
      detail: { orderId, timestamp: Date.now() },
    })
  );
}
