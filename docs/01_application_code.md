# 01. Application Code Architecture & Operating Manual

This document provides a comprehensive operational, architectural, and developer guide for the **Sunotal** application codebase.

---

## 1.a End-to-End Application Architecture

Sunotal is built as a hybrid microservices application engineered with **TypeScript**, **React**, **Node.js Express**, **Drizzle ORM**, and **PostgreSQL**.

```
[ Browser / Client ]
        │
        ▼
[ AWS Application Load Balancer / Nginx Reverse Proxy ]
        │
 ┌──────┼─────────────────┬──────────────────┬─────────────────┐
 │      │                 │                  │                 │
 ▼      ▼                 ▼                  ▼                 ▼
[Frontend] [Auth Service] [Operations Svc] [Inventory Svc] [User Service]
 (Port 80)  (Port 5001)    (Port 5002)       (Port 5003)    (Port 5004)
        │       │                 │                  │                 │
        └───────┴─────────────────┼──────────────────┴─────────────────┘
                                  ▼
                    [ AWS RDS PostgreSQL Database ]
```

### Key Architectural Concepts
1. **Frontend**: Single-Page Application (SPA) built with React 18, Vite, TypeScript, Tailwind CSS, Wouter routing, and TanStack Query.
2. **Microservices Breakdown**:
   - **`auth-service`** (Port 5001): Handles JWT authentication, bcrypt password hashing, and token issuance.
   - **`operations-service`** (Port 5002): Manages product definitions, categories, marketing banners, and S3 file uploads.
   - **`inventory-service`** (Port 5003): Handles product catalog, stock levels, orders, and cart checkout.
   - **`user-service`** (Port 5004): Controls customer profiles, farmer/vendor onboarding, farmer price quotations, PDF invoice generation, payouts, and admin dashboard metrics.
   - **`backend` (Monolith)** (Port 5000): Unified Express backend for single-container development or local deployments.

---

## 1.b Operating Manual by Role & Portal

### 1. Consumer / End-User Portal (`/`)
- **Homepage (`/`)**: Displays season banners, product categories, featured organic products, and discount badges.
- **Product Catalog (`/products`)**: Filter products by category, search by crop name, or filter by organic certification.
- **Cart & Checkout (`/cart`)**: Add items to shopping cart, update quantities, view real-time price totals, and place orders.
- **My Orders (`/orders`)**: View past orders, payment status, delivery status, and invoice receipts.

### 2. Farmer / Vendor Portal (`/vendor`)
- **Vendor Registration (`/vendor/register`)**: Farmers submit name, location, farm size, produce category, phone number, and Aadhar/GSTIN verification details.
- **Vendor Dashboard (`/vendor`)**: Shows registration status (`pending`, `approved`, `rejected`), submitted quotations, and earnings metrics.
- **Submit Quotation (`/vendor/quotations/new`)**: Farmers offer raw produce to Sunotal by selecting crop type, quantity (in kg), price per kg, and Aadhar identification.
- **Quotations History (`/vendor/quotations`)**: Track submitted produce quotes, approval status, and payout records.

### 3. Admin Control Panel (`/admin`)
- **Admin Login (`/admin/login` or `/login`)**: Log in with credentials (`admin@sunotal.com` / `admin123`).
- **Dashboard (`/admin`)**: Key metrics displaying Total Revenue, Total Products, Active Farmers, Pending Vendor Approvals, and Produce Category Breakdown charts.
- **Vendor Applications (`/admin/vendors`)**: Inspect farmer verification applications and update status to `approved` or `rejected`.
- **Quotations Management (`/admin/quotations`)**:
  - Review farmer price quotes.
  - **Accept Quotation**: Automatically adds produce quantity directly into Sunotal's active inventory and creates product draft entries if new.
  - **Reject Quotation**: Declines quote with feedback notes.
  - **Generate Invoice**: Creates a PDF invoice, uploads it to AWS S3, and links the invoice URL to the quotation.
  - **Process Payout**: Marks payout as `paid` upon completing bank transfer to farmer.
