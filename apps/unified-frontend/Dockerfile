# ─── Stage 1: Build user-app ──────────────────────────────────────────────────
FROM node:20-alpine AS user-app-builder
WORKDIR /app
COPY apps/user-app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY apps/user-app/ ./
RUN npm run build || npx tsc

# ─── Stage 2: Build vendor-app ────────────────────────────────────────────────
FROM node:20-alpine AS vendor-app-builder
WORKDIR /app
COPY apps/vendor-app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY apps/vendor-app/ ./
RUN npm run build || npx tsc

# ─── Stage 3: Build admin-app ─────────────────────────────────────────────────
FROM node:20-alpine AS admin-app-builder
WORKDIR /app
COPY apps/admin-app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY apps/admin-app/ ./
RUN npm run build || npx tsc

# ─── Stage 4: Build delivery-app ──────────────────────────────────────────────
FROM node:20-alpine AS delivery-app-builder
WORKDIR /app
COPY apps/delivery-app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY apps/delivery-app/ ./
RUN npm run build || npx tsc

# ─── Stage 5: Build support-app ───────────────────────────────────────────────
FROM node:20-alpine AS support-app-builder
WORKDIR /app
COPY apps/support-app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY apps/support-app/ ./
RUN npm run build || npx tsc

# ─── Stage 6: Production Nginx Server ─────────────────────────────────────────
FROM nginx:1.25-alpine

COPY apps/unified-frontend/nginx.conf /etc/nginx/nginx.conf

COPY --from=user-app-builder /app/dist /usr/share/nginx/html/user-app
COPY --from=vendor-app-builder /app/dist /usr/share/nginx/html/vendor-app
COPY --from=admin-app-builder /app/dist /usr/share/nginx/html/admin-app
COPY --from=delivery-app-builder /app/dist /usr/share/nginx/html/delivery-app
COPY --from=support-app-builder /app/dist /usr/share/nginx/html/support-app

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
