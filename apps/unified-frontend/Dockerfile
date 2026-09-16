# ─── Stage 1: Build user-app ──────────────────────────────────────────────────
FROM node:20-alpine AS user-app-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
# Allow native build scripts (esbuild, etc.) — required by pnpm v9+ security model
RUN echo "unsafe-perm=true" > /root/.npmrc
COPY apps/user-app/package.json apps/user-app/pnpm-lock.yaml* apps/user-app/package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi
COPY apps/user-app/ ./
RUN npm run build

# ─── Stage 2: Build vendor-app ────────────────────────────────────────────────
FROM node:20-alpine AS vendor-app-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc
COPY apps/vendor-app/package.json apps/vendor-app/pnpm-lock.yaml* apps/vendor-app/package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi
COPY apps/vendor-app/ ./
RUN npm run build

# ─── Stage 3: Build admin-app ─────────────────────────────────────────────────
FROM node:20-alpine AS admin-app-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc
COPY apps/admin-app/package.json apps/admin-app/pnpm-lock.yaml* apps/admin-app/package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi
COPY apps/admin-app/ ./
RUN npm run build

# ─── Stage 4: Build delivery-app ──────────────────────────────────────────────
FROM node:20-alpine AS delivery-app-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc
COPY apps/delivery-app/package.json apps/delivery-app/pnpm-lock.yaml* apps/delivery-app/package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi
COPY apps/delivery-app/ ./
RUN npm run build

# ─── Stage 5: Build support-app ───────────────────────────────────────────────
FROM node:20-alpine AS support-app-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc
COPY apps/support-app/package.json apps/support-app/pnpm-lock.yaml* apps/support-app/package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi
COPY apps/support-app/ ./
RUN npm run build

# ─── Stage 6: Production Nginx Server ─────────────────────────────────────────
FROM nginx:1.27-alpine
RUN apk update && apk upgrade --no-cache

COPY apps/unified-frontend/nginx.conf /etc/nginx/nginx.conf

COPY --from=user-app-builder     /app/dist /usr/share/nginx/html/user-app
COPY --from=vendor-app-builder   /app/dist /usr/share/nginx/html/vendor-app
COPY --from=admin-app-builder    /app/dist /usr/share/nginx/html/admin-app
COPY --from=delivery-app-builder /app/dist /usr/share/nginx/html/delivery-app
COPY --from=support-app-builder  /app/dist /usr/share/nginx/html/support-app

EXPOSE 80 443
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
