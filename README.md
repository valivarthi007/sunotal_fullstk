# 🥦 Sunotal Grocery - Cloud-Native Quick-Commerce Platform

> **10-15 Minute Hyperlocal Grocery & Fresh Produce Delivery Platform** with multi-portal subdomain routing, SOLID strategy pattern integrations, real-time live GPS delivery tracking, automated farmer sourcing & invoice generation, dynamic financial ledger, and AWS cloud-native deployment.

---

## 🌟 Overview & System Portals

Sunotal Grocery is an end-to-end quick-commerce ecosystem inspired by **Blinkit**, **Swiggy Instamart**, and **Zepto**. The platform consists of four domain-isolated web applications running on a unified cloud-native backend, backed by high-performance dark store inventory management, real-time Leaflet vector map driver tracking, and extensible payment/map strategy providers.

### 🏢 Four Subdomain-Isolated Applications:

| Portal | URL / Subdomain | Primary Persona & Features | Test Credentials |
|---|---|---|---|
| 🛒 **Consumer Storefront** | `sunotal.automateuniverse.space` | 10-15 Min Express Header, Dark Store location selector, Category Pills, Instant `- QTY +` Cart drawer, Real-Time Order Timeline & Live Delivery Tracker | `user@sunotal.com`<br>`Devops@768` |
| 🌾 **Farmer & Vendor Portal** | `vendor-sunotal.automateuniverse.space` | Farmer onboarding, harvest supply quotation submissions, Dark Store allocation, QC status tracking, and HTML payout invoice downloads | `vendor@sunotal.com`<br>`Devops@768` |
| 🛡️ **Admin Control Center** | `admin-sunotal.automateuniverse.space` | Dark Store warehouse manager, stock allocation, quotation approvals, automated S3 invoice generation, financial ledger, and telemetry dashboard | `admin@sunotal.com`<br>`admin123` |
| 🛵 **Delivery Partner App** | `delivery-sunotal.automateuniverse.space` | Duty toggle (`Online`/`Offline`), 30s order alerts, Leaflet turn-by-turn route navigation from Dark Store to Customer, distance earnings, and instant UPI payout requests | `rider@sunotal.com`<br>`Devops@768` |

---

## 🏗️ High-Level System Architecture

```mermaid
graph TD
    subgraph Route53 ["AWS Route 53 DNS & CloudFront CDN"]
        DNS1["sunotal.automateuniverse.space (Consumer Storefront)"]
        DNS2["vendor-sunotal.automateuniverse.space (Vendor Portal)"]
        DNS3["admin-sunotal.automateuniverse.space (Admin Center)"]
        DNS4["delivery-sunotal.automateuniverse.space (Rider App)"]
    end

    subgraph ClientLayer ["Frontend Layer (React 19 + TypeScript + Vite)"]
        SubdomainRouter["Subdomain Router (App.tsx)"]
        PaymentStrategy["IPaymentProvider Strategy Factory"]
        MapStrategy["IMapProvider Strategy Factory"]
    end

    subgraph BackendEngine ["Cloud-Native Backend Engine (Node.js Express + Drizzle ORM)"]
        AuthSvc["Auth & User Service (/api/auth)"]
        CatalogSvc["Products & Catalog Service (/api/products)"]
        VendorSvc["Vendor Sourcing & Invoicing Service (/api/vendors)"]
        InventorySvc["Dark Store Inventory Service (/api/inventory)"]
        OrderSvc["Orders & Checkout Service (/api/orders)"]
        DeliverySvc["Delivery & Live GPS Telemetry (/api/delivery)"]
        AdminSvc["Admin Ledger & Observability Service (/api/admin)"]
    end

    subgraph DatabaseLayer ["AWS RDS PostgreSQL & AWS S3"]
        RDS["AWS RDS PostgreSQL (14 Tables Managed via Drizzle)"]
        S3["AWS S3 Bucket (jcs-raju-sunotal-final)"]
    end

    DNS1 --> SubdomainRouter
    DNS2 --> SubdomainRouter
    DNS3 --> SubdomainRouter
    DNS4 --> SubdomainRouter

    SubdomainRouter --> PaymentStrategy
    SubdomainRouter --> MapStrategy

    SubdomainRouter --> AuthSvc
    SubdomainRouter --> CatalogSvc
    SubdomainRouter --> VendorSvc
    SubdomainRouter --> InventorySvc
    SubdomainRouter --> OrderSvc
    SubdomainRouter --> DeliverySvc
    SubdomainRouter --> AdminSvc

    AuthSvc --> RDS
    CatalogSvc --> RDS
    VendorSvc --> RDS
    VendorSvc --> S3
    InventorySvc --> RDS
    OrderSvc --> RDS
    DeliverySvc --> RDS
    AdminSvc --> RDS
```

