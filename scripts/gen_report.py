#!/usr/bin/env python3
"""Sunotal Quick-Commerce Enhancement Report Generator"""
import os
from datetime import datetime

# All enhancement data
ENHANCEMENT_DATA = {
    "Application Feature": [
        ("User App", "Social Login (Google/Facebook/Apple Sign-In)", "HIGH", "Reduces friction, increases conversion rate by 30-40%", "Missing", "Week 1-2"),
        ("User App", "One-Tap Reorder from previous orders", "HIGH", "Zepto/Blinkit core feature - drives repeat orders", "Missing", "Week 2"),
        ("User App", "Voice Search (multilingual: English+Telugu+Hindi)", "HIGH", "India-specific: 60% rural users prefer voice search", "Missing", "Week 2-3"),
        ("User App", "Smart AI Personalized Recommendations (ML-based)", "HIGH", "Increases AOV by 25%, used by Instamart/Blinkit", "Missing", "Week 3-4"),
        ("User App", "Real-time Stock Availability indicator per product", "HIGH", "Critical for quick commerce - avoid order failures", "Partial", "Week 1"),
        ("User App", "Subscription/Daily Recurring Orders (milk,eggs,bread)", "HIGH", "BB Daily model - Rs500Cr+ opportunity in India", "Partial (DB only)", "Week 2-3"),
        ("User App", "In-App Live Chat with rider (WhatsApp-style)", "HIGH", "Reduces support tickets 40%, Zepto feature", "Missing", "Week 3"),
        ("User App", "10-minute guaranteed delivery promise with dynamic ETA", "HIGH", "Core quick commerce SLA - must show on UI prominently", "Partial (backend)", "Week 1"),
        ("User App", "Dynamic Substitution suggestions when item OOS", "HIGH", "Reduces cart abandonment by 30%", "Missing", "Week 2"),
        ("User App", "Group Order / Split Cart feature", "MEDIUM", "Trending - Gen Z feature, Swiggy Instamart", "Missing", "Week 4"),
        ("User App", "Product Bundle Deals (Buy 2 get 1, combo packs)", "MEDIUM", "Increases AOV - used by BigBasket, Zepto", "Missing", "Week 3"),
        ("User App", "Loyalty Points / Reward System (Sunotal Coins)", "MEDIUM", "Increases retention - standard in all q-commerce", "Missing", "Week 4-5"),
        ("User App", "Refer & Earn with tracking dashboard", "MEDIUM", "Viral growth loop - standard in Indian q-commerce", "Missing", "Week 3"),
        ("User App", "Address-based delivery time prediction", "HIGH", "Uses last-mile routing to show accurate ETA per address", "Missing", "Week 2"),
        ("User App", "Nutritional info & ingredient labels on products", "MEDIUM", "Health-conscious trend; regulatory requirement upcoming", "Missing", "Week 4"),
        ("User App", "Smart Cart (auto-detect missing items from past habits)", "MEDIUM", "AI-driven convenience - Instamart 2024 feature", "Missing", "Week 5"),
        ("User App", "ONDC Protocol Integration (Open Network Digital Commerce)", "HIGH", "India mandated - expand to ONDC network buyers", "Missing", "Week 6-8"),
        ("User App", "Multiple Payment: UPI, BNPL (Simpl/LazyPay), COD", "HIGH", "COD accounts for 60% orders in Tier-2/3 India", "Partial", "Week 1-2"),
        ("User App", "UPI Autopay for subscriptions", "MEDIUM", "Critical for subscription model", "Missing", "Week 3"),
        ("User App", "In-app Freshness Guarantee badge + return policy", "HIGH", "Trust signal - Dunzo / Bigbasket standard", "Missing", "Week 2"),
        ("User App", "Dark Mode UI", "MEDIUM", "UX standard - 65% users prefer dark mode", "Missing", "Week 2"),
        ("User App", "Scheduled Delivery Slots (morning/evening/custom)", "HIGH", "India standard: Dmart Ready, Bigbasket BB Now", "Missing", "Week 2"),
        ("User App", "Product Rating & Review with photo upload", "HIGH", "Trust builder - increases conversion by 18%", "Partial (rating only)", "Week 2"),
        ("User App", "Hyperlocal Deals (geo-fenced offers per neighbourhood)", "MEDIUM", "Used by Swiggy for micro-locality promotions", "Missing", "Week 5"),
        ("User App", "Push Notification for price drop, restock, offers", "HIGH", "Re-engagement driver - Zepto primary retention tool", "Missing", "Week 2"),
        ("User App", "Order cancellation with instant refund to wallet", "HIGH", "User trust - within 1 min of placing order", "Partial", "Week 1"),
        ("User App", "Age-gated product access (alcohol, tobacco category)", "HIGH", "Legal compliance - needed for category expansion", "Missing", "Week 4"),
        ("Delivery App", "Turn-by-turn Navigation (Google Maps / Mappls)", "HIGH", "Critical for 10-min delivery SLA", "Missing", "Week 1"),
        ("Delivery App", "Heatmap of high-demand zones for rider positioning", "HIGH", "Zepto Surge - positions riders near demand clusters", "Missing", "Week 3"),
        ("Delivery App", "Gamified Incentives (daily targets, badges, streaks)", "HIGH", "Increases rider retention 40% - Swiggy model", "Missing", "Week 3"),
        ("Delivery App", "Batch Order delivery (2-3 orders in one trip)", "HIGH", "Reduces delivery cost 35% - Blinkit key innovation", "Missing", "Week 4"),
        ("Delivery App", "Rider SOS / Emergency button", "HIGH", "Rider safety - legal requirement in some states", "Missing", "Week 2"),
        ("Delivery App", "Contactless delivery mode with photo proof", "HIGH", "Post-COVID standard - reduces disputes 70%", "Missing", "Week 2"),
        ("Delivery App", "Rider earnings dashboard with daily/weekly analytics", "HIGH", "Transparency builds trust and reduces churn", "Partial", "Week 2"),
        ("Delivery App", "Auto-assign order to nearest rider (smart dispatch)", "HIGH", "Core quick-commerce dispatch engine - missing!", "Missing", "Week 3-4"),
        ("Delivery App", "Weather-based surge pricing and incentives", "MEDIUM", "Dynamic economics - Ola/Uber model for gig workers", "Missing", "Week 5"),
        ("Delivery App", "2-way rider-customer rating system", "HIGH", "Quality control mechanism", "Partial", "Week 2"),
        ("Delivery App", "Background location tracking with battery optimization", "HIGH", "Critical for GPS tracking accuracy", "Missing", "Week 1"),
        ("Delivery App", "In-app QR/Barcode scanner for package verification", "MEDIUM", "Reduces wrong delivery errors", "Missing", "Week 3"),
        ("Delivery App", "Rider insurance claim workflow", "HIGH", "Legal compliance & welfare - DPIIT guidelines", "Missing", "Week 4"),
        ("Delivery App", "Offline mode for areas with poor connectivity", "MEDIUM", "Tier-2/3 India requirement", "Missing", "Week 4"),
        ("Delivery App", "Shift management with automatic status update", "MEDIUM", "Operational efficiency", "Missing", "Week 3"),
        ("Vendor App", "Live Inventory Dashboard with low-stock alerts", "HIGH", "Real-time visibility reduces OOS incidents", "Missing", "Week 2"),
        ("Vendor App", "Bulk Product Upload via CSV/Excel", "HIGH", "Operational efficiency for large vendors", "Missing", "Week 2"),
        ("Vendor App", "Vendor-specific analytics: sales, returns, ratings", "HIGH", "Seller empowerment - Amazon/Flipkart model", "Missing", "Week 3"),
        ("Vendor App", "Direct payment settlement dashboard (UPI/Bank)", "HIGH", "Financial transparency builds vendor trust", "Partial", "Week 2"),
        ("Vendor App", "Procurement order management (accept/reject bulk orders)", "HIGH", "Supply chain management core feature", "Missing", "Week 2"),
        ("Vendor App", "Vendor loyalty tier system (Bronze/Silver/Gold)", "MEDIUM", "Incentivizes exclusive sourcing partnerships", "Missing", "Week 5"),
        ("Vendor App", "eNAM integration (National Agriculture Market)", "HIGH", "India-specific: connects to government mandi prices", "Missing", "Week 6-8"),
        ("Vendor App", "Auto-generate invoice PDF on sale completion", "HIGH", "GST compliance requirement", "Partial (flag only)", "Week 2"),
        ("Vendor App", "Barcode/QR code generation per product", "MEDIUM", "Enables dark store scanning at inbound", "Missing", "Week 4"),
        ("Vendor App", "FPO (Farmer Producer Org) group onboarding", "MEDIUM", "India-specific - aggregated sourcing from rural coops", "Missing", "Week 6"),
        ("Vendor App", "Real-time crop price feed integration (APMC/MSP data)", "HIGH", "Data-driven procurement - enables fair pricing", "Missing", "Week 5"),
        ("Vendor App", "Harvest schedule calendar for advance procurement", "MEDIUM", "Reduces stockouts from seasonal supply gaps", "Missing", "Week 4"),
        ("Admin App", "Real-time Operations Command Center (live order map)", "HIGH", "Single pane of glass for ops team - Blinkit Ops feature", "Missing", "Week 2"),
        ("Admin App", "Dynamic pricing engine (AI-based demand/supply pricing)", "HIGH", "Revenue optimization - Zepto key differentiator", "Missing", "Week 5-6"),
        ("Admin App", "Dark Store inventory heatmap", "HIGH", "Visual OOS detection across all dark stores", "Missing", "Week 3"),
        ("Admin App", "Fraud detection system (abnormal order patterns)", "HIGH", "Reduces losses from fake orders, promo abuse", "Missing", "Week 4"),
        ("Admin App", "Customer segmentation & cohort analysis (RFM model)", "HIGH", "Data-driven marketing - Instamart RFM model", "Missing", "Week 5"),
        ("Admin App", "Automated reordering triggers (when stock < threshold)", "HIGH", "Prevents OOS - critical for 10-min delivery promise", "Missing", "Week 3"),
        ("Admin App", "A/B Testing framework for promotions & UI", "MEDIUM", "Data-driven decision making", "Missing", "Week 6"),
        ("Admin App", "Multi-city / Multi-dark-store management", "HIGH", "Scalability requirement for national expansion", "Missing", "Week 4"),
        ("Admin App", "SLA Breach alerting (if order >15 min, auto-alert ops)", "HIGH", "Quality control automation", "Missing", "Week 3"),
        ("Admin App", "Revenue forecast & GMV projections dashboard", "HIGH", "Business intelligence for leadership", "Missing", "Week 4"),
        ("Admin App", "Vendor scorecard & performance ranking", "MEDIUM", "Supply chain quality management", "Missing", "Week 4"),
        ("Admin App", "Coupon & flash sale management with scheduling", "HIGH", "Marketing ops - standard in all q-commerce", "Partial (coupons table)", "Week 2"),
        ("Admin App", "Bulk notification broadcast (WhatsApp/SMS/Push)", "HIGH", "Campaign management tool", "Missing", "Week 3"),
        ("Admin App", "GSTIN verification & automated GST filing assist", "HIGH", "Tax compliance - critical for Indian operations", "Missing", "Week 5"),
        ("Support App", "Multi-channel ticketing (WhatsApp, Email, In-app, Phone)", "HIGH", "Omnichannel support - industry standard", "Partial", "Week 2"),
        ("Support App", "AI-powered auto-resolution for common issues", "HIGH", "Reduces support cost 60% - Zepto uses Freshdesk AI", "Partial (Groq AI)", "Week 2"),
        ("Support App", "SLA-based ticket priority & escalation workflow", "HIGH", "Response time SLA management", "Missing", "Week 2"),
        ("Support App", "Canned responses & knowledge base for agents", "HIGH", "Agent efficiency - reduces handle time 40%", "Missing", "Week 2"),
        ("Support App", "Customer sentiment analysis on tickets (AI)", "MEDIUM", "CSAT prediction - prevents churn", "Missing", "Week 4"),
        ("Support App", "Automated order status update via WhatsApp", "HIGH", "Proactive communication reduces incoming calls 30%", "Missing", "Week 2"),
        ("Support App", "Refund workflow with auto-approval for <Rs200 orders", "HIGH", "Operational efficiency & customer delight", "Missing", "Week 2"),
        ("Support App", "Agent performance dashboard (AHT, CSAT, tickets/hr)", "HIGH", "Quality management for support team", "Missing", "Week 3"),
        ("Monitoring App", "Distributed tracing (Jaeger/Zipkin integration)", "HIGH", "Root cause analysis across microservices", "Missing", "Week 2"),
        ("Monitoring App", "Real-time anomaly detection with auto-alerting", "HIGH", "Proactive issue detection - PagerDuty model", "Missing", "Week 2"),
        ("Monitoring App", "Business metrics dashboard (GMV, order/hr, success rate)", "HIGH", "Business + tech metrics in single pane", "Partial (Grafana)", "Week 2"),
        ("Monitoring App", "Cost per order tracking with profitability alerts", "HIGH", "Unit economics monitoring - critical for q-commerce", "Missing", "Week 3"),
        ("Monitoring App", "SLA compliance tracking per delivery zone", "HIGH", "Operational KPI monitoring", "Missing", "Week 3"),
        ("Monitoring App", "Rider utilization & idle time monitoring", "HIGH", "Fleet efficiency KPI", "Missing", "Week 3"),
        ("Monitoring App", "API latency percentile tracking (p50/p95/p99)", "HIGH", "Performance SLA monitoring", "Partial", "Week 2"),
        ("Monitoring App", "Error budget tracking (SLO/SLI/SLA framework)", "MEDIUM", "Site reliability engineering best practice", "Missing", "Week 4"),
        ("Monitoring App", "Automated runbook execution on alert trigger", "MEDIUM", "Self-healing infrastructure - reduces MTTR by 60%", "Missing", "Week 5"),
    ],
    "UI/UX Enhancement": [
        ("User App", "Sticky 10-min delivery countdown banner on homepage", "HIGH", "Creates urgency - Blinkit signature UI element", "Missing", "Week 1"),
        ("User App", "Bottom navigation bar with cart badge (mobile-first)", "HIGH", "80% Indian users on mobile - bottom nav is standard", "Missing", "Week 1"),
        ("User App", "Infinite scroll with skeleton loading placeholders", "HIGH", "Perceived performance - reduces bounce rate", "Missing", "Week 1"),
        ("User App", "Swipeable product carousel with quick add-to-cart", "HIGH", "Reduces tap count - increases conversions", "Missing", "Week 1"),
        ("User App", "Progressive Web App (PWA) with offline fallback page", "HIGH", "Install-to-homescreen, works offline in low-signal areas", "Missing", "Week 2"),
        ("User App", "Animated delivery status progress (placed->packed->delivered)", "HIGH", "Emotional engagement - Swiggy-style timeline", "Partial", "Week 1"),
        ("User App", "Micro-animations on add-to-cart and wishlist actions", "MEDIUM", "Delight moments - increases engagement", "Missing", "Week 2"),
        ("User App", "Geo-fenced location picker with saved addresses dropdown", "HIGH", "Reduces address entry friction", "Partial", "Week 1"),
        ("User App", "Quantity selector with +/- buttons (not dropdown)", "HIGH", "Quick-add UX pattern - cart edit simplicity", "Missing", "Week 1"),
        ("User App", "Smart search with autocomplete, trending, recent searches", "HIGH", "Reduces time-to-purchase", "Partial", "Week 1"),
        ("User App", "Sticky cart summary bar during checkout", "HIGH", "Reduces cognitive load in checkout", "Missing", "Week 1"),
        ("User App", "One-page checkout (address + payment on single screen)", "HIGH", "Critical conversion optimization - Zepto pattern", "Missing", "Week 2"),
        ("User App", "Accessibility (WCAG 2.1 AA) compliance", "MEDIUM", "Legal requirement + inclusivity", "Missing", "Week 4"),
        ("User App", "Empty state illustrations (empty cart, no results, error)", "MEDIUM", "Better UX for edge cases", "Missing", "Week 2"),
        ("User App", "Contextual upsell at checkout (frequently bought together)", "HIGH", "Increases AOV by 15-20%", "Missing", "Week 2"),
        ("User App", "Dark Mode UI toggle", "MEDIUM", "65% users prefer dark mode - standard feature", "Missing", "Week 2"),
        ("User App", "Product image zoom & 360-degree view", "MEDIUM", "Trust builder for fresh produce", "Missing", "Week 3"),
        ("User App", "In-line coupon code application in cart", "MEDIUM", "Reduces friction in checkout flow", "Missing", "Week 2"),
        ("Delivery App", "Real-time earnings counter (animated Rs ticker during shift)", "HIGH", "Motivational - increases delivery acceptance rate", "Missing", "Week 2"),
        ("Delivery App", "Dark/Night mode optimized for riding conditions", "HIGH", "Rider safety - important for night deliveries", "Missing", "Week 1"),
        ("Delivery App", "Large-tap-target UI optimized for gloves/riding", "HIGH", "Rider ergonomics - Swiggy Sathi app pattern", "Missing", "Week 2"),
        ("Delivery App", "Turn-by-turn audio navigation (hands-free)", "HIGH", "Safety during riding - core feature", "Missing", "Week 2"),
        ("Delivery App", "Tap-to-call customer with masked number", "HIGH", "Privacy + convenience for rider", "Missing", "Week 1"),
        ("Delivery App", "OTP in large font with auto-copy from SMS", "HIGH", "Reduces time fumbling with OTP", "Partial (no auto-copy)", "Week 1"),
        ("Delivery App", "Vibration + alert sound for new order notification", "HIGH", "Ensures rider does not miss orders", "Missing", "Week 1"),
        ("Vendor App", "Mobile-first vendor dashboard with thumb-friendly layout", "HIGH", "Most Indian farmers use mobile - not desktop", "Missing", "Week 2"),
        ("Vendor App", "One-tap stock update (in-stock / out-of-stock toggle)", "HIGH", "Quick inventory management on mobile", "Missing", "Week 1"),
        ("Vendor App", "Payment receipt download as PDF", "HIGH", "GST compliance for vendor bookkeeping", "Missing", "Week 2"),
        ("Vendor App", "Regional language support (Telugu, Hindi, Kannada)", "HIGH", "India inclusion - 70% vendors non-English", "Missing", "Week 3-4"),
        ("Admin App", "Export to Excel/CSV from all data tables", "HIGH", "Operations team requirement", "Missing", "Week 2"),
        ("Admin App", "Collapsible sidebar with keyboard shortcuts", "MEDIUM", "Power user efficiency", "Missing", "Week 2"),
        ("Admin App", "Data table with inline editing", "MEDIUM", "Operational speed for admin tasks", "Missing", "Week 3"),
        ("Admin App", "Interactive demand heatmap overlay on city map", "HIGH", "Visual operations intelligence", "Missing", "Week 3"),
        ("Admin App", "Drag-and-drop dark store zone mapping on map", "MEDIUM", "Visual zone management", "Missing", "Week 4"),
        ("Support App", "Ticket timeline with all communications in one thread", "HIGH", "Context retention for multi-touch tickets", "Missing", "Week 2"),
        ("Support App", "Quick filter chips (by status, category, priority)", "MEDIUM", "Agent workflow efficiency", "Missing", "Week 2"),
        ("Support App", "Chat bubble with typing indicator", "MEDIUM", "Agent engagement UX", "Missing", "Week 3"),
        ("Monitoring App", "Real-time Grafana embed in monitoring app", "HIGH", "Integrated observability view", "Partial (separate)", "Week 2"),
        ("Monitoring App", "One-click incident creation from alert", "HIGH", "Reduces MTTD to MTTR gap", "Missing", "Week 3"),
        ("Monitoring App", "Service dependency graph visualization", "MEDIUM", "Impact analysis during incidents", "Missing", "Week 4"),
    ],
    "DB Query (CRUD) Optimization": [
        ("User App Backend", "Cursor-based (keyset) pagination for /api/products - avoid OFFSET", "HIGH", "OFFSET pagination is O(n) - slow on large datasets", "Not Done", "Week 1"),
        ("User App Backend", "GIN index on products(name) for full-text search with pg_trgm", "HIGH", "LIKE %search% does full table scan - 50x slower without GIN", "Partial (gateway only)", "Week 1"),
        ("User App Backend", "Cache /api/categories & /api/products in Redis (TTL 60s)", "HIGH", "Category data changes rarely - cache hits save 80% DB calls", "Not Done", "Week 1"),
        ("User App Backend", "Composite index on products(category, active, price)", "HIGH", "Multi-column filter without composite index = index merge overhead", "Not Done", "Week 1"),
        ("User App Backend", "Replace SELECT * with named column lists in all queries", "MEDIUM", "SELECT * over-fetches - adds network overhead", "Not Done", "Week 1"),
        ("User App Backend", "Batch wishlist checks using ANY($1) instead of N+1 queries", "HIGH", "N+1 query anti-pattern in wishlist toggle", "Issue Present", "Week 1"),
        ("User App Backend", "PgBouncer connection pooling between services and RDS", "HIGH", "Each service has own pool - wastes RDS connections", "Not Done", "Week 2"),
        ("User App Backend", "Database read replica for all GET endpoints", "HIGH", "Reduces primary DB load - critical for scale", "Not Done", "Week 3"),
        ("Admin Backend", "Single CTE query instead of 11 parallel queries in /api/admin/stats", "HIGH", "11 parallel pool.query() calls waste connections", "Issue Present", "Week 1"),
        ("Admin Backend", "Materialized view for GMV/revenue stats with scheduled refresh", "HIGH", "Live aggregation on large orders table is expensive", "Not Done", "Week 2"),
        ("Admin Backend", "Partial indexes: orders WHERE status='placed' and 'out_for_delivery'", "HIGH", "Active order queries most frequent - partial idx speeds these up", "Not Done", "Week 1"),
        ("Admin Backend", "Row-level security (RLS) for multi-tenant data isolation", "HIGH", "Security & data isolation requirement", "Not Done", "Week 3"),
        ("Admin Backend", "pg_stat_statements extension for query performance monitoring", "HIGH", "Identifies slow queries automatically", "Not Done", "Week 1"),
        ("Admin Backend", "Batch inventory updates using UNNEST for bulk deductions", "HIGH", "Loop-based inventory deduction in delivery service is slow", "Issue Present", "Week 2"),
        ("Admin Backend", "Soft-delete pattern (deleted_at TIMESTAMP) for vendors/products", "MEDIUM", "Hard delete loses audit trail", "Not Done", "Week 2"),
        ("Admin Backend", "BRIN index on orders(created_at) for time-range analytics", "MEDIUM", "BRIN efficient for append-only time-series data", "Not Done", "Week 2"),
        ("Admin Backend", "JSONB for dynamic product attributes (not many nullable columns)", "MEDIUM", "Flexible schema with indexed JSONB > EAV pattern", "Not Done", "Week 3"),
        ("Admin Backend", "CHECK constraints on price, stock, rating columns", "MEDIUM", "DB-level data integrity enforcement", "Not Done", "Week 2"),
        ("Delivery Backend", "PostGIS extension for geospatial queries (nearest rider, zone)", "HIGH", "Haversine in application code slower than PostGIS spatial index", "Not Done", "Week 2"),
        ("Delivery Backend", "SKIP LOCKED for order assignment queue (prevent race conditions)", "HIGH", "Multiple riders can accept same order - needs atomic dequeue", "Not Done", "Week 2"),
        ("Delivery Backend", "Rider GPS location to Redis sorted set (not PostgreSQL)", "HIGH", "DB write per GPS update expensive - Redis O(log n) sorted set optimal", "Not Done", "Week 2"),
        ("Delivery Backend", "Covering index on delivery_orders(status, rider_id, updated_at)", "HIGH", "Active delivery queries need this covering index", "Not Done", "Week 1"),
        ("Delivery Backend", "Partition delivery_orders table by month for archival", "MEDIUM", "Large delivery_orders table will slow over time", "Not Done", "Week 4"),
        ("Vendor Backend", "Cache vendor catalog data per vendor_id in Redis", "MEDIUM", "Vendor product listings fetched on every page load", "Not Done", "Week 2"),
        ("Vendor Backend", "Unique partial index on farmer_quotations WHERE status='PENDING'", "MEDIUM", "Prevent duplicate pending quotations", "Not Done", "Week 2"),
        ("Support Backend", "FTS index on support_tickets(subject, description)", "MEDIUM", "LIKE search on text inefficient for large ticket volumes", "Not Done", "Week 2"),
        ("Support Backend", "resolved_at timestamp column for SLA tracking queries", "HIGH", "Cannot compute resolution time without resolved_at", "Missing Column", "Week 1"),
        ("Support Backend", "Ticket archival - move resolved tickets >90 days to archive table", "MEDIUM", "Keep active tickets table small for performance", "Not Done", "Week 3"),
        ("All Services", "Redis-based idempotency keys for all POST endpoints", "HIGH", "Prevents duplicate order creation on retry", "Not Done", "Week 2"),
        ("All Services", "Database health check with retry backoff on pool.connect()", "HIGH", "Services crash on DB restart instead of graceful reconnect", "Not Done", "Week 1"),
        ("All Services", "Centralize schema migrations to Flyway/Prisma Migrate", "HIGH", "Service startup blocking on migrations is anti-pattern", "Not Done", "Week 2-3"),
        ("All Services", "Query timeout parameter to all pool.query() calls (30s default)", "HIGH", "Runaway queries can block connection pool", "Not Done", "Week 1"),
        ("All Services", "Connection pool monitoring with pg_pool_status metrics", "MEDIUM", "Detect pool exhaustion before it causes outage", "Not Done", "Week 2"),
    ],
    "Dockerfile Optimization": [
        ("All Services", "Multi-stage Docker builds (build vs runtime stages)", "HIGH", "Single stage includes devDependencies - image 2x larger than needed", "Not Done", "Week 1"),
        ("All Services", "Pin exact Node.js version: node:20.18.0-alpine3.20", "HIGH", "Floating tag causes non-reproducible builds", "Not Done", "Week 1"),
        ("All Services", "Complete .dockerignore: node_modules,.git,dist,*.log", "HIGH", "Missing .dockerignore bloats build context", "Partial", "Week 1"),
        ("All Services", "Run as non-root user (addgroup/adduser appuser)", "HIGH", "Security best practice - root in container = risk", "Not Done", "Week 1"),
        ("All Services", "HEALTHCHECK instruction in Dockerfile (not just compose)", "HIGH", "Kubernetes/ECS needs Dockerfile HEALTHCHECK for liveness", "Not Done", "Week 1"),
        ("All Services", "Cache npm install layer: COPY package*.json before COPY . .", "HIGH", "Wrong COPY order breaks layer caching - slower builds", "Not Done", "Week 1"),
        ("All Services", "pnpm ci --frozen-lockfile for reproducible installs", "HIGH", "pnpm install without --frozen-lockfile can mutate lockfile", "Not Done", "Week 1"),
        ("All Services", "Remove devDependencies in production: pnpm prune --prod", "HIGH", "Reduces final image size by 40-60%", "Not Done", "Week 1"),
        ("All Services", "Add NODE_ENV=production ENV in Dockerfile", "HIGH", "Express+packages have faster code paths in production mode", "Not Done", "Week 1"),
        ("All Services", "COPY --chown=node:node to set correct file permissions", "MEDIUM", "Ensures correct permissions without chmod step", "Not Done", "Week 1"),
        ("All Services", "distroless/node:20 base for production stage", "MEDIUM", "Reduces image size 30%, eliminates shell attack vector", "Not Done", "Week 2"),
        ("All Services", "BuildKit cache mounts for pnpm store", "MEDIUM", "Speeds up CI/CD pipeline by 50%", "Not Done", "Week 2"),
        ("All Services", "Docker image vulnerability scanning (Trivy/Snyk) in CI", "HIGH", ".trivyignore exists but no CI pipeline scanning", "Partial", "Week 2"),
        ("All Services", "NODE_OPTIONS=--max-old-space-size=512 to prevent OOM", "MEDIUM", "Prevents Node.js OOM crashes in constrained containers", "Not Done", "Week 2"),
        ("Frontend Services", "Nginx nginx.conf with gzip compression enabled", "HIGH", "Gzip reduces static asset size by 70%", "Missing", "Week 1"),
        ("Frontend Services", "Cache-Control headers for static assets (1 year for hashed)", "HIGH", "Browser caching - reduces CDN origin hits by 90%", "Missing", "Week 1"),
        ("Frontend Services", "Vite build with --mode production, sourcemap disabled", "MEDIUM", "Sourcemaps in production expose internal code", "Not Done", "Week 1"),
        ("All Services", "LABEL metadata (version, maintainer, build date) on images", "LOW", "Image management and auditability", "Not Done", "Week 2"),
    ],
    "DockerCompose Optimization": [
        ("docker-compose.yml", "Resource limits (mem_limit, cpus) for all containers", "HIGH", "Without limits, one service can OOM the host", "Not Done", "Week 1"),
        ("docker-compose.yml", "Logging driver with max-size and max-file (prevent disk fill)", "HIGH", "No log rotation = disk fill = service crash", "Not Done", "Week 1"),
        ("docker-compose.yml", "Redis password authentication (requirepass) in Redis command", "HIGH", "Redis running without auth = security risk", "Not Done", "Week 1"),
        ("docker-compose.yml", "PostgreSQL tuning: shared_buffers, work_mem, max_connections", "HIGH", "Default Postgres config not tuned for application workloads", "Not Done", "Week 1"),
        ("docker-compose.yml", "MongoDB auth env vars (MONGO_INITDB_ROOT_USERNAME)", "HIGH", "MongoDB running without auth in compose", "Not Done", "Week 1"),
        ("docker-compose.yml", "Reduce ports exposure - only expose nginx on 80/443", "HIGH", "All backends exposed on host ports = security risk", "Not Done", "Week 1"),
        ("docker-compose.yml", "init: true for all Node.js services (proper SIGTERM handling)", "MEDIUM", "Without init, Node.js does not receive SIGTERM cleanly", "Not Done", "Week 1"),
        ("docker-compose.yml", "depends_on service_healthy for ALL inter-service dependencies", "HIGH", "Services start before dependencies are ready", "Partial", "Week 1"),
        ("docker-compose.yml", "Named secrets instead of environment variables for credentials", "HIGH", "Env var credentials visible in docker inspect", "Not Done", "Week 2"),
        ("docker-compose.yml", "Isolated network segments (frontend_net, backend_net, db_net)", "HIGH", "All services on default network = lateral movement risk", "Not Done", "Week 2"),
        ("docker-compose.yml", "docker-compose.override.yml for dev-specific settings", "MEDIUM", "Dev/prod separation best practice", "Not Done", "Week 2"),
        ("docker-compose.yml", "restart: on-failure:3 instead of unless-stopped", "MEDIUM", "unless-stopped masks crash loops - on-failure:3 safer", "Not Done", "Week 2"),
        ("docker-compose.yml", "Prometheus & Grafana in compose with pre-built dashboards", "HIGH", "Monitoring stack not part of default compose up", "Partial", "Week 2"),
        ("docker-compose.yml", "Explicit image version pinning for all images (no :latest)", "MEDIUM", "Alpine/latest tags cause unexpected updates", "Not Done", "Week 2"),
        ("docker-compose.yml", "docker-compose.test.yml for integration test runs", "MEDIUM", "Isolated test environment with test DB", "Not Done", "Week 3"),
        ("docker-compose.yml", "tmpfs mount for Redis when used as pure cache (disable AOF)", "LOW", "If Redis is cache-only, disable persistence to improve perf", "Not Done", "Week 3"),
        ("docker-compose.yml", "MongoDB healthcheck with proper mongosh --eval command", "MEDIUM", "Current healthcheck may fail on auth-enabled clusters", "Partial", "Week 1"),
    ],
    "Terraform Code Optimization": [
        ("terraform/main.tf", "RDS Multi-AZ failover configuration for production", "HIGH", "Single-AZ RDS = single point of failure", "Not Done", "Week 2"),
        ("terraform/main.tf", "RDS automated backups - 7-day retention + point-in-time restore", "HIGH", "Data recovery capability - not configured", "Not Done", "Week 1"),
        ("terraform/main.tf", "ElastiCache Redis cluster mode (not single node)", "HIGH", "Single Redis node = cache unavailable during maintenance", "Not Done", "Week 2"),
        ("terraform/main.tf", "ECS Auto-Scaling based on CPU/Memory/RequestCount", "HIGH", "Static task count cannot handle traffic spikes", "Not Done", "Week 2"),
        ("terraform/main.tf", "WAF rule group attached to ALB", "HIGH", "Missing WAF = SQL injection, OWASP Top 10 exposure", "Not Done", "Week 2"),
        ("terraform/main.tf", "AWS GuardDuty for threat detection", "HIGH", "Automated threat intelligence for AWS workload", "Not Done", "Week 2"),
        ("terraform/main.tf", "AWS Secrets Manager for all application secrets", "HIGH", "Credentials in ECS task env = security risk", "Not Done", "Week 2"),
        ("terraform/main.tf", "S3 versioning and server-side encryption (SSE-KMS)", "HIGH", "Data protection for product images and documents", "Not Done", "Week 1"),
        ("terraform/main.tf", "RDS deletion_protection = true for production", "HIGH", "Prevent accidental database deletion", "Not Done", "Week 1"),
        ("terraform/main.tf", "CloudWatch Container Insights for ECS cluster", "HIGH", "Container-level metrics for scaling decisions", "Not Done", "Week 1"),
        ("terraform/main.tf", "SQS dead-letter queues (DLQ) for all SQS queues", "HIGH", "Failed messages lost without DLQ - SQS module exists", "Not Done", "Week 2"),
        ("terraform/main.tf", "AWS Backup plan for RDS and EFS resources", "HIGH", "Centralized backup management and compliance", "Not Done", "Week 2"),
        ("terraform/main.tf", "VPC Flow Logs for network traffic auditing", "MEDIUM", "Security compliance & incident investigation", "Not Done", "Week 2"),
        ("terraform/main.tf", "ECR image lifecycle policy (auto-clean untagged images)", "MEDIUM", "ECR storage costs accumulate without cleanup policy", "Not Done", "Week 1"),
        ("terraform/main.tf", "CloudFront OAC replacing legacy OAI", "MEDIUM", "OAI deprecated by AWS - OAC is current standard", "Not Done", "Week 2"),
        ("terraform/main.tf", "Terraform workspaces for dev/staging/prod separation", "HIGH", "Single environment configuration - no env separation", "Not Done", "Week 2"),
        ("terraform/main.tf", "RDS parameter group with custom Postgres tuning", "MEDIUM", "Default parameter group not optimized", "Not Done", "Week 2"),
        ("terraform/main.tf", "ALB access logs to S3 for compliance and debugging", "MEDIUM", "Request-level audit trail", "Not Done", "Week 2"),
        ("terraform/main.tf", "NAT instance for dev (not NAT Gateway) - saves $27/month", "MEDIUM", "NAT Gateway costs $32/month - NAT instance $5/month for dev", "Not Done", "Week 2"),
        ("terraform/main.tf", "Tagging strategy enforcement with required tag validation", "LOW", "Consistent tagging for cost allocation", "Partial", "Week 3"),
    ],
    "Workflow Optimization": [
        ("CI/CD", "GitHub Actions CI: lint + test + build + docker push", "HIGH", ".github folder exists but no workflow YAML", "Missing", "Week 1"),
        ("CI/CD", "Automated integration tests with Docker Compose test env", "HIGH", "No integration tests - releases untested", "Missing", "Week 2"),
        ("CI/CD", "Blue-green deployment for zero-downtime releases on ECS", "HIGH", "Current deployment causes downtime", "Missing", "Week 3"),
        ("CI/CD", "Trivy security scan in CI before image push to ECR", "HIGH", ".trivyignore exists but no CI scanning pipeline", "Missing", "Week 2"),
        ("CI/CD", "Semantic versioning with auto-changelog generation", "MEDIUM", "No version tracking across microservices", "Missing", "Week 3"),
        ("CI/CD", "Renovate Bot / Dependabot for dependency updates", "MEDIUM", "Stale dependencies accumulate vulnerabilities", "Missing", "Week 2"),
        ("CI/CD", "Canary deployments with traffic split (10%->50%->100%)", "HIGH", "Risk mitigation for production releases", "Missing", "Week 4"),
        ("CI/CD", "PR-based preview environments using AWS ECS on-demand tasks", "MEDIUM", "Faster developer feedback loop", "Missing", "Week 4"),
        ("Development", "Modular route/controller/service structure (not monolithic index.ts)", "HIGH", "2000+ line index.ts is unmaintainable tech debt", "Not Done", "Week 2-3"),
        ("Development", "Shared TypeScript types package across all services (monorepo)", "HIGH", "Type duplication across services - divergence risk", "Not Done", "Week 2"),
        ("Development", "API contract testing with OpenAPI/Swagger spec generation", "MEDIUM", "No API documentation or contract validation", "Missing", "Week 3"),
        ("Development", "Event-driven architecture with SQS for order state transitions", "HIGH", "Direct DB polling/SSE not scalable - SQS provisioned but unused", "Not Done", "Week 3-4"),
        ("Development", "Circuit breaker pattern for inter-service HTTP calls", "HIGH", "Service cascade failures with no circuit breaker", "Missing", "Week 3"),
        ("Development", "Structured JSON logging with log levels across all services", "HIGH", "console.log in production - not searchable/filterable", "Not Done", "Week 1"),
        ("Development", "Graceful shutdown handling (SIGTERM) in all services", "HIGH", "Services drop in-flight requests on restart", "Missing", "Week 1"),
        ("Development", "Rate limiting middleware on gateway (Redis sliding window)", "HIGH", "No rate limiting = DoS vulnerability", "Missing", "Week 1"),
        ("Development", "Request validation middleware using Zod/Joi schemas", "HIGH", "Manual validation scattered across routes - error prone", "Not Done", "Week 2"),
        ("Development", "Correlation ID propagation across all service-to-service calls", "HIGH", "Partial in gateway only - not propagated to other services", "Partial", "Week 2"),
        ("Delivery Operations", "Automated order-to-rider assignment algorithm (geospatial)", "HIGH", "Manual assignment bottleneck for 10-min SLA", "Missing", "Week 3"),
        ("Delivery Operations", "Rider shift scheduling system with capacity planning", "MEDIUM", "Workforce management for peak hours", "Missing", "Week 4"),
        ("Delivery Operations", "Dynamic delivery zone management based on rider density", "HIGH", "Static zones do not adapt to supply/demand", "Missing", "Week 4"),
        ("Delivery Operations", "Auto-escalation when order exceeds SLA time", "HIGH", "No SLA breach automation - manual ops intervention needed", "Missing", "Week 3"),
        ("Procurement", "Auto procurement trigger when inventory < reorder point", "HIGH", "Manual procurement tracking is error-prone", "Missing", "Week 3"),
        ("Procurement", "Vendor onboarding checklist with document verification", "HIGH", "Manual vendor verification - compliance risk", "Missing", "Week 3"),
        ("Procurement", "Quality sampling workflow with photo evidence at inbound", "MEDIUM", "Quality gate at dark store inbound", "Missing", "Week 4"),
    ],
    "System Design Optimization": [
        ("Architecture", "WebSocket + Redis pub/sub for rider GPS (not SSE+DB polling)", "HIGH", "SSE with DB polling every update is O(n) - WebSocket+Redis is O(1)", "Not Done", "Week 2"),
        ("Architecture", "API Gateway pattern with proper routing and load balancing", "HIGH", "Gateway does everything - violates single responsibility", "Not Done", "Week 3"),
        ("Architecture", "SQS for order processing to decouple services", "HIGH", "Direct service calls = tight coupling - SQS provisioned but unused", "Not Done", "Week 3"),
        ("Architecture", "Redis caching layer for product catalog (cache-aside pattern)", "HIGH", "Product catalog queried on every page load - no caching", "Not Done", "Week 1"),
        ("Architecture", "Outbox pattern for reliable event publishing on order changes", "HIGH", "Lost events cause inconsistent state across services", "Missing", "Week 4"),
        ("Architecture", "API versioning (/api/v1/ prefix) for backward compatibility", "HIGH", "No versioning - breaking changes affect all clients", "Missing", "Week 2"),
        ("Architecture", "Distributed session management with Redis for horizontal scaling", "HIGH", "JWT stateless but rider/vendor sessions need Redis-backed sessions", "Missing", "Week 2"),
        ("Architecture", "Idempotent order placement with distributed locks (Redis SETNX)", "HIGH", "Duplicate orders on network retry - critical bug", "Missing", "Week 2"),
        ("Architecture", "CQRS for order service (read replica for queries)", "MEDIUM", "High-read order status queries should use read replica", "Not Done", "Week 5"),
        ("Architecture", "Multi-region failover for business continuity", "MEDIUM", "Single-region = region outage = full downtime", "Not Done", "Week 8"),
        ("Database", "Read replicas for all analytical/reporting queries", "HIGH", "Reporting queries on primary DB impact write performance", "Not Done", "Week 2"),
        ("Database", "Data archival: orders >1 year to S3 + Athena", "MEDIUM", "Active table size grows indefinitely", "Not Done", "Week 6"),
        ("Database", "Connection pool monitoring and auto-scaling", "HIGH", "Pool exhaustion silently queues requests - no visibility", "Not Done", "Week 2"),
        ("Database", "Change Data Capture (CDC) with Debezium for event streaming", "MEDIUM", "Real-time event propagation from DB changes", "Not Done", "Week 6"),
        ("Security", "OAuth 2.0 / OIDC with refresh token rotation", "HIGH", "Current JWT implementation basic - no refresh token", "Not Done", "Week 2"),
        ("Security", "RBAC at middleware level (not in individual route handlers)", "HIGH", "Role checks scattered in route handlers - not centralized", "Not Done", "Week 2"),
        ("Security", "PII encryption at rest (phone, Aadhaar, bank account numbers)", "HIGH", "Personal data in plaintext - DPDPA compliance violation", "Not Done", "Week 2"),
        ("Security", "HMAC request signing for service-to-service calls", "HIGH", "No authentication between internal microservices", "Missing", "Week 3"),
        ("Security", "CORS policy restriction (specific origins, not origin: true)", "HIGH", "CORS wildcard allows any domain to make authenticated requests", "Not Done", "Week 1"),
        ("Security", "Request size limiting on express.json(limit)", "MEDIUM", "Large payload DoS attacks possible", "Missing", "Week 1"),
        ("Security", "API key management for B2B vendor integrations", "MEDIUM", "No API key issuance/rotation mechanism", "Missing", "Week 4"),
    ],
    "Business Logic Correction & Optimization": [
        ("Delivery Service", "CRITICAL BUG: OTP '123456'/'1234' hardcoded as valid OTPs", "CRITICAL", "Backdoor OTP allows anyone to mark order delivered - fraud risk!", "Bug Present", "Immediate"),
        ("Delivery Service", "CRITICAL BUG: Rider auto-APPROVED on registration (skip KYC)", "CRITICAL", "status=APPROVED hardcoded - anyone can become rider", "Bug Present", "Immediate"),
        ("Vendor Service", "CRITICAL BUG: Vendor default password hardcoded as 'password123'", "CRITICAL", "Default weak password for all vendor accounts = security hole", "Bug Present", "Immediate"),
        ("Vendor Service", "CRITICAL: Bank account details not encrypted at rest", "CRITICAL", "DPDPA / RBI data localization compliance violation", "Bug Present", "Immediate"),
        ("Admin Service", "CRITICAL: /api/admin/settings accessible without JWT auth", "CRITICAL", "Unauthenticated PUT can modify all platform settings", "Bug Present", "Immediate"),
        ("All Services", "CRITICAL: JWT secret defaults to 'sunotal-jwt-secret' (trivially guessable)", "CRITICAL", "Hardcoded weak JWT secret = authentication bypass possible", "Bug Present", "Immediate"),
        ("All Services", "CRITICAL: CORS set to origin:true for all services", "CRITICAL", "CSRF attacks possible from any domain", "Bug Present", "Immediate"),
        ("User/Admin Service", "Wallet deduction not atomic - race condition on concurrent orders", "HIGH", "Two concurrent orders can both succeed with insufficient balance", "Bug Present", "Week 1"),
        ("User/Admin Service", "Coupon used_count not incremented atomically - flash sale race", "HIGH", "Multiple users can exceed coupon usage_limit during flash sale", "Bug Present", "Week 1"),
        ("User/Admin Service", "Stock deduction at 'picked_up' not 'order_placed' - overselling", "HIGH", "Overselling possible between order placement and pickup", "Bug Present", "Week 1"),
        ("User/Admin Service", "Delivery fee: per_km_rate in DB but not used in checkout calc", "HIGH", "Delivery fee may be incorrect - using static hardcoded values", "Bug Present", "Week 1"),
        ("User/Admin Service", "Order total missing tax validation - GST not calculated correctly", "HIGH", "GST not applied correctly for all product categories", "Bug Present", "Week 1"),
        ("User/Admin Service", "Password strength validation missing before hashing", "HIGH", "Users can set single-character passwords", "Missing", "Week 1"),
        ("User/Admin Service", "Referral code column exists but never populated or validated", "MEDIUM", "Referral system incomplete - dead code", "Bug Present", "Week 2"),
        ("Delivery Service", "Payout credit hardcoded at Rs45 - should be dynamic (distance/value)", "HIGH", "Fixed payout ignores distance-based economics", "Bug Present", "Week 1"),
        ("Delivery Service", "Rider ID generated as timestamp - not globally unique", "HIGH", "r_${Date.now()} can collide under concurrent registrations", "Bug Present", "Week 1"),
        ("Delivery Service", "ETA uses fixed 25km/h speed - no traffic/time-of-day consideration", "MEDIUM", "Inaccurate ETA damages customer trust", "Bug Present", "Week 2"),
        ("Delivery Service", "GPS destination = current_lat + 0.015 offset - wrong algorithm", "HIGH", "dest_lat = current_lat+0.015 is placeholder - not actual destination", "Bug Present", "Week 1"),
        ("Delivery Service", "Delivery slot hardcoded - not based on warehouse capacity", "HIGH", "Static slots do not reflect real capacity", "Bug Present", "Week 2"),
        ("Admin Service", "AWS cost calculation hardcoded (not from Cost Explorer API)", "HIGH", "Static cost figures are inaccurate and misleading in dashboard", "Bug Present", "Week 2"),
        ("Admin Service", "deliverySuccessRate hardcoded to 100 in admin stats", "HIGH", "Misleading metric - real success rate not tracked", "Bug Present", "Week 1"),
        ("Admin Service", "Quotation price markup fixed at 10% - no configurable margin mgmt", "MEDIUM", "Margin should be configurable per category/vendor tier", "Bug Present", "Week 2"),
        ("Admin Service", "Invoice generation flag set without actual PDF generation", "HIGH", "GST compliance - invoices marked generated but no PDF exists", "Bug Present", "Week 2"),
        ("Vendor Service", "Vendor auto-approved via admin registration (bypasses KYC)", "HIGH", "Admin registration bypasses onboarding workflow", "Bug Present", "Week 1"),
        ("Vendor Service", "Quotation ID uses Math.random() - not truly unique under concurrency", "MEDIUM", "QUOTE-XXXX collision possible in high-volume scenarios", "Bug Present", "Week 1"),
        ("Vendor Service", "GST invoice logic missing - TDS deduction not implemented", "HIGH", "Tax compliance - TDS @2% on vendor payments > Rs30,000", "Missing", "Week 3"),
        ("Support Service", "AI chat has no rate limiting - Groq API abuse possible", "HIGH", "Groq API has per-minute limits - no user-level rate limiting", "Bug Present", "Week 1"),
        ("Support Service", "Ticket resolution does not notify user (no email/SMS/push)", "HIGH", "Customers do not know their ticket was resolved", "Missing", "Week 2"),
        ("Support Service", "No SLA tracking - ticket created_at exists but no breach detection", "HIGH", "Support SLA promises unenforceable without tracking", "Missing", "Week 1"),
        ("Support Service", "Ticket ID not guaranteed unique under high load", "MEDIUM", "TKT-2026-${timestamp} can collide under concurrent creation", "Bug Present", "Week 1"),
        ("All Services", "Error messages expose internal stack traces to clients", "HIGH", "Information disclosure - err?.message leaked to client", "Bug Present", "Week 1"),
        ("All Services", "No XSS input sanitization on text fields (name, description)", "HIGH", "Stored XSS possible via vendor product descriptions", "Missing", "Week 1"),
        ("All Services", "No request size limiting on express.json()", "MEDIUM", "Large payload DoS attacks possible - no limit set", "Missing", "Week 1"),
        ("All Services", "Service-to-service calls use plain HTTP without authentication", "HIGH", "Internal API calls can be spoofed within network", "Bug Present", "Week 2"),
    ],
}

