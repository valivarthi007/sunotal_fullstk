# Chapter 10: How-To Guides & Operational Cookbook

This chapter provides step-by-step, task-oriented tutorials ("How-To Guides") for developers, system administrators, and platform operators.

---

## 1. How To Pin Delivery Address on Map & Save to Address Book

Sunotal provides a BigBasket-style **Interactive Map Pinpoint Location Picker**:

1. Click **"Delivering to"** or **"Pin Map Location"** on the header or checkout screen.
2. In the **Map Picker Modal**, drag the pin marker to your exact building/flat on the map grid.
3. Click **"Use Current GPS Location"** to auto-center using browser HTML5 Geolocation.
4. Select an address tag (*Home*, *Work*, *Office*, *Other*) and click **Confirm & Save Map Location**.
5. The address is saved to PostgreSQL database via `delivery-service` (`POST /api/user/addresses`) and auto-filled into your checkout form.

---

## 2. How To Track Live Delivery on Map with Animated Driver Pin

1. Go to **My Orders** (`/orders`).
2. Click **Track Delivery** on any active order.
3. The **Live Delivery Map Tracker** modal opens:
   - View origin warehouse pin, customer delivery pin, and live animated vehicle pin moving along the route.
   - Monitor real-time **ETA Countdown** (*"Arriving in 12 Mins"*), remaining distance in km, and driver speed.
   - Click **Call Driver** to initiate instant phone contact with the assigned delivery partner.

---

## 3. How To Access & Customize Prometheus & Grafana Monitoring

Sunotal includes a **100% Free Open-Source Prometheus + Grafana Observability Stack**.

### Access Endpoints
- **Prometheus TSDB Web Console**: `http://localhost:9090`
- **Grafana Dashboard Web Console**: `http://localhost:3000` (Default Login: `admin` / `admin`)
- **Admin In-App Telemetry Hub**: Log in to Admin UI -> **Observability & Metrics** (`/admin/observability`).
- **Microservices Prometheus Metrics Endpoints**:
  - `http://localhost:5001/metrics` (Auth Microservice)
  - `http://localhost:5002/metrics` (Operations Microservice)
  - `http://localhost:5003/metrics` (Inventory Microservice)
  - `http://localhost:5004/metrics` (User Microservice)
  - `http://localhost:5006/metrics` (Delivery Microservice)

---

## 4. How To Add a New Microservice to the Platform

To add a new backend microservice (e.g. `notification-service` on Port `5007`):

1. **Create Microservice Folder**: `mkdir -p backend/services/notification-service/src/routes`
2. **Instrument Prometheus Metrics**:
   Import `metricsMiddleware` and `metricsHandler` from `../../src/lib/metrics.js`.
3. **Register Target in Prometheus**:
   Add scrape target to `prometheus/prometheus.yml`.
4. **Update Docker & Kubernetes**:
   Add service entry to `docker-compose.yml` and manifest in `k8s/02-deployments.yaml`.
