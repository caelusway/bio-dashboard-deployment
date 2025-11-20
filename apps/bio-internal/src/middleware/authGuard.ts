/**
 * Reusable authentication guard for Elysia routes
 * Validates API keys and JWT tokens
 */

import { db } from '../db/client';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashApiKey } from './security';
import { supabase } from '../lib/supabase';

export const authGuard = {
  beforeHandle: async ({ request, set }: any) => {
    const apiKey = request.headers.get('x-api-key');
    const authorization = request.headers.get('authorization');
    const token = authorization?.split(' ')[1];
    
    // Require at least one authentication method
    if (!apiKey && !token) {
      set.status = 401;
      return {
        success: false,
        error: 'Authentication required. Provide either X-API-Key or Authorization header.'
      };
    }
    
    // Validate API key if provided
    if (apiKey) {
      const keyHash = await hashApiKey(apiKey);
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);
      
      if (!key || !key.isActive) {
        set.status = 401;
        return {
          success: false,
          error: 'Invalid or inactive API key'
        };
      }
      
      if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
        set.status = 401;
        return {
          success: false,
          error: 'API key has expired'
        };
      }
      
      // Update last used timestamp (fire and forget)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .then(() => {})
        .catch(err => console.error('[authGuard] Failed to update lastUsedAt:', err));
      
      return; // Allow request to continue
    }
    
    // Validate JWT if provided
    if (token) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        set.status = 401;
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }
      
      return; // Allow request to continue
    }
  }
};

