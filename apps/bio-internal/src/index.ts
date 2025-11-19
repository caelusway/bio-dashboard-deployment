import { app } from './server';
import { initializeTwitterSync } from './lib/initTwitterSync';
import { initializeDiscordBot } from './lib/initDiscordBot';

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

// Optional: Auto-start Discord bot for real-time message sync
if (process.env.ENABLE_DISCORD_BOT === 'true') {
  console.log('🔄 Discord bot enabled - starting real-time message sync');
  initializeDiscordBot().catch(error => {
    console.error('❌ Failed to start Discord bot:', error);
  });
}

