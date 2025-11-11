# Backend API Dockerfile
FROM oven/bun:1.2-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN bun install --production

# Production image
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
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:4100/health || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
