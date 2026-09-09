# 🔌 Sunotal REST API Reference & Contracts

Complete specification for Storefront, Farmer/Vendor Portal, Admin Control Center, and Delivery Partner endpoints.

**Base Path**: `/api`  
**Authentication Header**: `Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Microservice (`/api/auth`)

### `POST /api/auth/register`
Registers a new customer, vendor, or delivery partner account.
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Ananya Roy",
    "email": "ananya@example.com",
    "password": "SecurePassword123!",
    "phone": "+91 98765 43210",
    "city": "Bengaluru"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 101,
      "name": "Ananya Roy",
      "email": "ananya@example.com",
      "role": "user",
      "active": true,
      "phone": "+91 98765 43210",
      "city": "Bengaluru",
      "createdAt": "2026-09-09T05:00:00.000Z"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user and returns JWT token.
- **Request Body**:
  ```json
  {
    "email": "vendor@sunotal.com",
    "password": "Devops@768"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 18,
      "name": "Sunotal Vendor",
      "email": "vendor@sunotal.com",
      "role": "vendor",
      "active": true,
      "phone": "+91 98765 00003",
      "city": "Bengaluru Sourcing Hub"
    }
  }
  ```

### `GET /api/auth/me`
Retrieves currently authenticated user profile.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`): Returns user object.

---

## 2. Catalog & Products Microservice (`/api/products`, `/api/categories`)

### `GET /api/categories`
Retrieves active grocery categories.
- **Response** (`200 OK`): Array of `{ id, name, icon, createdAt }`.

### `POST /api/admin/categories` (Admin Only)
Adds new grocery category.
- **Request Body**: `{ "name": "Organic Herbs", "icon": "🌿" }`

### `GET /api/product-definitions`
Retrieves standardized product definitions for farmer quotation matching.

### `POST /api/admin/product-definitions` (Admin Only)
Adds standardized produce item definition.

### `GET /api/products`
Retrieves catalog products with unit weights and prices.
- **Query Parameters**: `category` (optional), `search` (optional)
- **Response** (`200 OK`): Array of product objects.

### `POST /api/admin/products` (Admin Only)
Creates or publishes new product to customer storefront catalog.
- **Request Body**:
  ```json
  {
    "name": "Hydroponic Lettuce",
    "category": "Vegetables",
    "unit": "250g",
    "price": 65,
    "originalPrice": 80,
    "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200",
    "organic": true,
    "active": true
  }
  ```

---

## 3. Vendor Sourcing & Invoicing Microservice (`/api/vendors`)

### `POST /api/vendors/register`
Public registration endpoint for local farm suppliers.

### `POST /api/vendors/quotations` (Vendor Only)
Submits harvest produce supply quotation.
- **Headers**: `Authorization: Bearer <VENDOR_TOKEN>`
- **Request Body**:
  ```json
  {
    "category": "Grains",
    "produce": "Sona Masoori Rice",
    "quantity": 50,
    "price": 3500,
    "unit": "Quintal",
    "qualityGrade": "Grade A (Organic)",
    "darkStoreAllocation": "Bengaluru Central Dark Store Hub #104"
  }
  ```

### `GET /api/vendors/quotations` (Vendor Only)
Retrieves vendor's own harvest supply quotations.

### `GET /api/vendors/invoices` (Vendor Only)
Retrieves vendor's own payout invoices.

### `GET /api/vendors/invoices/:id/download`
Streams generated HTML payout invoice document for download or inline viewing.
- **Query Parameter**: `token` (JWT token)

### `GET /api/admin/quotations` (Admin Only)
Lists all submitted vendor quotations across dark store hubs.

### `PUT /api/admin/quotations/:id/status` (Admin Only)
Accepts or rejects vendor quotation and auto-creates inventory stock entries.
- **Request Body**: `{ "status": "accepted" }`

### `POST /api/admin/quotations/:id/invoice` (Admin Only)
Generates GST HTML invoice, uploads to AWS S3, and creates invoice record.

