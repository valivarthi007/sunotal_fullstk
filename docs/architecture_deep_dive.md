# Application Architecture & Microservices Communication Deep Dive

This document details the architectural design of **Sunotal Farms**, explaining the decoupled microservices model, inter-service boundaries, database access patterns, authentication propagation, and cloud request lifecycles.

---

## Part 1: System Overview

Sunotal Farms follows a **Stateless Microservices Architecture** deployed on **AWS ECS Fargate** behind an **AWS Application Load Balancer (ALB)**.

```mermaid
flowchart TD
    User["Client Browser"]
    
    subgraph Edge["Edge Layer AWS"]
        CF["CloudFront CDN"]
        ALB["Application Load Balancer"]
    end
    
    subgraph Microservices["ECS Fargate Services"]
        FE["Frontend Nginx Port 80"]
        Auth["Auth Service Port 5001"]
        Ops["Operations Service Port 5002"]
        Inv["Inventory Service Port 5003"]
        UserSvc["User Service Port 5004"]
    end
    
    subgraph DataStore["Data and File Layer"]
        RDS[("Amazon RDS PostgreSQL")]
        S3[("Amazon S3 Bucket")]
    end
    
    User -->|"HTTPS"| ALB
    User -->|"Cached Images"| CF
    CF --> S3
    
    ALB -->|"Default Route"| FE
    ALB -->|"/api/auth/*"| Auth
    ALB -->|"/api/products*, /api/categories*"| Ops
    ALB -->|"/api/inventory*, /api/orders*"| Inv
    ALB -->|"/api/users*, /api/vendors*"| UserSvc
    
    Auth -->|"SQL Pool"| RDS
    Ops -->|"SQL Pool"| RDS
    Inv -->|"SQL Pool"| RDS
    UserSvc -->|"SQL Pool"| RDS
    
    Ops -->|"Upload Object"| S3
    UserSvc -->|"Invoice Object"| S3
```

---

## Part 2: Microservices Roster & Responsibilities

| Service Name | Port | Primary Responsibilities | Data Tables Accessed |
|---|---|---|---|
| **`sunotal-frontend`** | `80` | Serves compiled React 19 Single Page Application, CSS/JS static bundles, client-side routing. | None (Client-side) |
| **`sunotal-auth`** | `5001` | User registration (`/auth/register`), login (`/auth/login`), JWT signing, user profile fetch (`/auth/me`). | `users` |
| **`sunotal-operations`** | `5002` | Catalog items (`/products`), category hierarchy (`/categories`), product definitions (`/product-definitions`), hero banners (`/banners`), S3 image upload (`/upload`). | `products`, `categories`, `product_definitions`, `banners` |
| **`sunotal-inventory`** | `5003` | Stock tracking (`/inventory`), FIFO stock deduction during customer checkout (`/orders/checkout`). | `inventory`, `products` |
| **`sunotal-user`** | `5004` | Customer accounts (`/users`), Vendor applications (`/vendors`), Quotations & Invoices (`/vendors/quotations`, `/vendors/invoices`), Admin stats & control panel (`/admin/stats`, `/admin/login`). | `users`, `vendors`, `vendor_quotations`, `invoices` |

---

## Part 3: Inter-Service Communication & Auth Flow

### 1. Stateless Authentication via JWT
- All microservices share the same `SESSION_SECRET` / `JWT_SECRET`.
- When a user logs in via `sunotal-auth` (`POST /api/auth/login`) or `sunotal-user` (`POST /api/admin/login`), the service signs a JSON Web Token containing:
  ```json
  {
    "userId": 1,
    "email": "admin@sunotal.com",
    "role": "admin",
    "iat": 1770960000,
    "exp": 1771564800
  }
  ```
- The frontend stores this token in `localStorage`:
  - `sunotal_admin_token` for routes starting with `/admin`
  - `sunotal_token` for consumer and vendor routes (`/vendor`, `/profile`, `/checkout`)
- Every subsequent API call attaches the header:
  `Authorization: Bearer <token>`
- Any microservice receiving the request verifies the token locally using the shared secret without needing to make synchronous HTTP calls to `sunotal-auth`, eliminating latency bottlenecks.

### 2. Autonomous Database Initialization
- Every microservice connects to Amazon RDS PostgreSQL using Drizzle ORM and a `pg.Pool` connection pool.
- Each service executes `initDatabase()` on boot:
  - Runs `CREATE TABLE IF NOT EXISTS` for all 9 tables.
  - Automatically seeds default users and initial catalog if tables are empty.
  - Ensures continuous self-healing if a database instance is replaced or redeployed.

### 3. Layer 7 ALB Request Routing
- The AWS ALB performs URL path pattern matching to determine which target group receives each request.
- No central API gateway software layer is required — AWS ALB handles load balancing, SSL termination, and routing at wire speed.
