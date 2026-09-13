# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with locked versions
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Run as non-root user for security
USER node

# Install only production deps with locked versions
COPY --chown=node:node package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy compiled output
COPY --from=builder --chown=node:node /app/dist ./dist

EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/healthz || exit 1

CMD ["node", "dist/index.js"]
