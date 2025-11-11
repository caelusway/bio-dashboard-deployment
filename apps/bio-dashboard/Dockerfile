# Frontend Dashboard Dockerfile
FROM oven/bun:1.2-alpine AS build

WORKDIR /app

# Install and build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production - serve with Bun
FROM oven/bun:1.2-alpine

WORKDIR /app
COPY --from=build /app/dist ./dist

# Simple static file server with Bun
COPY <<EOF ./server.ts
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return new Response("healthy", { status: 200 });
    }
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(\`./dist\${filePath}\`);
    return file.exists().then(exists =>
      exists ? new Response(file) : new Response(Bun.file("./dist/index.html"))
    );
  }
});
EOF

EXPOSE 3000
CMD ["bun", "run", "server.ts"]
