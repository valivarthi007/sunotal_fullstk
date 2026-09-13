# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
ARG VITE_PAYMENT_PROVIDER=mock
ARG VITE_MAP_PROVIDER=cartodb
ENV VITE_PAYMENT_PROVIDER=${VITE_PAYMENT_PROVIDER}
ENV VITE_MAP_PROVIDER=${VITE_MAP_PROVIDER}

RUN npm run build || npx tsc

# Stage 2: Production
FROM nginx:1.27-alpine
RUN apk update && apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