---

## 🧩 SOLID Strategy Pattern Architecture

- **Payment Engine (`IPaymentProvider`)**: High-level UI components consume `IPaymentProvider` via `getPaymentProvider()`. The default `MockPaymentProvider` provides zero-cost testing (UPI QR, Card 3D-Secure OTP, NetBanking, COD). Production gateways (Razorpay, Stripe, PhonePe) can be added by implementing `IPaymentProvider` with zero changes to UI components.
- **Mapping Engine (`IMapProvider`)**: Map components consume `IMapProvider` via `getMapProvider()`. The default `CartoDBVoyagerMapProvider` provides crisp vector tiles and geocoding with zero API key cost. Production Google Maps or Mapbox adapters can be plugged in seamlessly.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** v20+
- **pnpm** v9+ or **npm** v10+
- **PostgreSQL** v14+ (or Docker Compose)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/valivarthi007/sunotal_fullstk.git
cd sunotal_fullstk

# Install Backend & Frontend Dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Setup
Create `backend/.env` file:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/sunotal_db
JWT_SECRET=sunotal_super_secret_jwt_key_2026
SESSION_SECRET=sunotal_session_secret_key
S3_BUCKET_NAME=jcs-raju-sunotal-final
AWS_REGION=us-east-1
```

### 3. Seed Default Users & Database Tables
```bash
cd backend
npx tsx -r dotenv/config src/seed-default-users.ts
```

### 4. Run Development Servers
```bash
# Terminal 1: Run Backend API Server
cd backend
npm run dev

# Terminal 2: Run Frontend Web Server
cd frontend
npm run dev
```

Local URLs:
- Storefront: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

---

## 🧪 Comprehensive End-to-End Sanity Verification

Execute the automated end-to-end curl verification test script:
```bash
cd backend
npx tsx -r dotenv/config src/seed-default-users.ts

# Execute automated curl integration test suite
bash -c '
ADMIN_TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@sunotal.com\",\"password\":\"admin123\"}" | jq -r .token)
VENDOR_TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"vendor@sunotal.com\",\"password\":\"Devops@768\"}" | jq -r .token)
USER_TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"user@sunotal.com\",\"password\":\"Devops@768\"}" | jq -r .token)
RIDER_TOKEN=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"rider@sunotal.com\",\"password\":\"Devops@768\"}" | jq -r .token)

echo "Admin Token: ${ADMIN_TOKEN:0:20}..."
echo "Vendor Token: ${VENDOR_TOKEN:0:20}..."
echo "User Token: ${USER_TOKEN:0:20}..."
echo "Rider Token: ${RIDER_TOKEN:0:20}..."
'
```

---

## 📚 Exhaustive Documentation Hub

- 📖 [User Manual & Application Workflows](docs/USER_MANUAL_AND_WORKFLOWS.md) — Step-by-step role-based manual, login guides, vendor quotation cycle, order timeline, and delivery dispatch workflows.
- 🔌 [REST API Reference & Contracts](docs/API_REFERENCE.md) — Complete request/response specification for all 25+ endpoints.
- 🏗️ [Architecture & Database Schema Specification](docs/ARCHITECTURE.md) — Database tables, foreign key constraints, SOLID strategy pattern design, and Leaflet vector map engine.
- 🛠️ [DevOps & AWS Cloud Guide](docs/DEVOPS_AND_AWS_GUIDE.md) — AWS Route 53 subdomain configuration, App Runner, ECS Fargate, AWS RDS PostgreSQL, ECR Docker registry, and CI/CD pipelines.
- 🧩 [SOLID Strategy Pattern Integration Guide](docs/INTEGRATION_GUIDE.md) — Step-by-step developer instructions for implementing Razorpay, Stripe, Google Maps, and Mapbox integrations.

---

## 📄 License
Licensed under the MIT License.
