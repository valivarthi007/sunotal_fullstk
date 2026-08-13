# Request Routing & Load Balancing Architecture

This document describes how client requests are routed, load-balanced, and reverse-proxied across different environments (Local Development, Staging Test Server, and Production Fargate Cluster), explaining the roles of Vite, Nginx, and AWS Application Load Balancers (ALB).

---

## 1. Routing Matrix Overview

Depending on the environment, routing is handled either by a development server proxy, a native Nginx installation on a virtual machine, or an AWS Application Load Balancer:

| Environment | Primary Router | Inbound Ports | Target Destination |
| :--- | :--- | :--- | :--- |
| **Local Development** | Vite Dev Server | `3000` (Frontend) | Proxies `/api` requests to local Node.js process on `5000`. |
| **Staging Test Server** | Nginx (Host Service) | `80` (HTTP) / `443` (HTTPS) | Serves static assets directly; proxies `/api/` to monolith on `5000`. |
| **Production Cloud** | AWS ALB + Container Nginx | `80` (HTTP) / `443` (HTTPS) | ALB handles path routing; routes `/` to Frontend task (Nginx) and `/api` to microservices. |

---

## 2. Local Routing (Vite Dev Proxy)

During local development, running multiple independent server terminals (Vite and Node.js) requires a mechanism to bypass browser Cross-Origin Resource Sharing (CORS) limits:

* **Entrypoint**: The browser accesses the React application via `http://localhost:3000`.
* **API Proxy**: In `frontend/vite.config.ts`, Vite's development server is configured with a dev-proxy rule:
  ```typescript
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
  ```
  Any AJAX request sent to `/api/*` is transparently forwarded by Vite to the backend monolith server listening on port `5000`.

---

## 3. Staging VM Routing (Nginx Host Reverse Proxy)

On the **EC2 Test Server**, a single virtual machine hosts the entire application stack. Request routing is managed by Nginx running as a system service:

```
Browser Client (HTTP/HTTPS)
            │
            ▼
    Nginx (Port 80/443)
            │
            ├─► Path: / ───────► Serves static files directly from /var/www/sunotal
            │
            └─► Path: /api/ ───► Reverse proxies to http://127.0.0.1:5000 (Monolith)
```

* **Static File Serving**: When requests target the root directory `/`, Nginx directly locates and returns static compiled single-page application (SPA) files from the target directory `/var/www/sunotal`.
* **Reverse Proxy**: When requests target the API endpoint `/api/`, Nginx acts as a reverse proxy, forwarding requests to the Express monolith server listening locally on `127.0.0.1:5000`.

---

## 4. Production Cloud Routing (AWS ALB + Fargate Nginx)

In the production AWS Fargate environment, load balancing and path-based reverse proxying are split between an **AWS Application Load Balancer (ALB)** and **containerized Nginx web servers**:

```
Browser Client (HTTPS)
          │
          ▼
AWS Application Load Balancer (ALB)
          │
          ├─► Path: / ──────────────────────► Frontend Fargate Task (Runs Nginx on Port 80)
          ├─► Path: /api/auth/* ─────────────► Auth Microservice (Port 5001)
          ├─► Path: /api/admin/* ────────────► Operations Microservice (Port 5002)
          ├─► Path: /api/products/* ─────────► Inventory Microservice (Port 5003)
          └─► Path: /api/users/* ────────────► User Microservice (Port 5004)
```

### 4.1 AWS Application Load Balancer (ALB) Role
* **SSL Termination**: The ALB receives traffic on port `443` using SSL certificates, decrypts the requests, and forwards them to Fargate target groups.
* **Path-Based Routing Rules**: The ALB inspects the path of each incoming request:
  * Paths starting with `/api/auth/` are routed to the **Auth Service Target Group** (Fargate Task Port `5001`).
  * Paths starting with `/api/admin/` are routed to the **Operations Service Target Group** (Fargate Task Port `5002`).
  * Paths starting with `/api/products/` are routed to the **Inventory Service Target Group** (Fargate Task Port `5003`).
  * Paths starting with `/api/users/` are routed to the **User Service Target Group** (Fargate Task Port `5004`).
  * All other requests (default `/` route) are routed to the **Frontend Target Group** (Fargate Task Port `80`).

### 4.2 Containerized Nginx Role (Frontend Task)
Unlike the staging VM where Nginx handles all routing, in production, Nginx runs **inside the Frontend Docker container**:
* When the ALB routes traffic to the Frontend target group on port `80`, it hits the Nginx web server running inside the Fargate task.
* Nginx's only job here is to serve the static frontend React assets (`index.html`, JS, CSS) compiled into the container image. It does not perform any reverse proxying for the backend, as the ALB routes API traffic directly to the microservices.
