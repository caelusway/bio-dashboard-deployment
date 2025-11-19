# Backend API Dockerfile (Bun + Elysia)
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json ./
RUN bun install

# Production
FROM base AS release

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=install /app/node_modules ./node_modules
COPY . .

EXPOSE 4100

ENV NODE_ENV=production
ENV PORT=4100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4100/health || exit 1

CMD ["bun", "run", "src/index.ts"]
