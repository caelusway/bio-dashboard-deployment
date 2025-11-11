# Backend API Dockerfile
FROM oven/bun:1.2-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Development dependencies for build
FROM base AS build-deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build (if needed - not required for Bun but good for type checking)
FROM build-deps AS build
COPY . .
RUN bun run check || true

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
  CMD bun --eval "fetch('http://localhost:4100/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
