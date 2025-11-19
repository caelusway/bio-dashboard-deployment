Bun.serve({
    port: 3000,
    hostname: "0.0.0.0",
    async fetch(req) {
        const url = new URL(req.url);

        // Proxy /api requests to backend
        // This solves Mixed Content issues (HTTPS frontend -> HTTP backend)
        // and CORS issues by making requests same-origin
        if (url.pathname.startsWith("/api")) {
            const backendUrl = process.env.BACKEND_URL || "http://backend:4100";
            const targetUrl = new URL(url.pathname + url.search, backendUrl);
            
            // Forward the request to the backend
            // We don't copy Host header to avoid Host mismatch errors
            return fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
            });
        }

        // Health check endpoint
        if (url.pathname === "/health") {
            return new Response("healthy", { status: 200 });
        }

        // Serve static files from dist
        const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
        const file = Bun.file(`./dist${filePath}`);

        return file.exists().then(exists =>
            exists ? new Response(file) : new Response(Bun.file("./dist/index.html"))
        );
    }
});

console.log("Frontend server running on http://0.0.0.0:3000");
