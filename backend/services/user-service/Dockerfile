# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk update && apk upgrade --no-cache
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN CI=true pnpm prune --prod

# Stage 2: Production
FROM node:20-alpine
RUN apk update && apk upgrade --no-cache && npm install -g pnpm
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY drizzle.config.ts tsconfig.json ./
COPY src/lib ./src/lib
COPY src/schema ./src/schema
CMD ["node", "dist/src/index.js"]
