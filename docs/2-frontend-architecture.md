# 2. Frontend Client Architecture

This guide describes the frontend system design, components, page layouts, location detection, and auth session isolation.

---

## 1. Core Stack Details

- **Vite**: Used for rapid dev compiles and Rollup asset bundling.
- **React & TypeScript**: Type-safe components and hooks.
- **Tailwind CSS**: Custom UI utility classes.
- **TanStack Query (React Query)**: Global state synchronizer and caching engine.
- **wouter**: Lightweight client router routing components based on window paths.

---

## 2. Location Auto-Detection System

To facilitate farm-to-door delivery, Sunotal uses a multi-tier location auto-detection system in [location-context.tsx](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/frontend/src/lib/location-context.tsx):

1. **HTML5 Geolocation API**: Invokes `navigator.geolocation.getCurrentPosition` to fetch coordinates.
2. **Reverse Geocoding**: Queries OpenStreetMap's Nominatim API with the coordinates to resolve local Indian city, district, state, and pin code names.
3. **IP Geolocation Fallback**: If GPS permissions are denied or disabled, falls back to querying `ipapi.co/json` to determine the user's city via IP address.
4. **State Persistence**: Keeps the resolved location (city, state, region, pin code) stored inside `localStorage` to avoid duplicate API lookups.
5. **Corporate Hub Selector Modal**: Allows users to manually overwrite GPS coordinates and select India's major corporate tech hubs (e.g. HITEC City, Whitefield, Cyber City).

---

## 3. Session & Auth Token Isolation

To prevent security cross-contamination and auth header leaks between administrative actions and customer accounts, we isolate the tokens at boot:

- **Config**: Configured inside [main.tsx](file:///home/valivarthi/DIWAKAR/PROJECTS/jcs/sunotal_fullstk/frontend/src/main.tsx) using the `setAuthTokenGetter` interceptor.
- **Isolation Logic**:
  ```typescript
  setAuthTokenGetter(() => {
    const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    return isAdminPath
      ? localStorage.getItem('sunotal_admin_token')
      : localStorage.getItem('sunotal_token');
  });
  ```
- **Query Cache Invalidation**: Calling `queryClient.clear()` on logout ensures that any user metadata query is completely erased from cache, preventing auto-login.

---

## 4. Page Architecture

Located under `frontend/src/pages/`:
- **Public storefront**:
  - `Home.tsx`: Hero banner slider with express location delivery bars and popular category tabs.
  - `Products.tsx`: Complete product catalog filtering and search.
  - `Profile.tsx` / `Orders.tsx`: Manages personal settings, addresses, order invoice details, live express shipment tracking timelines, and support grievances.
  - `Checkout.tsx`: Shipping coordinates, corporate GSTIN invoices, payment methods, and receipt printing.
- **Admin Control Panel**:
  - `AdminLogin.tsx`: Secured administrator sign-in.
  - `Dashboard.tsx`: Platform statistics, category metrics, recent registrations, and vendor approval tables.
  - `Products.tsx` / `Banners.tsx` / `Inventory.tsx`: Admin-only CRUD operations.
