/**
 * Production server for Bio Dashboard
 * Serves static files from dist/ directory
 */

Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  fetch(req) {
    const url = new URL(req.url);

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