def generate_excel(output_path):
    from openpyxl import Workbook
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    wb.remove(wb.active)

    DARK  = "1A1A2E"
    ACCENT = "0F3460"
    RED   = "E94560"
    CRIT  = "C62828"
    HIGH  = "E65100"
    MED   = "F57F17"
    LOW   = "2E7D32"

    def fill(c): return PatternFill("solid", fgColor=c)
    def thin_border():
        s = Side(style='thin', color="CCCCCC")
        return Border(left=s, right=s, top=s, bottom=s)

    def p_fill(p):
        if "CRITICAL" in p.upper(): return fill(CRIT)
        if "HIGH" in p.upper(): return fill(HIGH)
        if "MEDIUM" in p.upper(): return fill(MED)
        return fill(LOW)

    def p_font(p):
        dark = "CRITICAL" in p.upper() or "HIGH" in p.upper()
        return Font(bold=True, size=10, color="FFFFFF" if dark else "000000")

    # ── OVERVIEW SHEET ────────────────────────────────────────────────────────
    ws0 = wb.create_sheet("Overview")
    ws0.sheet_view.showGridLines = False

    ws0.merge_cells("A1:I1")
    ws0["A1"].value = "SUNOTAL QUICK COMMERCE — COMPREHENSIVE ENHANCEMENT REPORT"
    ws0["A1"].fill = fill(DARK)
    ws0["A1"].font = Font(bold=True, size=18, color="FFFFFF")
    ws0["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws0.row_dimensions[1].height = 45

    total_enhancements = sum(len(v) for v in ENHANCEMENT_DATA.values())
    ws0.merge_cells("A2:I2")
    ws0["A2"].value = f"Generated: {datetime.now().strftime('%B %d, %Y %H:%M')}  |  Total Enhancements: {total_enhancements}  |  Applications: User, Admin, Vendor, Delivery, Support, Monitoring"
    ws0["A2"].fill = fill(ACCENT)
    ws0["A2"].font = Font(size=11, color="FFFFFF")
    ws0["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws0.row_dimensions[2].height = 25

    headers4 = ["#", "Category", "Count", "Critical", "High", "Medium", "Low", "Timeline", "Progress"]
    cols4 = list("ABCDEFGHI")
    widths4 = [5, 40, 10, 10, 10, 10, 10, 18, 20]
    for col, h, w in zip(cols4, headers4, widths4):
        ws0.column_dimensions[col].width = w
        c = ws0[f"{col}4"]
        c.value = h; c.fill = fill(RED)
        c.font = Font(bold=True, size=11, color="FFFFFF")
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border()
    ws0.row_dimensions[4].height = 30

    for ri, (sheet_name, items) in enumerate(ENHANCEMENT_DATA.items(), 5):
        crits  = sum(1 for x in items if "CRITICAL" in x[2].upper())
        highs  = sum(1 for x in items if "HIGH" in x[2].upper() and "CRITICAL" not in x[2].upper())
        meds   = sum(1 for x in items if "MEDIUM" in x[2].upper())
        lows   = len(items) - crits - highs - meds
        rowfill = fill("F0F4FF") if ri % 2 == 0 else fill("FFFFFF")
        vals = [ri-4, sheet_name, len(items), crits, highs, meds, lows, "Weeks 1-8", "[ ] In Queue"]
        for val, col in zip(vals, cols4):
            c = ws0[f"{col}{ri}"]
            c.value = val; c.fill = rowfill
            c.font = Font(size=10)
            c.alignment = Alignment(horizontal="center" if col != "B" else "left", vertical="center")
            c.border = thin_border()
        ws0.row_dimensions[ri].height = 22

    # ── QUICK COMMERCE FEATURES REFERENCE ────────────────────────────────────
    ws_qc = wb.create_sheet("QC Features Reference")
    ws_qc.sheet_view.showGridLines = False
    ws_qc.column_dimensions["A"].width = 6
    ws_qc.column_dimensions["B"].width = 45
    ws_qc.column_dimensions["C"].width = 65

    ws_qc.merge_cells("A1:C1")
    ws_qc["A1"].value = "WORLD-CLASS QUICK COMMERCE FEATURES — GLOBAL + INDIA BENCHMARK"
    ws_qc["A1"].fill = fill(DARK)
    ws_qc["A1"].font = Font(bold=True, size=13, color=RED)
    ws_qc["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws_qc.row_dimensions[1].height = 35

    qc_feats = [
        ("🏭", "DARK STORE NETWORK", "Hyperlocal 2-3km radius micro-warehouses stocking 2,000-5,000 SKUs for 10-min delivery"),
        ("🤖", "AI DEMAND FORECASTING", "ML models predict demand per zone/hour - reduces waste 30%, OOS 40% (Zepto, Blinkit)"),
        ("🗺️", "SMART ORDER DISPATCH", "Geospatial nearest-rider auto-assignment within 30 seconds of order placement"),
        ("📡", "REAL-TIME GPS TRACKING", "WebSocket-based live rider tracking with traffic-aware ETA recalculation"),
        ("🔄", "SUBSCRIPTION DELIVERY", "Daily milk/eggs recurring orders with UPI Autopay - BigBasket BB Daily model"),
        ("💰", "DYNAMIC SURGE PRICING", "Time/demand-based delivery fee - reduces deficit hours and incentivizes supply"),
        ("🎮", "GAMIFIED RIDER INCENTIVES", "Daily/weekly streak bonuses, badges, leaderboards - reduces rider churn 40%"),
        ("🌐", "ONDC INTEGRATION", "India Open Network for Digital Commerce - expand to 250M+ ONDC network buyers"),
        ("📱", "VOICE COMMERCE", "Multilingual voice search (Telugu, Hindi, English) - 60% Tier-2 users prefer voice"),
        ("💳", "UPI AUTOPAY MANDATES", "Recurring mandate for subscriptions - India preferred payment rail (1.4B users)"),
        ("🎁", "LOYALTY PROGRAM", "Zepto Pass / Blinkit Club - subscription with free delivery + exclusive early deals"),
        ("📦", "BATCH DELIVERY", "Club 2-3 orders per rider trip - reduces cost per delivery by 35%"),
        ("❄️", "COLD CHAIN MANAGEMENT", "Temperature monitoring dark store to doorstep for dairy/meat/ice cream"),
        ("🏪", "MULTI-DARK-STORE", "Order split/fulfill from nearest dark store with geofencing and zone management"),
        ("⚡", "10-MIN SLA PROMISE", "Prominent UI countdown + penalty refund if missed - primary brand differentiator"),
        ("🌿", "FRESHNESS GUARANTEE", "Return/replace without questions for fresh produce - Zepto/Blinkit standard"),
        ("📊", "UNIT ECONOMICS TRACKING", "Cost per delivery, GMV/rider, waste %, OOS rate - operational KPI dashboard"),
        ("🔗", "eNAM + ONDC", "Direct mandi price integration - enables fair direct procurement from farmers"),
        ("🛡️", "FSSAI COMPLIANCE", "Food safety license validation for all food vendors - regulatory requirement"),
        ("📲", "WHATSAPP COMMERCE", "Order via WhatsApp chatbot - 530M WhatsApp users in India (Tier-2/3 adoption)"),
    ]
    for i, (icon, feat, desc) in enumerate(qc_feats, 3):
        rf = fill("F0F4FF") if i%2==0 else fill("FFFFFF")
        for col, val in zip(["A","B","C"], [icon, feat, desc]):
            c = ws_qc[f"{col}{i}"]
            c.value = val; c.fill = rf
            c.font = Font(bold=(col=="B"), size=10)
            c.alignment = Alignment(horizontal="center" if col=="A" else "left", vertical="center", wrap_text=True)
            c.border = thin_border()
        ws_qc.row_dimensions[i].height = 35

    # ── ENHANCEMENT SHEETS ────────────────────────────────────────────────────
    SHEET_HDR = ["Done?", "#", "Service/Module", "Enhancement / Recommendation", "Priority", "Business Rationale", "Current Status", "Timeline", "Notes"]
    SHEET_WID = [10, 5, 22, 65, 12, 55, 20, 14, 30]

    TAB_COLORS = {
        "Application Feature": "E94560",
        "UI/UX Enhancement": "6C63FF",
        "DB Query (CRUD) Optimization": "00B4D8",
        "Dockerfile Optimization": "FFB703",
        "DockerCompose Optimization": "06D6A0",
        "Terraform Code Optimization": "FB8500",
        "Workflow Optimization": "8338EC",
        "System Design Optimization": "3A86FF",
        "Business Logic Correction & Optimization": "FF006E",
    }

    for sheet_name, items in ENHANCEMENT_DATA.items():
        tc = TAB_COLORS.get(sheet_name, "3A86FF")
        ws = wb.create_sheet(sheet_name[:31])
        ws.sheet_view.showGridLines = False
        ws.sheet_properties.tabColor = tc

        ws.merge_cells("A1:I1")
        ws["A1"].value = f"{sheet_name.upper()} — SUNOTAL ENHANCEMENTS ({len(items)} items)"
        ws["A1"].fill = fill(DARK)
        ws["A1"].font = Font(bold=True, size=13, color="FFFFFF")
        ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 38

        ws.merge_cells("A2:I2")
        ws["A2"].value = "Mark 'Done?' column with X when completed | Priority: CRITICAL > HIGH > MEDIUM > LOW"
        ws["A2"].fill = fill(tc)
        ws["A2"].font = Font(size=10, color="FFFFFF")
        ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[2].height = 18

        cols = list("ABCDEFGHI")
        for col, h, w in zip(cols, SHEET_HDR, SHEET_WID):
            ws.column_dimensions[col].width = w
            c = ws[f"{col}3"]
            c.value = h; c.fill = fill(tc)
            c.font = Font(bold=True, size=11, color="FFFFFF")
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            c.border = thin_border()
        ws.row_dimensions[3].height = 30

        for ri, item in enumerate(items, 4):
            service, enhancement, priority, rationale, status, timeline = item
            rf = fill("F8F9FA") if ri%2==0 else fill("FFFFFF")

            status_f = fill("FFF3CD") if any(x in status.lower() for x in ["partial","done"]) else \
                       fill("FFEBEE") if any(x in status.lower() for x in ["bug","missing","not done","issue"]) else rf

            vals  = ["[ ]", ri-3, service, enhancement, priority, rationale, status, timeline, ""]
            fills = [fill("E8F5E9"), rf, rf, rf, p_fill(priority), rf, status_f, rf, fill("FFFDE7")]
            fonts = [Font(size=13, bold=True), Font(size=10), Font(size=10, bold=True), Font(size=10),
                     p_font(priority), Font(size=9, italic=True, color="555555"),
                     Font(size=10), Font(size=10, bold=True, color="1565C0"), Font(size=9, italic=True, color="888888")]
            aligns = [
                Alignment(horizontal="center", vertical="center"),
                Alignment(horizontal="center", vertical="center"),
                Alignment(horizontal="left", vertical="center", wrap_text=True),
                Alignment(horizontal="left", vertical="center", wrap_text=True),
                Alignment(horizontal="center", vertical="center"),
                Alignment(horizontal="left", vertical="center", wrap_text=True),
                Alignment(horizontal="center", vertical="center", wrap_text=True),
                Alignment(horizontal="center", vertical="center"),
                Alignment(horizontal="left", vertical="center"),
            ]
            for col, val, f, fnt, aln in zip(cols, vals, fills, fonts, aligns):
                c = ws[f"{col}{ri}"]
                c.value = val; c.fill = f; c.font = fnt; c.alignment = aln; c.border = thin_border()

            ws.row_dimensions[ri].height = 48 if len(enhancement) > 80 else 35

        ws.freeze_panes = "A4"

    # ── PROGRESS TRACKER ──────────────────────────────────────────────────────
    wsp = wb.create_sheet("Progress Tracker")
    wsp.sheet_view.showGridLines = False

    wsp.merge_cells("A1:F1")
    wsp["A1"].value = "SUNOTAL ENHANCEMENT PROGRESS TRACKER"
    wsp["A1"].fill = fill(DARK)
    wsp["A1"].font = Font(bold=True, size=16, color="FFFFFF")
    wsp["A1"].alignment = Alignment(horizontal="center", vertical="center")
    wsp.row_dimensions[1].height = 40

    for col, h, w in zip("ABCDEF", ["Category","Total","Completed","In Progress","Not Started","% Done"], [45,10,14,14,14,14]):
        wsp.column_dimensions[col].width = w
        c = wsp[f"{col}3"]
        c.value = h; c.fill = fill(ACCENT)
        c.font = Font(bold=True, size=11, color="FFFFFF")
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border()
    wsp.row_dimensions[3].height = 28

    for i, (cat, items) in enumerate(ENHANCEMENT_DATA.items(), 4):
        rf = fill("F0F4FF") if i%2==0 else fill("FFFFFF")
        for col, val in zip("ABCDEF", [cat, len(items), 0, 0, len(items), "0%"]):
            c = wsp[f"{col}{i}"]
            c.value = val; c.fill = rf
            c.font = Font(size=10, bold=(col=="A"))
            c.alignment = Alignment(horizontal="center" if col!="A" else "left", vertical="center")
            c.border = thin_border()
        wsp.row_dimensions[i].height = 22

    total_row = len(ENHANCEMENT_DATA) + 4
    wsp.merge_cells(f"A{total_row}:B{total_row}")
    wsp[f"A{total_row}"].value = "TOTAL"
    wsp[f"A{total_row}"].fill = fill(DARK); wsp[f"A{total_row}"].font = Font(bold=True, size=11, color="FFFFFF")
    wsp[f"C{total_row}"].value = sum(len(v) for v in ENHANCEMENT_DATA.values())
    wsp[f"C{total_row}"].fill = fill(RED); wsp[f"C{total_row}"].font = Font(bold=True, size=12, color="FFFFFF")
    wsp[f"C{total_row}"].alignment = Alignment(horizontal="center")

    wb.save(output_path)
    print(f"  Excel saved: {output_path}")

def generate_pdf(output_path):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, PageBreak, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=1.5*cm, leftMargin=1.5*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    story = []
    styles = getSampleStyleSheet()

    def h(text, sz=14, color="#1A1A2E", bg=None, bold=True):
        s = ParagraphStyle("_h", fontSize=sz,
            textColor=colors.HexColor(color),
            backColor=colors.HexColor(bg) if bg else None,
            fontName="Helvetica-Bold" if bold else "Helvetica",
            spaceAfter=6, spaceBefore=10,
            leftIndent=0, borderPadding=(6,10,6,10) if bg else 0)
        return Paragraph(text, s)

    body = ParagraphStyle("body", fontSize=9, textColor=colors.HexColor("#333333"),
                          spaceAfter=4, leading=14)

    def section_bar(text, color="#1A1A2E"):
        return Table([[Paragraph(text, ParagraphStyle("sb", fontSize=13,
                textColor=colors.white, fontName="Helvetica-Bold"))]],
            colWidths=[doc.width],
            style=TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), colors.HexColor(color)),
                ("TOPPADDING",(0,0),(-1,-1),9), ("BOTTOMPADDING",(0,0),(-1,-1),9),
                ("LEFTPADDING",(0,0),(-1,-1),14),
            ]))

    # COVER
    story.append(Spacer(1, 1.5*cm))
    story.append(h("SUNOTAL QUICK COMMERCE", sz=26, color="#1A1A2E"))
    story.append(h("Comprehensive Enhancement & Recommendation Report", sz=16, color="#0F3460"))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=3, color=colors.HexColor("#E94560")))
    story.append(Spacer(1, 0.4*cm))

    total = sum(len(v) for v in ENHANCEMENT_DATA.values())
    crits = sum(1 for items in ENHANCEMENT_DATA.values() for x in items if "CRITICAL" in x[2].upper())

    meta = [
        ["Platform", "Sunotal Full-Stack Microservices Quick Commerce"],
        ["Services Covered", "User, Admin, Vendor, Delivery, Support, Monitoring"],
        ["Report Date", datetime.now().strftime("%B %d, %Y")],
        ["Total Enhancements", str(total)],
        ["Critical Issues", f"{crits} — FIX IMMEDIATELY"],
        ["Enhancement Categories", "9 (App Features, UI/UX, DB, Dockerfile, Compose, Terraform, Workflow, System Design, Business Logic)"],
    ]
    mt = Table(meta, colWidths=[5*cm, 11*cm])
    mt.setStyle(TableStyle([
        ("FONTNAME",(0,0),(0,-1),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),10),
        ("TEXTCOLOR",(0,0),(0,-1),colors.HexColor("#0F3460")),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.HexColor("#F0F4FF"),colors.white]),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
        ("LEFTPADDING",(0,0),(-1,-1),8),
        ("BOX",(0,0),(-1,-1),1,colors.HexColor("#CCCCCC")),
        ("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#EEEEEE")),
    ]))
    story.append(mt)
    story.append(PageBreak())

    # SUMMARY
    story.append(section_bar("EXECUTIVE SUMMARY", "#1A1A2E"))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "This exhaustive audit benchmarks the Sunotal Quick Commerce platform against world-class standards "
        "(Zepto, Blinkit, Swiggy Instamart, Gorillas, Getir, GoPuff). The platform has strong foundations "
        "in microservices architecture, PostgreSQL, and real-time delivery tracking. However, critical security "
        "vulnerabilities, feature gaps, and infrastructure risks require immediate attention.",
        body))

    story.append(Spacer(1, 0.3*cm))
    sum_data = [
        ["Metric", "Value", "Implication"],
        ["Total Enhancements Identified", str(total), "Across all 6 applications"],
        ["CRITICAL Security Issues", str(crits), "Immediate fix required — fraud/breach risk"],
        ["HIGH Priority Items", str(sum(1 for items in ENHANCEMENT_DATA.values() for x in items if "HIGH" in x[2].upper() and "CRITICAL" not in x[2].upper())), "Core gaps vs competitors — fix in Sprint 1-2"],
        ["Enhancement Categories", "9", "Full stack: UI to Infra to Business Logic"],
        ["Applications Audited", "6", "User, Admin, Vendor, Delivery, Support, Monitoring"],
    ]
    st = Table(sum_data, colWidths=[6*cm, 3*cm, 7.5*cm])
    st.setStyle(TableStyle([
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#0F3460")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTSIZE",(0,0),(-1,-1),9),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#F8F9FA"),colors.white]),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
        ("LEFTPADDING",(0,0),(-1,-1),6),
        ("BOX",(0,0),(-1,-1),1,colors.HexColor("#CCCCCC")),
        ("INNERGRID",(0,0),(-1,-1),0.3,colors.HexColor("#EEEEEE")),
        ("TEXTCOLOR",(0,2),(0,2),colors.HexColor("#C62828")),
    ]))
    story.append(st)
    story.append(PageBreak())

    # CRITICAL BUGS
    story.append(section_bar("CRITICAL ISSUES — FIX IMMEDIATELY", "#C62828"))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("The following represent immediate security, fraud, and compliance risks:", body))
    story.append(Spacer(1, 0.2*cm))

    crit_items = [(sn, *item) for sn, items in ENHANCEMENT_DATA.items()
                  for item in items if "CRITICAL" in item[2].upper()]
    cd = [["#", "Service", "Critical Issue", "Risk"]]
    for i, (sn, srv, enh, pri, rat, sta, tim) in enumerate(crit_items, 1):
        cd.append([str(i), srv, enh[:75], rat[:70]])

    ct = Table(cd, colWidths=[0.8*cm, 3.5*cm, 8.2*cm, 4*cm])
    ct.setStyle(TableStyle([
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#C62828")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTSIZE",(0,0),(-1,-1),8),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#FFF5F5"),colors.HexColor("#FFEBEE")]),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("LEFTPADDING",(0,0),(-1,-1),4),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("BOX",(0,0),(-1,-1),1,colors.HexColor("#C62828")),
        ("INNERGRID",(0,0),(-1,-1),0.3,colors.HexColor("#FFCCCC")),
    ]))
    story.append(ct)
    story.append(PageBreak())

    # PER CATEGORY
    CAT_COLORS = {
        "Application Feature": "#E94560",
        "UI/UX Enhancement": "#6C63FF",
        "DB Query (CRUD) Optimization": "#00B4D8",
        "Dockerfile Optimization": "#FFB703",
        "DockerCompose Optimization": "#06D6A0",
        "Terraform Code Optimization": "#FB8500",
        "Workflow Optimization": "#8338EC",
        "System Design Optimization": "#3A86FF",
        "Business Logic Correction & Optimization": "#FF006E",
    }
    PCOLS = {"CRITICAL": "#C62828","HIGH":"#E65100","MEDIUM":"#F57F17","LOW":"#2E7D32"}

    for sheet_name, items in ENHANCEMENT_DATA.items():
        color = CAT_COLORS.get(sheet_name, "#1A1A2E")
        story.append(section_bar(f"{sheet_name.upper()} ({len(items)} items)", color))
        story.append(Spacer(1, 0.2*cm))

        td = [["#", "Service", "Enhancement", "Priority", "Timeline"]]
        for i, (srv, enh, pri, rat, sta, tim) in enumerate(items, 1):
            td.append([str(i), srv, enh[:88], pri, tim])

        t = Table(td, colWidths=[0.8*cm, 3.2*cm, 9*cm, 2*cm, 2.5*cm], repeatRows=1)
        cmds = [
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor(color)),
            ("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTSIZE",(0,0),(-1,-1),7.5),
            ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
            ("LEFTPADDING",(0,0),(-1,-1),3),("VALIGN",(0,0),(-1,-1),"TOP"),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#F8F9FA"),colors.white]),
            ("BOX",(0,0),(-1,-1),1,colors.HexColor(color)),
            ("INNERGRID",(0,0),(-1,-1),0.3,colors.HexColor("#CCCCCC")),
        ]
        for i, (srv, enh, pri, rat, sta, tim) in enumerate(items, 1):
            p = pri.upper()
            pk = "CRITICAL" if "CRITICAL" in p else ("HIGH" if "HIGH" in p else ("MEDIUM" if "MEDIUM" in p else "LOW"))
            bc = colors.HexColor(PCOLS[pk])
            cmds.append(("BACKGROUND",(3,i),(3,i),bc))
            if pk in ("CRITICAL","HIGH"):
                cmds.append(("TEXTCOLOR",(3,i),(3,i),colors.white))
        t.setStyle(TableStyle(cmds))
        story.append(t)
        story.append(Spacer(1, 0.4*cm))
        story.append(PageBreak())

    # ROADMAP
    story.append(section_bar("RECOMMENDED IMPLEMENTATION ROADMAP", "#1A1A2E"))
    story.append(Spacer(1, 0.2*cm))

    rm = [
        ["Phase","Timeline","Focus","Expected Outcome"],
        ["1: Critical Fixes","Week 1","Fix CRITICAL security bugs: OTP backdoor, CORS wildcard, weak JWT, default passwords, missing auth on admin APIs","Platform secured against fraud and basic attacks"],
        ["2: Core Features","Weeks 2-3","Real-time WebSocket tracking, smart auto-dispatch, social login, PWA, one-page checkout, Redis caching, subscription model","10-min SLA achievable; user retention +40%"],
        ["3: Performance","Weeks 3-4","Cursor pagination, GIN indexes, PgBouncer, Redis caching, Dockerfile multi-stage, structured logging, rate limiting","p95 API latency <200ms; handle 10x traffic"],
        ["4: Operations","Weeks 4-5","Admin command center, SLA alerting, rider heatmap, vendor analytics, batch delivery, automated reordering","Ops efficiency +60%; COGS reduction 25%"],
        ["5: Growth","Weeks 5-6","Loyalty program, referral system, AI recommendations, dynamic pricing, ONDC integration, WhatsApp commerce","AOV +20%; repeat rate +35%; market expansion"],
        ["6: Scale & Compliance","Weeks 7-8","PII encryption (DPDPA), Terraform Multi-AZ/WAF/Secrets Manager, CI/CD blue-green deploy, multi-city expansion","Regulatory compliance; national scaling ready"],
    ]
    rmt = Table(rm, colWidths=[3.5*cm, 2.5*cm, 6.5*cm, 5*cm])
    rmt.setStyle(TableStyle([
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#1A1A2E")),
        ("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTSIZE",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
        ("LEFTPADDING",(0,0),(-1,-1),5),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("FONTNAME",(0,1),(0,-1),"Helvetica-Bold"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#F8F9FA"),colors.HexColor("#E8F5E9"),
            colors.HexColor("#E3F2FD"),colors.HexColor("#F3E5F5"),colors.HexColor("#FFF8E1"),colors.HexColor("#E0F2F1")]),
        ("BOX",(0,0),(-1,-1),1,colors.HexColor("#333333")),
        ("INNERGRID",(0,0),(-1,-1),0.5,colors.HexColor("#CCCCCC")),
    ]))
    story.append(rmt)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f"Report generated: {datetime.now().strftime('%B %d, %Y %H:%M')} | Sunotal Enhancement Audit v1.0 | Total: {total} enhancements across 9 categories",
        ParagraphStyle("footer", fontSize=8, textColor=colors.HexColor("#888888"), alignment=TA_CENTER)))

    doc.build(story)
    print(f"  PDF saved: {output_path}")

if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    excel_path = os.path.join(output_dir, f"Sunotal_Enhancement_Report_{ts}.xlsx")
    pdf_path   = os.path.join(output_dir, f"Sunotal_Enhancement_Report_{ts}.pdf")

    total = sum(len(v) for v in ENHANCEMENT_DATA.values())
    print(f"\n  Sunotal Enhancement Report Generator")
    print(f"  Total enhancements: {total} | Categories: {len(ENHANCEMENT_DATA)}")

    try:
        print("\n  Generating Excel workbook...")
        generate_excel(excel_path)
    except ImportError as e:
        print(f"  [!] openpyxl not available: {e}")
        excel_path = None

    try:
        print("\n  Generating PDF report...")
        generate_pdf(pdf_path)
    except ImportError as e:
        print(f"  [!] reportlab not available: {e}")
        pdf_path = None

    print(f"\n  Output: {output_dir}")
    if excel_path: print(f"  Excel: {excel_path}")
    if pdf_path:   print(f"  PDF:   {pdf_path}")
    print("  Done!")
