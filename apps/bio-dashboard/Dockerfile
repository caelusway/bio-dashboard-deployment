# Frontend Dashboard Dockerfile
FROM oven/bun:1.2-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the frontend
FROM deps AS build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production image with nginx
FROM nginx:alpine

# Copy custom nginx config for port 8080
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Health check
    location /health {
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
