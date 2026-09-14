# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY src ./src
RUN npm run build

# ─── Stage 2: Production Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --only=production --ignore-scripts; else npm install --only=production --ignore-scripts; fi

COPY --from=builder /app/dist ./dist

RUN chown -R node:node /app
USER node

EXPOSE 5003

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5003/api/healthz || exit 1

CMD ["node", "dist/index.js"]
