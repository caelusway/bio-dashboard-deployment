# Backend API Dockerfile
FROM oven/bun:1.2-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN bun install --production

# Production image - use Bun for runtime
FROM base AS runner
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
