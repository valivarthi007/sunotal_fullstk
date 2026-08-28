FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Non-root user for security (OWASP / CIS Docker Benchmark)
USER node

EXPOSE 5006
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5006/api/healthz || exit 1

CMD ["node", "dist/src/index.js"]