- **Product Catalog Management (`/admin/products`)**: Create, edit, toggle active status, set discount percentages, and upload crop images.

---

## 1.c Module Source Code & Execution Flow

### 1. User Authentication Module (`backend/services/auth-service`)
- `src/index.ts`: Initializes Express router and calls `initDatabase()` asynchronously while binding listener immediately to port 5001.
- `src/routes/auth.ts`: 
  - `POST /api/auth/register`: Validates user input with Zod, checks email uniqueness, hashes password with `bcrypt.hash(password, 10)`, inserts record into `users` table, and returns signed JWT token.
  - `POST /api/auth/login`: Queries user by email, verifies hash via `bcrypt.compare()`, generates JWT containing `{ userId, email, role }`, and sets expiration (24h).

### 2. Operations & Catalog Module (`backend/services/operations-service`)
- `src/routes/upload.ts`: Handles file uploads using `multer` and AWS SDK S3 client (`@aws-sdk/client-s3`), uploading files to bucket `jcs-raju-sunotal-final`.
- `src/routes/banners.ts`: Manages marketing banner slides.
- `src/routes/product-definitions.ts`: Standard crop names used by vendors when submitting quotations.

### 3. User & Vendor Management Module (`backend/services/user-service`)
- `src/routes/vendors.ts`: Manages vendor onboarding, quotation creation, quotation status transitions (`pending` -> `accepted`/`rejected`), auto-inventory updating on quote acceptance, and S3 PDF invoice generation.
- `src/routes/admin.ts`: Serves `/api/admin/stats` aggregating users, products, vendors, and category distributions for the dashboard.

---

## 1.d API Interaction Workflow

```
[ User Browser ] -> POST /api/auth/login -> [ Auth Service ] -> (Verifies Password against RDS) -> Returns JWT Token
[ User Browser ] -> GET  /api/admin/stats [Header: Bearer JWT] -> [ User Service ] -> (Verifies Role=='admin') -> Returns JSON Metrics
[ Farmer ]       -> POST /api/vendors/quotations [Bearer JWT] -> [ User Service ] -> Inserts into vendor_quotations table
[ Admin ]        -> PUT  /api/admin/quotations/:id/status {status: "accepted"} -> [ User Service ] -> Updates quotation status & Inserts into inventory table
```

---

## 1.e Database Tables, Schemas & ER Diagram

### ER Diagram

```mermaid
erDiagram
    users ||--o{ vendors : "owns vendor profile"
    users ||--o{ orders : "places orders"
    vendors ||--o{ vendor_quotations : "submits"
    vendor_quotations ||--o| invoices : "billed by"
    products ||--o{ inventory : "stocked in"
    vendors ||--o{ inventory : "supplies"
    categories ||--o{ product_definitions : "groups"

    users {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        boolean active
        string phone
        string city
        timestamp created_at
    }

    vendors {
        int id PK
        int user_id FK
        string first_name
        string last_name
        string phone
        string location
        string produce
        string status
    }

    vendor_quotations {
        int id PK
        int vendor_id FK
        string produce
        int quantity
        real price
        string status
        string payment_status
    }

    products {
        int id PK
        string name
        string category
        real price
        string image
        boolean active
    }

    inventory {
        int id PK
        int product_id FK
        int vendor_id FK
        int quantity
        string status
    }

    invoices {
        int id PK
        int vendor_id FK
        int quotation_id FK
        string invoice_number
        string s3_url
        real amount
    }
```

### Useful SQL Queries for Manual Backend Operations (CRUD)

