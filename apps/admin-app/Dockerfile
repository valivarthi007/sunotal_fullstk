# Stage 1: Build
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ARG VITE_PAYMENT_PROVIDER=mock
ARG VITE_MAP_PROVIDER=cartodb
ENV VITE_PAYMENT_PROVIDER=${VITE_PAYMENT_PROVIDER}
ENV VITE_MAP_PROVIDER=${VITE_MAP_PROVIDER}

RUN pnpm build

# Stage 2: Production
FROM nginx:1.27-alpine
RUN apk update && apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
