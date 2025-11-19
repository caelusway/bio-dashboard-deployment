import { app } from './server';
import { initializeTwitterSync } from './lib/initTwitterSync';

const port = Number(process.env.PORT ?? 4100);
const hostname = '0.0.0.0'; // Bind to all interfaces for Docker compatibility

app.listen({
  port,
  hostname,
});

console.log(`🚀 bio-internal API listening on http://${hostname}:${port}`);

// Optional: Auto-start Twitter sync services
if (process.env.ENABLE_AUTO_TWITTER_SYNC === 'true') {
  initializeTwitterSync();
}

