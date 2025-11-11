import { app } from './server';

const port = Number(process.env.PORT ?? 4100);
const host = '0.0.0.0'; // Listen on all interfaces for Railway

app.listen(port, host);

console.log(`🚀 bio-internal API listening on ${host}:${port}`);
