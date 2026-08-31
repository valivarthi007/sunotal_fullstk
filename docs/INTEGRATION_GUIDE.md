# Third-Party Integration Guide: Google Maps API & Razorpay UPI API

This guide explains how to enable production / live integrations for **Google Maps API** and **Razorpay UPI API** in the Sunotal Farms application.

---

## 1. Google Maps API Integration

### Prerequisites
1. A Google Cloud Platform (GCP) Account with an active billing profile.
2. An API Key generated from the [GCP Console](https://console.cloud.google.com/).

### Enabled APIs Required
In GCP Console -> **APIs & Services** -> **Library**, enable the following services:
- **Maps JavaScript API** (for interactive map view and marker pinning)
- **Geocoding API** (for converting lat/lng coordinates to street addresses)
- **Places API** (for autocomplete location search bar)

### Steps to Include in Codebase

1. **Configure Environment Variables**:
   Add the following line to `frontend/.env`:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualGoogleMapsApiKeyHere
   ```

2. **Script Injection**:
   In `frontend/index.html`, add the Google Maps JS SDK script tag inside the `<head>` section:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=%VITE_GOOGLE_MAPS_API_KEY%&libraries=places"></script>
   ```

3. **Fallback & Robustness**:
   The application components (`InteractiveMapPickerModal.tsx`, `WarehouseManager.tsx`) automatically detect if `VITE_GOOGLE_MAPS_API_KEY` is undefined. When unconfigured, the app falls back to interactive coordinate inputs and OpenStreetMap reverse geocoding to prevent any application workflow crash.

---

## 2. Razorpay UPI & Payment Gateway Integration

### Prerequisites
1. A [Razorpay Merchant Account](https://razorpay.com/).
2. Key ID and Key Secret from **Razorpay Dashboard -> Settings -> API Keys**.

### Steps to Include in Codebase

1. **Configure Frontend Environment Variable**:
   Add your Razorpay Key ID to `frontend/.env`:
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
   ```

2. **Load Razorpay Checkout SDK**:
   In `frontend/index.html`, include the Razorpay Checkout script inside `<head>`:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

3. **Backend Order & Webhook Setup**:
   - In your payment microservice, create Razorpay orders using the official `razorpay` npm package:
     ```typescript
     import Razorpay from 'razorpay';

     const instance = new Razorpay({
       key_id: process.env.RAZORPAY_KEY_ID,
       key_secret: process.env.RAZORPAY_KEY_SECRET,
     });

     const order = await instance.orders.create({
       amount: amountInPaise,
       currency: "INR",
       receipt: `receipt_${orderId}`,
     });
     ```
   - Verify Razorpay payment signatures on backend `/api/payments/verify`:
     ```typescript
     import crypto from 'crypto';

     const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
     hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
     const generated_signature = hmac.digest('hex');

     if (generated_signature === razorpay_signature) {
       // Payment confirmed
     }
     ```

4. **Fallback & Demo Mode**:
   When `VITE_RAZORPAY_KEY_ID` is not set, `PaymentGatewayModal.tsx` operates in **Simulated POC Mode**, allowing instant 3D-secure OTP test approvals so testing checkout workflows never fails or crashes.
