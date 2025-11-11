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

const app = new Elysia()
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

  // Serve static files with a guard function
  const serveStatic = ({ path, set, request }: any) => {
    console.log('[Static] Request for:', path);

    // Check if this is an API request by examining Accept header
    const acceptHeader = request.headers.get('accept') || '';
    const wantsJson = acceptHeader.includes('application/json');

    // API paths that might conflict with frontend routes
    const isApiPath = path.startsWith('/api') ||
                      path.startsWith('/v1') ||
                      path.startsWith('/health') ||
                      path.startsWith('/daos') ||
                      path.startsWith('/api-docs');

    if (isApiPath && wantsJson) {
      console.log('[Static] API request - skipping static handler');
      return; // Let API handlers process it
    }

    try {
      // Serve static files (JS, CSS, images) - these have file extensions
      if (path !== '/' && path.includes('.')) {
        const filePath = join(dashboardPath, path);
        if (existsSync(filePath)) {
          console.log('[Static] Serving file:', filePath);
          return Bun.file(filePath);
        }
      }

      // For all other paths, serve index.html (SPA routing)
      const indexPath = join(dashboardPath, 'index.html');
      console.log('[Static] Serving index.html for:', path);

      if (existsSync(indexPath)) {
        return Bun.file(indexPath);
      }

      console.error('[Static] index.html not found');
      set.status = 404;
      return { error: 'Dashboard not found' };
    } catch (e) {
      console.error('[Static] Error:', e);
      set.status = 500;
      return { error: 'Internal server error', details: String(e) };
    }
  };

  // Register wildcard route for ALL GET requests
  app.get('*', serveStatic);
} else if (!isDev) {
  console.warn('⚠️  Warning: Dashboard build not found. Please run: cd apps/bio-dashboard && bun run build');
}

export { app };
export type App = typeof app;
