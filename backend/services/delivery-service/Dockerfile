FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --ignore-scripts
COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --ignore-scripts
COPY --from=builder /app/dist ./dist

# Non-root user for security (OWASP / CIS Docker Benchmark)
USER node

EXPOSE 5006
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5006/api/healthz || exit 1

CMD ["node", "dist/src/index.js"]
