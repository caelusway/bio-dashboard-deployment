import { Elysia } from 'elysia';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const authMiddleware = new Elysia({ prefix: '/v1' })
  .on('request', async ({ request, set, path }) => {
    // Skip auth for OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return;
    }

    // Skip auth for routes outside /v1/* (e.g., /api/growth)
    if (!path.startsWith('/v1/')) {
      return;
    }

    const authorization = request.headers.get('authorization');
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    if (!token) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      set.status = 401;
      return { error: 'Invalid token' };
    }

    request.headers.set('x-user-id', data.user.id);
  });
