# Stage 1: Build
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ARG VITE_MAPPLS_API_KEY
ARG VITE_RAZORPAY_KEY_ID
ENV VITE_MAPPLS_API_KEY=${VITE_MAPPLS_API_KEY}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}

RUN pnpm build

# Stage 2: Production
FROM nginx:1.27-alpine
RUN apk update && apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
