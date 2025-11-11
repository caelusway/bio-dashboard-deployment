import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { healthRoutes } from './routes/health';
import { twitterRoutes } from './routes/twitter';
import { growthRoutes } from './routes/growth';
import { daoRoutes } from './routes/daos';

const isDev = process.env.NODE_ENV !== 'production';

console.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log(`📂 Working directory: ${process.cwd()}`);

const app = new Elysia()
  // Enable CORS for frontend on separate Railway service
  .use(cors({
    origin: isDev
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
      : (ctx) => {
          // In production, allow requests from Railway frontend domain
          const origin = ctx.request.headers.get('origin');
          // Allow Railway domains and your custom domain
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

console.log('✅ API server configured - ready to handle requests');

export { app };
export type App = typeof app;
