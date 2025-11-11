import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
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
console.log(`📂 Working directory: ${process.cwd()}`);
console.log(`📍 Script location: ${import.meta.dir}`);
console.log(`📦 Dashboard exists: ${existsSync(dashboardPath)}`);

// List files in dashboard path if it exists
if (existsSync(dashboardPath)) {
  try {
    const { readdirSync } = await import('fs');
    console.log(`📄 Dashboard files:`, readdirSync(dashboardPath));
  } catch (e) {
    console.log(`⚠️  Could not list dashboard files:`, e);
  }
} else {
  console.log(`❌ Dashboard build not found! Make sure deploy.sh ran successfully.`);
}

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

  // Serve static files - this wildcard route is added AFTER all API routes
  // In Elysia, more specific routes (like /daos registered above) take precedence over wildcards
  app.get('*', async ({ path, set, request }) => {
    console.log('[Static] Request for:', path);

    try {
      // First, try to serve static files (JS, CSS, images, etc.)
      if (path !== '/') {
        const filePath = join(dashboardPath, path);
        console.log('[Static] Checking file:', filePath);

        if (existsSync(filePath)) {
          console.log('[Static] Serving file:', filePath);
          return Bun.file(filePath);
        }
      }

      // For all other paths (including root), serve index.html for SPA routing
      const indexPath = join(dashboardPath, 'index.html');
      console.log('[Static] Serving index.html for SPA route');

      if (existsSync(indexPath)) {
        return Bun.file(indexPath);
      }

      console.error('[Static] index.html not found at:', indexPath);
      set.status = 404;
      return { error: 'Dashboard not found' };
    } catch (e) {
      console.error('[Static] Error:', e);
      set.status = 500;
      return { error: 'Internal server error', details: String(e) };
    }
  });
} else if (!isDev) {
  console.warn('⚠️  Warning: Dashboard build not found. Please run: cd apps/bio-dashboard && bun run build');
}

export type App = typeof app;
