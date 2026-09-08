# 🥦 Sunotal Grocery - Cloud-Native Quick-Commerce Platform

> **10-15 Minute Hyperlocal Grocery & Fresh Produce Delivery Platform** with multi-portal subdomain routing, SOLID strategy pattern integrations, and PaaS/AWS Free Tier cloud deployment.

---

## 🌟 Overview & Highlights

Sunotal Grocery is an end-to-end quick-commerce ecosystem inspired by **Blinkit**, **Swiggy Instamart**, and **Zepto**. The platform features four domain-isolated web applications, high-performance dark store inventory management, live delivery driver tracking, and extensible payment/map strategy providers.

### 🏢 Four Subdomain-Isolated Portals:
1. 🛒 **Consumer Storefront** (`sunotal.automateuniverse.space`)
   - 10-15 Min Express Header with Dark Store location selector.
   - Grocery Category Pills (Fresh Veggies, Fruits, Dairy, Snacks, Drinks, Staples).
   - Product Cards with weight/pack units (`500 g`, `1 L`), discount badges, and instant `- QTY +` counters.
   - Sticky Cart Drawer with free delivery threshold progress bar.
   - Real-time Order Timeline & Live Delivery Tracker.

2. 🌾 **Farmer & Vendor Portal** (`vendor-sunotal.automateuniverse.space`)
   - Farmer onboarding & crop registration.
   - Dark store supply contracts and bulk inventory submission.

3. 🛡️ **Admin Control Center** (`admin-sunotal.automateuniverse.space`)
   - Dark store warehouse manager & dark store inventory allocation.
   - Financial ledger, observability dashboard, vendor approvals, and grievance resolution.

4. 🛵 **Delivery Partner Application** (`delivery-sunotal.automateuniverse.space`)
   - Rider duty toggle (`Online` / `Offline`).
   - Hyperlocal order alert notifications with 30s acceptance timer.
   - Live turn-by-turn GPS route navigation map from Dark Store to Customer address.
   - Commission formula (₹35 base + ₹10/km distance pay + peak surge bonus + tips).
   - Insider rider grocery discounts & instant UPI payout requests.

---

## 🧩 SOLID Strategy Pattern Architecture

- **Payment Engine (`IPaymentProvider`)**: High-level UI components consume `IPaymentProvider` via `getPaymentProvider()`. Zero-cost `MockPaymentProvider` is used for default POC testing (UPI QR, Card 3D-Secure OTP, NetBanking, COD). Switching to live Razorpay or Stripe requires implementing `IPaymentProvider` with zero modifications to UI code!
- **Mapping Engine (`IMapProvider`)**: Map components consume `IMapProvider` via `getMapProvider()`. `CartoDBVoyagerMapProvider` provides crisp high-DPI Apple/Google-like vector tiles and Nominatim reverse geocoding with zero cost and zero API keys. Production Google Maps / Mapbox adapters can be plugged in seamlessly.

---

## 🚀 Quick Start (Local Development)

### Prerequisites:
- Node.js v20+
- pnpm v9+
- Docker & Docker Compose

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/valivarthi007/sunotal_fullstk.git
cd sunotal_fullstk

# Install frontend & backend dependencies
cd frontend && pnpm install
cd ../backend && pnpm install
```

### 2. Local Environment Setup
```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 3. Run via Docker Compose
```bash
docker-compose up --build
```
Access points:
- Storefront: `http://localhost:80`
- API Backend: `http://localhost:5000/api`

---

## ☁️ AWS Cloud-Native Architecture (Free Tier Optimized)

- **Compute**: **AWS App Runner** / **ECS Fargate Spot** (180 GB-hours/month free tier, zero EC2 cluster maintenance overhead, auto-scale to zero when idle).
- **Database**: **AWS RDS PostgreSQL** (`db.t4g.micro`, 750 free hours/month, 20 GB SSD).
- **CDN**: **AWS CloudFront** + **S3** (1 TB/month free edge transfer).
- **DNS**: **AWS Route 53** with CNAME aliases for subdomains.

---

## 📚 Project Documentation Guide

- [Architecture Overview](docs/ARCHITECTURE.md)
- [REST API Reference](docs/API_REFERENCE.md)
- [DevOps & AWS Cloud Guide](docs/DEVOPS_AND_AWS_GUIDE.md)
- [SOLID Integration Guide (Payment & Maps)](docs/INTEGRATION_GUIDE.md)

---

## 📄 License
Licensed under the MIT License.
