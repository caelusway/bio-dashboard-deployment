import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { profiles } from '../db/schema';

export const roleGuard = (allowedRoles: string[]) =>
  new Elysia().on('request', async ({ request, set, path }: any) => {
    // Skip role guard for routes outside /v1/* (e.g., /api/growth)
    if (!path.startsWith('/v1/')) {
      return;
    }

    const userId = request.headers.get('x-user-id');

    if (!userId) {
      set.status = 401;
      return { error: 'No user context' } as const;
    }

    const result = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    const profile = result[0];

    if (!profile || !allowedRoles.includes(profile.role)) {
      set.status = 403;
      return { error: 'Forbidden' } as const;
    }
  });