### `PUT /api/admin/quotations/:id/payout` (Admin Only)
Updates vendor payment payout status (`unpaid`, `processing`, `paid`).

---

## 4. Inventory & Dark Store Microservice (`/api/inventory`, `/api/warehouses`)

### `GET /api/warehouses`
Retrieves active Dark Store fulfillment hubs.

### `GET /api/inventory`
Retrieves Dark Store inventory records.
- **Query Parameters**: `warehouseId` (optional), `status` (optional), `search` (optional)

### `POST /api/inventory/deduct`
Deducts stock levels across Dark Stores using FIFO allocation upon customer checkout.
- **Request Body**:
  ```json
  {
    "items": [
      { "productId": 1, "quantity": 2 }
    ]
  }
  ```

---

## 5. Orders & Checkout Microservice (`/api/orders`)

### `POST /api/orders/checkout`
Places persistent order and deducts Dark Store stock.
- **Headers**: `Authorization: Bearer <USER_TOKEN>`
- **Request Body**:
  ```json
  {
    "items": [
      { "productId": 1, "quantity": 2, "price": 45 }
    ],
    "shippingAddress": "Sector 4, HSR Layout",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560102",
    "paymentMethod": "card"
  }
  ```

### `GET /api/orders`
Retrieves customer's persistent order history with items breakdown.

### `GET /api/orders/:id`
Retrieves single order detail.

### `GET /api/orders/:id/track`
Retrieves 10-15 Min Express SLA Order Tracking details.

### `PUT /api/orders/:id/status`
Updates order status (`processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`).

### `POST /api/orders/:id/cancel`
Cancels active order and restores stock to Dark Store inventory.

### `POST /api/orders/:id/rate`
Submits produce quality & delivery rider ratings.

---

## 6. Hyperlocal Delivery Microservice (`/api/delivery`)

### `POST /api/delivery/register`
Delivery rider registration.

### `POST /api/delivery/login`
Delivery rider login.

### `GET /api/delivery/stats` (Delivery Rider Only)
Retrieves rider delivery statistics, total kms run, distance rates, and payout amounts.

### `POST /api/delivery/payout` (Delivery Rider Only)
Submits instant day-out payout request to rider UPI handle.

### `GET /api/delivery/track/:orderId`
Live GPS delivery driver tracking telemetry endpoint.
- **Response** (`200 OK`):
  ```json
  {
    "orderId": "1001",
    "status": "out_for_delivery",
    "warehouseOrigin": {
      "name": "Bengaluru Central Dark Store Hub #104",
      "lat": 12.9352,
      "lng": 77.6245
    },
    "customerDestination": {
      "address": "HSR Layout Sector 3, Bengaluru",
      "city": "Bengaluru",
      "lat": 12.9716,
      "lng": 77.5946
    },
    "driverLocation": {
      "lat": 12.95721,
      "lng": 77.60642,
      "speedKmh": 34,
      "heading": 45
    },
    "etaMinutes": 5,
    "remainingDistanceKm": 1.5,
    "driverProfile": {
      "name": "Ramesh Kumar (EV Partner)",
      "phone": "+91 99089 70908",
      "vehicleNo": "KA-01-EV-8842",
      "rating": 4.9,
      "deliveriesCompleted": 412,
      "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
    },
    "routePolyline": [
      [12.9352, 77.6245],
      [12.95721, 77.60642],
      [12.9716, 77.5946]
    ]
  }
  ```

---

## 7. Admin Financial Ledger & Telemetry Microservice (`/api/admin`)

### `GET /api/admin/ledger` (Admin Only)
Calculates real-time financial collections, UPI vs Card splits, PO receivables, completed settlements, and pending vendor payouts.

### `GET /api/admin/observability` (Admin Only)
Returns system telemetry, process memory usage, AWS infrastructure spend breakdown (EKS, EC2, RDS, S3, Data Transfer), and microservices health status.

### `GET /metrics`
Prometheus metric scrape endpoint for Grafana dashboard integration.
