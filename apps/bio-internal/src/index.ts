import { app } from './server';

const port = Number(process.env.PORT ?? 4100);
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen({
  port,
  hostname,
});

console.log(`🚀 bio-internal API listening on http://${hostname}:${port}`);
