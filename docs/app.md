# Sunotal Application Stack Tutorial

This tutorial provides a complete walkthrough of the software architecture, application logic, and development workflows for the Sunotal Fullstack E-Commerce application.

---

## 1. Application Architecture Overview

Sunotal is built as a decoupled Client-Server architecture:
- **Frontend**: A single-page application (SPA) built using React, Vite, TypeScript, and Tailwind CSS.
- **Backend**: A REST API built using Node.js, Express, TypeScript, and Zod.
- **Database**: PostgreSQL database managed via Drizzle ORM.

---

## 2. Frontend Stack (React/TypeScript)

### Core Technologies
- **Build Tool**: Vite (configured in `frontend/vite.config.ts` with proxy rules for API routes).
- **Routing**: `wouter` for lightweight client-side routing.
- **Data Fetching & Caching**: TanStack Query (`@tanstack/react-query`) with type-safe generated hooks.
- **Styling**: Tailwind CSS for responsive and premium layout patterns.

### Key Components
1. **Location auto-detection**:
   - Implemented in `frontend/src/lib/location-context.tsx`.
   - Uses the HTML5 Geolocation API (`navigator.geolocation`) with reverse-geocoding via OpenStreetMap's Nominatim API.
   - Falls back seamlessly to IP-based geolocation (`ipapi.co`) if GPS access is denied or disabled.
   - Saves selected locations to `localStorage` for cross-session state persistence.
2. **State Isolation**:
   - Custom session tokens (`sunotal_token` and `sunotal_admin_token`) are managed separately via the `setAuthTokenGetter` interceptor in [main.tsx](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/frontend/src/main.tsx).
   - This prevents credential/session leaks when switching between user profile and administrative pages.

---

## 3. Backend Stack (Express/TypeScript)

### Core Technologies
- **HTTP Server**: Node.js & Express.
- **Validation**: `zod` schemas for type-safe request parsing (located in `backend/src/lib/schemas.ts`).
- **Logging**: `pino` structured logger.

### Key Routes
- **Authentication (`/api/auth/*`)**: Register/Login routes, password hashing via `bcryptjs`, and stateless JWT generation.
- **Products (`/api/products/*`)**: CRUD operations with AWS S3 integration. Includes automatic deletion triggers invoking the S3 cleanup Lambda function.
- **Admin (`/api/admin/*`)**: Dashboard stats computation and administrative authentication middlewares.

---

## 4. Database Stack (PostgreSQL & Drizzle ORM)

Drizzle ORM is used as the SQL query builder and migration runner.

### Schema Schemas
Located under `backend/src/schema/`:
- **`users.ts`**: User credentials, contact info, and roles.
- **`products.ts`**: Product pricing, catalog categories, inventory links, and image S3 urls.
- **`vendors.ts`**: Farmer registration records and validation statuses.
- **`inventory.ts`**: Stock tracking details.

### Database Operations
- **Migrations**: Pushed to the database using `pnpm run db:push` (wraps Drizzle Kit).
- **Seeding**: Clean system seeding using [seed.ts](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/backend/src/seed.ts) to establish the initial system admin account.
