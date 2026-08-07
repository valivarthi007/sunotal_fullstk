# Stage 1: Build
FROM node:20-alpine
RUN apk update && apk upgrade --no-cache AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine
RUN apk update && apk upgrade --no-cache
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY drizzle.config.ts tsconfig.json ./
COPY src/lib ./src/lib
COPY src/schema ./src/schema
CMD ["node", "dist/src/index.js"]
