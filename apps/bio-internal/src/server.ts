import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { healthRoutes } from './routes/health';
import { twitterRoutes } from './routes/twitter';
import { growthRoutes } from './routes/growth';
import { daoRoutes } from './routes/daos';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

const isDev = process.env.NODE_ENV !== 'production';
const dashboardPath = resolve(import.meta.dir, '../../bio-dashboard/dist');

console.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log(`📁 Dashboard path: ${dashboardPath}`);
console.log(`📦 Dashboard exists: ${existsSync(dashboardPath)}`);

export const app = new Elysia()
  // Enable CORS for dashboard
  .use(cors({
    origin: isDev
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
      : true, // Allow all origins in production, or specify your Railway domain
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
    dashboardPath,
    dashboardExists: existsSync(dashboardPath),
  }))
  .use(healthRoutes)
  .use(twitterRoutes)
  .use(growthRoutes)
  .use(daoRoutes);

// Only serve static files in production
if (!isDev && existsSync(dashboardPath)) {
  console.log('📂 Serving static dashboard files from:', dashboardPath);

  app.use(staticPlugin({
    assets: dashboardPath,
    prefix: '/',
  }))
  // Fallback to index.html for SPA routing
  .get('*', ({ set }) => {
    try {
      const indexPath = join(dashboardPath, 'index.html');
      if (existsSync(indexPath)) {
        return Bun.file(indexPath);
      }
      set.status = 404;
      return { error: 'Dashboard not found' };
    } catch (e) {
      set.status = 500;
      return { error: 'Internal server error' };
    }
  });
} else if (!isDev) {
  console.warn('⚠️  Warning: Dashboard build not found. Please run: cd apps/bio-dashboard && bun run build');
}

export type App = typeof app;
