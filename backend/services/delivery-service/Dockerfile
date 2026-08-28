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

EXPOSE 5006
CMD ["node", "dist/src/index.js"]
