import { Elysia } from 'elysia';
import { supabase } from '../lib/supabase';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'member';
  fullName?: string | null;
}

// Extract JWT token from Authorization header
const extractToken = (authorization: string | null): string | null => {
  if (!authorization) return null;
  const parts = authorization.split(' ');
  if (parts[0] !== 'Bearer' || parts.length !== 2) return null;
  return parts[1];
};

// Auth middleware - protects routes and adds user to context
export const auth = () =>
  new Elysia({ name: 'auth' })
    .derive(async ({ request, set }) => {
      const authorization = request.headers.get('authorization');
      const token = extractToken(authorization);

      if (!token) {
        set.status = 401;
        throw new Error('No authorization token provided');
      }

      // Verify JWT with Supabase
      const {
        data: { user: supabaseUser },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
        set.status = 401;
        throw new Error('Invalid or expired token');
      }

      // Get user details from our database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, supabaseUser.id))
        .limit(1);

      if (!dbUser) {
        set.status = 401;
        throw new Error('User not found in database');
      }

      const user: AuthUser = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        fullName: dbUser.fullName,
      };

      return { user };
    });

// Admin-only middleware
export const adminOnly = () =>
  new Elysia({ name: 'admin-only' })
    .use(auth())
    .onBeforeHandle(({ user, set }) => {
      if (user?.role !== 'admin') {
        set.status = 403;
        throw new Error('Forbidden: Admin access required');
      }
    });
