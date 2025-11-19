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
      console.log('[auth middleware] Starting...');
      const authorization = request.headers.get('authorization');
      console.log('[auth middleware] Authorization header:', authorization ? 'present' : 'missing');
      const token = extractToken(authorization);

      if (!token) {
        console.log('[auth middleware] No token found');
        set.status = 401;
        throw new Error('No authorization token provided');
      }

      console.log('[auth middleware] Token extracted:', token.substring(0, 20) + '...');

      // Verify JWT with Supabase
      const {
        data: { user: supabaseUser },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !supabaseUser) {
        console.log('[auth middleware] Supabase auth failed:', error?.message);
        set.status = 401;
        throw new Error('Invalid or expired token');
      }

      console.log('[auth middleware] Supabase user verified:', supabaseUser.email);

      // Get role from user_metadata (no database needed!)
      const role = (supabaseUser.user_metadata?.role || (supabaseUser.email === 'emre@bio.xyz' ? 'admin' : 'member')) as 'admin' | 'member';

      const user: AuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role,
        fullName: supabaseUser.user_metadata?.full_name,
      };

      console.log('[auth middleware] Returning user:', user);
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
