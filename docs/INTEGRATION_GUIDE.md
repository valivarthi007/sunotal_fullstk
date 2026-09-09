# 🔌 SOLID Strategy Pattern Integration Guide

Developer guide for extending the platform with production Payment Gateways (Razorpay, Stripe, PhonePe, PayU) and Map Providers (Google Maps JS API, Mapbox GL JS, Leaflet) using SOLID strategy pattern principles.

---

## 1. Extending Payment Gateways (`IPaymentProvider`)

High-level UI components (`PaymentGatewayModal.tsx`, `Checkout.tsx`) do NOT depend on specific payment SDKs. They consume the `IPaymentProvider` interface contract.

### Contract Definition (`payment-provider.interface.ts`):
```typescript
export interface PaymentRequest {
  orderId: number;
  amount: number;
  currency: string;
  method: "card" | "upi_qr" | "netbanking" | "cod";
  customerEmail: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  method: string;
  amount: number;
  timestamp: string;
  error?: string;
}

export interface IPaymentProvider {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<boolean>;
  getSupportedMethods(): string[];
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(paymentId: string, orderId: number): Promise<boolean>;
}
```

### Adding a Live Gateway (e.g. Production Razorpay):
1. **Create Provider Class**: Create `frontend/src/lib/providers/payment/razorpay-payment.provider.ts`:
   ```typescript
   import { IPaymentProvider, PaymentRequest, PaymentResponse } from "./payment-provider.interface";

   export class RazorpayPaymentProvider implements IPaymentProvider {
     readonly id = "razorpay";
     readonly name = "Razorpay Gateway";

     async initialize(): Promise<boolean> {
       // Dynamically inject Razorpay checkout SDK script tag
       return true;
     }

     getSupportedMethods() {
       return ["card", "upi_qr", "netbanking"];
     }

     async processPayment(req: PaymentRequest): Promise<PaymentResponse> {
       // Invoke Razorpay Checkout window
       return {
         success: true,
         paymentId: "pay_rzp_live_" + Date.now(),
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

2. **Register in Factory**: In `payment-provider.factory.ts`:
   ```typescript
   case "razorpay":
     currentProvider = new RazorpayPaymentProvider();
     break;
   ```

3. **Configure Environment**: Set `VITE_PAYMENT_PROVIDER=razorpay` in `.env`.  
   *Zero modifications are required in any UI component or checkout page!*

---

## 2. Extending Mapping Engine (`IMapProvider`)

Map components (`InteractiveMapPickerModal.tsx`, `LiveDeliveryMapTracker.tsx`, `DeliveryDashboard.tsx`) consume the `IMapProvider` interface contract.

### Contract Definition (`map-provider.interface.ts`):
```typescript
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IMapProvider {
  readonly id: string;
  readonly name: string;
  loadSdk(): Promise<boolean>;
  getTileUrl(): string;
  getTileAttribution(): string;
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult>;
  searchPlaces(query: string): Promise<GeocodeResult[]>;
}
```

### Adding a Live Map Provider (e.g. Google Maps or Mapbox):
1. **Create Provider Class**: Create `frontend/src/lib/providers/map/google-maps.provider.ts` implementing `IMapProvider`.
2. **Register in Factory**: In `map-provider.factory.ts`:
   ```typescript
   case "google":
     currentMapProvider = new GoogleMapsProvider();
     break;
   ```
3. **Configure Environment**: Set `VITE_MAP_PROVIDER=google` in `.env`.  
   *Zero modifications are required in any map rendering component!*
