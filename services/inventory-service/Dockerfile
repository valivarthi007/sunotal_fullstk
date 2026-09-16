# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Support both npm and pnpm lockfiles
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Support both npm and pnpm lockfiles (production deps only)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --prod; \
    elif [ -f package-lock.json ]; then \
      npm ci --only=production --ignore-scripts; \
    else \
      npm install --only=production --ignore-scripts; \
    fi

COPY --from=builder /app/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 5003

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5003/api/healthz || exit 1

CMD ["node", "dist/index.js"]
