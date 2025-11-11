import { Elysia } from 'elysia';

export const healthRoutes = new Elysia({ prefix: '/health' }).get('/', () => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
}));
