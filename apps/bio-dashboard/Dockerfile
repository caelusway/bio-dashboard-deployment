# Frontend Dashboard Dockerfile
FROM oven/bun:1.2-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install

# Build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production - serve with Bun
FROM oven/bun:1.2-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.ts ./server.ts

EXPOSE 3000
CMD ["bun", "run", "server.ts"]
