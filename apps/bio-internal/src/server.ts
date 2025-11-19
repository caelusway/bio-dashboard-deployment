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
import { authRoutes, protectedAuthRoutes } from './routes/auth';
import { inviteRoutes } from './routes/invites';

const isDev = process.env.NODE_ENV !== 'production';

console.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log(`📂 Working directory: ${process.cwd()}`);

const dashboardDistPath = resolve(process.cwd(), '../bio-dashboard/dist');
const dashboardIndexPath = join(dashboardDistPath, 'index.html');
const hasDashboardBuild = existsSync(dashboardIndexPath);

console.log(`📦 Dashboard dist present: ${hasDashboardBuild ? 'yes' : 'no'}`);
console.log(`📁 Dashboard dist path: ${dashboardDistPath}`);

const apiPrefixes = ['/api', '/v1', '/daos', '/growth', '/health', '/auth', '/invites', '/api-docs', '/swagger'];

const shouldServeDashboard = (pathname: string) => {
  return !apiPrefixes.some((prefix) => pathname.startsWith(prefix));
};

const app = new Elysia()
  // Enable CORS for frontend
  .use(cors({
    origin: isDev
      ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 hours
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
  .use(authRoutes)
  .use(protectedAuthRoutes)
  .use(inviteRoutes)
  .use(twitterRoutes)
  .use(growthRoutes)
  .use(daoRoutes);

// Only serve static frontend if explicitly enabled (for monolithic deployment)
const serveFrontend = process.env.SERVE_FRONTEND === 'true';

if (!isDev && serveFrontend && hasDashboardBuild) {
  console.log('📦 Serving frontend from backend (monolithic mode)');
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
} else {
  console.log('🔌 API-only mode (frontend served separately)');
}

console.log('✅ API server configured - ready to handle requests');

export { app };
export type App = typeof app;
