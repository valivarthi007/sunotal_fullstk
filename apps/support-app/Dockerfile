# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack with pinned pnpm version for reproducible builds
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Allow esbuild (and other native deps) to run their postinstall scripts
# Required by pnpm v9+ security model for packages with native binaries
RUN echo "unsafe-perm=true" > /root/.npmrc

# Copy lockfile + manifest first for better layer caching
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY . .

ARG VITE_PAYMENT_PROVIDER=mock
ARG VITE_MAP_PROVIDER=cartodb
ENV VITE_PAYMENT_PROVIDER=${VITE_PAYMENT_PROVIDER}
ENV VITE_MAP_PROVIDER=${VITE_MAP_PROVIDER}

RUN npm run build

# Stage 2: Production nginx server
FROM nginx:1.27-alpine

# Install wget for health checks (not bundled in nginx:alpine)
RUN apk update && apk upgrade --no-cache && apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
