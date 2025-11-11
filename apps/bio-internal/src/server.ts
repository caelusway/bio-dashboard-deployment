import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { healthRoutes } from './routes/health';
import { twitterRoutes } from './routes/twitter';
import { growthRoutes } from './routes/growth';
import { daoRoutes } from './routes/daos';

const isDev = process.env.NODE_ENV !== 'production';

console.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log(`📂 Working directory: ${process.cwd()}`);

const dashboardDistPath = resolve(process.cwd(), '../bio-dashboard/dist');
const dashboardIndexPath = join(dashboardDistPath, 'index.html');
const hasDashboardBuild = existsSync(dashboardIndexPath);

console.log(`📦 Dashboard dist present: ${hasDashboardBuild ? 'yes' : 'no'}`);
console.log(`📁 Dashboard dist path: ${dashboardDistPath}`);

const apiPrefixes = ['/api', '/v1', '/daos', '/growth', '/health', '/api-docs', '/swagger'];

const shouldServeDashboard = (pathname: string) => {
  return !apiPrefixes.some((prefix) => pathname.startsWith(prefix));
};

const app = new Elysia()
  // Enable CORS for frontend on separate Railway service
  .use(cors({
    origin: isDev
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
      : (ctx) => {
          const origin = ctx.request.headers.get('origin');
          if (origin && (origin.includes('.railway.app') || origin.includes('bio-dashboard'))) {
            return origin;
          }
          return false;
        },
    credentials: true,
  }))
  .use(
    swagger({
      path: '/api-docs',
      documentation: {
        info: {
          title: 'bio-internal Twitter API',
          version: '0.1.0',
        },
      },
    }),
  )
  // API routes (under /v1 or other prefixes)
  .get('/api', () => ({
    name: 'bio-internal',
    status: 'ok',
    environment: isDev ? 'development' : 'production',
  }))
  .use(healthRoutes)
  .use(twitterRoutes)
  .use(growthRoutes)
  .use(daoRoutes);

if (!isDev && hasDashboardBuild) {
  app.use(await staticPlugin({
    assets: dashboardDistPath,
    prefix: '/',
    alwaysStatic: true,
    indexHTML: true,
    silent: true,
  }));

  app.onError(({ code, request, error }) => {
    if (code === 'NOT_FOUND' && request?.method === 'GET') {
      const pathname = new URL(request.url).pathname;
      if (shouldServeDashboard(pathname)) {
        return Bun.file(dashboardIndexPath);
      }
    }

    if (error) {
      return new Response(error.message, {
        status: code === 'NOT_FOUND' ? 404 : 500,
      });
    }

    return new Response('Internal Server Error', { status: 500 });
  });
} else if (!isDev) {
  console.warn('⚠️ Dashboard build not found. SPA routes will return 404.');
}

console.log('✅ API server configured - ready to handle requests');

export { app };
export type App = typeof app;
