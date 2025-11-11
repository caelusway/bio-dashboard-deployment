import { app } from './server';

const port = Number(process.env.PORT ?? 4100);

app.listen(port);

console.log(`🚀 bio-internal API listening on http://localhost:${port}`);
