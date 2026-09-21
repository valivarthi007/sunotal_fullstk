# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --no-package-lock
COPY . .
RUN npm run build

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache wget
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-package-lock
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 5010
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5010/api/healthz || exit 1
CMD ["node", "dist/index.js"]
