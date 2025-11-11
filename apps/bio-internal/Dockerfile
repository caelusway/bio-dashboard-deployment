# Backend API Dockerfile
FROM oven/bun:1.2-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4100

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy application code
COPY . .

# Expose port
EXPOSE 4100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:4100/health || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
