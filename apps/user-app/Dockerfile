# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack with pinned pnpm version for reproducible builds
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Allow esbuild (and other native deps) to run their postinstall scripts
RUN echo "unsafe-perm=true" > /root/.npmrc && \
    echo "only-built-dependencies[]=esbuild" >> /root/.npmrc && \
    echo "only-built-dependencies[]=@swc/core" >> /root/.npmrc

# Copy lockfile + manifest first for better layer caching
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

ARG VITE_PAYMENT_PROVIDER=mock
ARG VITE_MAP_PROVIDER=cartodb
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""

ENV VITE_PAYMENT_PROVIDER=${VITE_PAYMENT_PROVIDER}
ENV VITE_MAP_PROVIDER=${VITE_MAP_PROVIDER}
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}

RUN npm run build

# Stage 2: Production nginx server
FROM nginx:1.27-alpine

# Install wget for health checks
RUN apk update && apk upgrade --no-cache && apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
