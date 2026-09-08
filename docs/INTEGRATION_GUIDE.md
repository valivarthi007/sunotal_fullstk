# 🔌 SOLID Strategy Pattern Integration Guide

Guide for extending the application with production Payment Gateways (Razorpay, Stripe, PhonePe) and Map Providers (Google Maps, Mapbox) using SOLID principles.

---

## 1. How to Add a Live Payment Gateway (e.g. Production Razorpay)

### Step 1: Create Provider Class
Create `frontend/src/lib/providers/payment/razorpay-payment.provider.ts`:
```typescript
import { IPaymentProvider, PaymentRequest, PaymentResponse } from "./payment-provider.interface";

export class RazorpayPaymentProvider implements IPaymentProvider {
  readonly id = "razorpay";
  readonly name = "Razorpay Production Gateway";

  async initialize(): Promise<boolean> {
    // Load Razorpay Checkout SDK dynamically
    return true;
  }

  getSupportedMethods() {
    return ["upi_qr", "upi_vpa", "card", "netbanking"];
  }

  async processPayment(req: PaymentRequest): Promise<PaymentResponse> {
    // Call Razorpay Standard Checkout SDK
    return {
      success: true,
      paymentId: "PAY-RZP-LIVE-12345",
      method: req.method,
      amount: req.amount,
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(paymentId: string, orderId: number): Promise<boolean> {
    return true;
  }
}
```

### Step 2: Register in Factory
In `frontend/src/lib/providers/payment/payment-provider.factory.ts`:
```typescript
case "razorpay":
  currentProvider = new RazorpayPaymentProvider();
  break;
```

### Step 3: Configure Environment
Set `VITE_PAYMENT_PROVIDER=razorpay` in `.env`.
**Zero changes are required in `PaymentGatewayModal.tsx` or any UI component!**

---

## 2. How to Add a Live Map Provider (e.g. Google Maps or Mapbox)

### Step 1: Create Provider Class
Create `frontend/src/lib/providers/map/google-maps.provider.ts` implementing `IMapProvider`.

### Step 2: Register in Factory
In `frontend/src/lib/providers/map/map-provider.factory.ts`:
```typescript
case "google":
  currentMapProvider = new GoogleMapsProvider();
  break;
```

### Step 3: Configure Environment
Set `VITE_MAP_PROVIDER=google` in `.env`.
**Zero changes are required in `InteractiveMapPickerModal.tsx` or `LiveDeliveryMapTracker.tsx`!**
