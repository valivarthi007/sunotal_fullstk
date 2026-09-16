# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Support both npm and pnpm lockfiles
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN echo "unsafe-perm=true" > /root/.npmrc && \
    echo "only-built-dependencies[]=esbuild" >> /root/.npmrc && \
    echo "only-built-dependencies[]=@swc/core" >> /root/.npmrc

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm config set only-built-dependencies esbuild @swc/core || true; \
      pnpm install --frozen-lockfile || pnpm install; \
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
RUN echo "unsafe-perm=true" > /root/.npmrc && \
    echo "only-built-dependencies[]=esbuild" >> /root/.npmrc && \
    echo "only-built-dependencies[]=@swc/core" >> /root/.npmrc

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm config set only-built-dependencies esbuild @swc/core || true; \
      pnpm install --frozen-lockfile --prod || pnpm install --prod; \
    elif [ -f package-lock.json ]; then \
      npm ci --only=production --ignore-scripts; \
    else \
      npm install --only=production --ignore-scripts; \
    fi

COPY --from=builder /app/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 5008

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5008/api/healthz || exit 1

CMD ["node", "dist/index.js"]
