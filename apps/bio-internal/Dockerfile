# Backend API Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production image with Bun for runtime
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4100

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Expose port
EXPOSE 4100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:4100/health || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
