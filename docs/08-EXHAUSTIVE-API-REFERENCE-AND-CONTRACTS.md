# Chapter 8: Exhaustive API Reference & REST Contracts Specification

This document provides a comprehensive, exhaustive contract specification for every REST API endpoint exposed by the 4 Sunotal backend microservices (`auth-service`, `operations-service`, `inventory-service`, `user-service`).

---

## 1. Authentication & Security Middleware

All requests requiring authentication must include an HTTP Authorization header formatted as:
`Authorization: Bearer <JWT_TOKEN>`

### Error Code Standard

| Status Code | Reason | Example Payload |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing required payload parameters or validation failure | `{"error": "Invalid request body parameters", "details": [...]}` |
| `401 Unauthorized` | Missing, expired, or malformed JWT token | `{"error": "Unauthorized access - Invalid or missing token"}` |
| `403 Forbidden` | Role authorization level insufficient (e.g. `user` accessing `admin` endpoint) | `{"error": "Forbidden - Admin privilege required"}` |
| `404 Not Found` | Requested resource ID does not exist | `{"error": "Resource not found"}` |
| `500 Internal Error` | Database query failure or unexpected server runtime exception | `{"error": "Internal server error"}` |

---

## 2. Auth Service (`/api/auth`) — Port 5001

### 2.1 User Registration
- **Endpoint**: `POST /api/auth/register`
- **Auth**: Public
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "name": "Raju Valivarthi",
  "email": "raju@sunotal.com",
  "password": "SuperSecretPassword123!",
  "role": "user",
  "phone": "+919876543210",
  "city": "Hyderabad"
}
```
- **Response `201 Created`**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 10,
    "name": "Raju Valivarthi",
    "email": "raju@sunotal.com",
    "role": "user",
    "phone": "+919876543210",
    "city": "Hyderabad",
    "createdAt": "2026-08-28T21:17:08.000Z"
  }
}
```

### 2.2 User Login
- **Endpoint**: `POST /api/auth/login`
- **Auth**: Public
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "email": "admin@sunotal.com",
  "password": "admin123"
}
```
- **Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "System Administrator",
    "email": "admin@sunotal.com",
    "role": "admin",
    "phone": "+919999999999",
    "city": "Bengaluru"
  }
}
```

### 2.3 Current Session Details (`/me`)
- **Endpoint**: `GET /api/auth/me`
- **Auth**: Bearer Token
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response `200 OK`**:
```json
{
  "user": {
    "id": 1,
    "name": "System Administrator",
    "email": "admin@sunotal.com",
    "role": "admin"
  }
}
```

### 2.4 Health Probe
- **Endpoint**: `GET /api/healthz`
- **Auth**: Public
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "auth"
}
```

---

## 3. Operations Service (`/api/products`, `/api/banners`, `/api/upload`) — Port 5002

### 3.1 Product Catalog Query
- **Endpoint**: `GET /api/products`
- **Auth**: Public
- **Query Parameters**:
  - `category` *(optional string)*: Filter by category (e.g. `Vegetables`, `Fruits`, `Spices`)
  - `search` *(optional string)*: Search substring match in name or description
  - `organic` *(optional boolean)*: Filter by organic certification status
- **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "name": "Farm Fresh Alphonso Mangoes",
    "category": "Fruits",
    "unit": "1 kg (4-5 pcs)",
    "price": 350.00,
    "originalPrice": 450.00,
    "discountPercentage": 22,
    "image": "https://jcs-raju-sunotal-final.s3.amazonaws.com/products/mango.jpg",
    "badge": "Top Seller",
    "organic": true,
    "active": true,
    "description": "Naturally ripened organic Ratnagiri Alphonso mangoes direct from orchards.",
    "createdAt": "2026-08-28T12:00:00.000Z"
  }
]
```

### 3.2 Product Image Upload to AWS S3
- **Endpoint**: `POST /api/upload`
- **Auth**: Admin / Vendor Token
- **Content-Type**: `multipart/form-data`
- **Form Data**: `file` (Binary Image File)
- **Response `200 OK`**:
```json
{
  "url": "https://jcs-raju-sunotal-final.s3.amazonaws.com/uploads/1724859000-produce.jpg",
  "filename": "1724859000-produce.jpg"
}
```

---

## 4. Inventory Service (`/api/inventory`, `/api/orders`) — Port 5003

### 4.1 Stock Level Inspection
- **Endpoint**: `GET /api/inventory`
- **Auth**: Admin / Vendor Token
- **Response `200 OK`**:
```json
[
  {
    "id": 5,
    "productId": 1,
    "vendorId": 2,
    "quantity": 120,
    "status": "in_stock",
    "notes": "Batch #2026-A received from Nashik Farm",
    "createdAt": "2026-08-28T10:00:00.000Z",
    "updatedAt": "2026-08-28T15:30:00.000Z"
  }
]
```

---

## 5. User Service (`/api/vendors`, `/api/admin`) — Port 5004

### 5.1 Admin KPI Dashboard Statistics
- **Endpoint**: `GET /api/admin/stats`
- **Auth**: Admin Token
- **Response `200 OK`**:
```json
{
  "totalSales": 128450.00,
  "totalOrders": 142,
  "activeVendors": 28,
  "pendingQuotations": 6,
  "activeProducts": 64
}
```

---

## 6. Comprehensive API Endpoint Summary Table

| Service | Method | Route | Auth Level | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Register new user or vendor account |
| **Auth** | `POST` | `/api/auth/login` | Public | Login & acquire JWT token |
| **Auth** | `GET` | `/api/auth/me` | Bearer | Get active session profile |
| **Auth** | `GET` | `/api/healthz` | Public | Kubernetes liveness/readiness probe |
| **Operations**| `GET` | `/api/products` | Public | Retrieve product catalog |
| **Operations**| `POST` | `/api/products` | Admin | Create product |
| **Operations**| `DELETE` | `/api/products/:id` | Admin | Remove product & trigger Lambda cleanup |
| **Operations**| `POST` | `/api/upload` | Vendor/Admin | Upload image to AWS S3 |
| **Inventory** | `GET` | `/api/inventory` | Vendor/Admin | Inspect warehouse stock levels |
| **User** | `POST` | `/api/vendors` | User | Submit vendor onboarding application |
| **User** | `POST` | `/api/vendors/quotations` | Vendor | Submit produce price quotation |
| **User** | `GET` | `/api/admin/stats` | Admin | Fetch administrative KPI summary |
