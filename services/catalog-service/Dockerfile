# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

USER node

COPY --chown=node:node package*.json ./
RUN npm ci --only=production --ignore-scripts

COPY --from=builder --chown=node:node /app/dist ./dist

EXPOSE 5002

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5002/api/healthz || exit 1

CMD ["node", "dist/index.js"]
