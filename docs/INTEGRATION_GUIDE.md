# Third-Party Integration Guide: Geoapify API & Razorpay UPI API

This guide explains how to enable production / live integrations for **Geoapify Maps & Reverse Geocoding API** and **Razorpay UPI API** in the Sunotal Farms application.

---

## 1. Geoapify API Integration

### Prerequisites
1. A [Geoapify Developer Account](https://myprojects.geoapify.com/).
2. An API Key generated from the Geoapify MyProjects Dashboard.

### Enabled APIs Required
In your Geoapify Project Dashboard, ensure the following API services are enabled:
- **Map Tiles API** (for interactive map tiles and marker pinning)
- **Reverse Geocoding REST API** (`https://api.geoapify.com/v1/geocode/reverse`)
- **Address Autocomplete API** (optional for enhanced address search)

### Steps to Include in Codebase / Workflow

1. **Configure Environment Variables**:
   Add the following line to `frontend/.env` (or pass dynamically as a secret/build variable during workflow runs):
   ```env
   VITE_GEOAPIFY_API_KEY=your_geoapify_api_key_here
   ```

2. **Script Injection & Dynamic SDK Loading**:
   In `frontend/src/lib/geoapify-sdk.ts`, Geoapify map tile URLs and reverse geocoding queries are loaded:
   ```ts
   https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}
   ```

3. **Workflow Environment Injection**:
   During workflow execution (e.g., CI/CD pipeline, Docker build, GitHub Actions), `VITE_GEOAPIFY_API_KEY` is dynamically read by `frontend/src/lib/geoapify-sdk.ts`.

4. **Fallback & Robustness**:
   The application components (`InteractiveMapPickerModal.tsx`, `location-context.tsx`) automatically detect if `VITE_GEOAPIFY_API_KEY` is present. If unconfigured or offline, the app falls back to interactive coordinate inputs and OpenStreetMap reverse geocoding to prevent application crashes.

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