```sql
-- 1. View all registered users
SELECT id, name, email, role, active, created_at FROM users ORDER BY id DESC;

-- 2. Promote a user to admin
UPDATE users SET role = 'admin', active = true WHERE email = 'user@sunotal.com';

-- 3. List all vendor quotations with farmer details
SELECT q.id, v.first_name || ' ' || v.last_name AS farmer_name, q.produce, q.quantity, q.price, q.status, q.payment_status 
FROM vendor_quotations q
JOIN vendors v ON q.vendor_id = v.id
ORDER BY q.created_at DESC;

-- 4. Manually accept a quotation
UPDATE vendor_quotations SET status = 'accepted' WHERE id = 1;

-- 5. Inspect total active inventory stock
SELECT p.name AS product_name, SUM(i.quantity) AS total_stock, i.status
FROM inventory i
JOIN products p ON i.product_id = p.id
GROUP BY p.name, i.status;
```

---

## 1.f Manual Installation & Application Commands

### Prerequisites
- Node.js v20+
- pnpm v9+
- PostgreSQL v16+

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/valivarthi007/sunotal_fullstk.git
cd sunotal_fullstk

# 2. Install workspace dependencies
pnpm install

# 3. Setup environment variables (.env in backend)
cat << 'EOF' > backend/.env
PORT=5000
DATABASE_URL="postgresql://sunotal:sunotalpass123@localhost:5432/sunotal"
SESSION_SECRET="sunotal-super-secret-key"
FRONTEND_URL="http://localhost:3000"
EOF

# 4. Start PostgreSQL locally via Docker
docker run -d --name sunotal-postgres -e POSTGRES_USER=sunotal -e POSTGRES_PASSWORD=sunotalpass123 -e POSTGRES_DB=sunotal -p 5432:5432 postgres:16-alpine

# 5. Run Database Migrations / Seeding
cd backend && pnpm run db:push

# 6. Start Development Servers
# Terminal 1: Backend Monolith
cd backend && pnpm dev

# Terminal 2: Frontend SPA
cd frontend && pnpm dev
```

---

## 1.g Health Querying via `curl` and `wget`

```bash
# 1. Check Frontend Homepage
curl -i https://sunotal.automateuniverse.space/
wget -qO- https://sunotal.automateuniverse.space/ | head -n 15

# 2. Check Auth Service Healthz
curl -i https://sunotal.automateuniverse.space/api/healthz

# 3. Test Login Endpoint
curl -i -X POST https://sunotal.automateuniverse.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sunotal.com","password":"admin123"}'

# 4. Query Admin Stats with Bearer Token
TOKEN=$(curl -s -X POST https://sunotal.automateuniverse.space/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@sunotal.com","password":"admin123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -i -H "Authorization: Bearer $TOKEN" https://sunotal.automateuniverse.space/api/admin/stats
curl -i -H "Authorization: Bearer $TOKEN" https://sunotal.automateuniverse.space/api/admin/quotations
```

---

## 1.h & 1.i Troubleshooting Manual & Application Diagnostics

### Diagnostic Flowchart
1. **503 Service Temporarily Unavailable**:
   - Check if EKS pod target IPs are registered in ALB Target Groups: `aws elbv2 describe-target-health --target-group-arn <ARN>`.
   - Check if Security Group rule allows ALB -> EKS node traffic.
2. **500 Internal Server Error on Login**:
   - Inspect auth pod logs: `kubectl logs deployment/sunotal-auth -n sunotal`.
   - Verify `DATABASE_URL` host in Secret `sunotal-secrets`. Ensure host is `sunotal-postgres.cs1gq0a2wtpu.us-east-1.rds.amazonaws.com` (not placeholder `c1234567890`).

---

## 1.j Sample Enhancement Code Snippet: Razorpay / Stripe Payment Gateway

To integrate Razorpay payment gateway into `backend/services/inventory-service/src/routes/orders.ts`:

```typescript
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_sample',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'sample_secret',
});

// POST /api/orders/create-razorpay-order
router.post('/orders/create-razorpay-order', requireAuth, async (req, res) => {
  const { amount } = req.body; // amount in INR
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```
