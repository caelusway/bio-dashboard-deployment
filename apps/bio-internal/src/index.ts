import { app } from './server';

const port = Number(process.env.PORT ?? 4100);

app.listen({
  port,
  hostname: '0.0.0.0', // Listen on all interfaces for Railway
});

console.log(`🚀 bio-internal API listening on 0.0.0.0:${port}`);
