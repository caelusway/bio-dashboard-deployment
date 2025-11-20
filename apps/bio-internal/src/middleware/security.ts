import { Elysia } from 'elysia';
import { db } from '../db/client';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import { supabase } from '../lib/supabase';

// ============================================================================
// RATE LIMITING
// ============================================================================

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = { 
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000 // 1000 requests per window
};

export const rateLimit = () =>
  new Elysia({ name: 'rate-limit' })
    .onBeforeHandle(({ request, set }) => {
      // Use API key prefix or IP as identifier
      const apiKey = request.headers.get('x-api-key');
      const identifier = apiKey?.substring(0, 20) || 
                        request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') ||
                        'unknown';
      
      const now = Date.now();
      const record = requestCounts.get(identifier);
      
      if (record && now < record.resetAt) {
        if (record.count >= RATE_LIMIT.maxRequests) {
          set.status = 429;
          set.headers['Retry-After'] = String(Math.ceil((record.resetAt - now) / 1000));
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        record.count++;
      } else {
        requestCounts.set(identifier, {
          count: 1,
          resetAt: now + RATE_LIMIT.windowMs,
        });
      }
      
      // Cleanup old entries periodically (1% chance)
      if (Math.random() < 0.01) {
        for (const [key, value] of requestCounts.entries()) {
          if (now > value.resetAt) {
            requestCounts.delete(key);
          }
        }
      }
    });

// ============================================================================
// FLEXIBLE AUTHENTICATION (JWT OR API KEY)
// ============================================================================

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const flexAuth = () =>
  new Elysia({ name: 'flex-auth' })
    .derive(async ({ request, set }) => {
      console.log('[flexAuth] ========== MIDDLEWARE CALLED ==========');
      console.log('[flexAuth] Path:', new URL(request.url).pathname);
      
      // Try API key first
      const apiKey = request.headers.get('x-api-key');
      const authorization = request.headers.get('authorization');
      const token = authorization?.split(' ')[1];
      
      console.log('[flexAuth] API Key present:', !!apiKey);
      console.log('[flexAuth] JWT Token present:', !!token);
      
      // Require at least one authentication method
      if (!apiKey && !token) {
        console.log('[flexAuth] ❌ No authentication provided - BLOCKING REQUEST');
        set.status = 401;
        throw new Error('Authentication required. Provide either X-API-Key or Authorization header (Bearer token).');
      }
      
      if (apiKey) {
        console.log('[flexAuth] API key authentication attempt');
        const keyHash = await hashApiKey(apiKey);
        const [key] = await db
          .select()
          .from(apiKeys)
          .where(eq(apiKeys.keyHash, keyHash))
          .limit(1);
        
        if (!key || !key.isActive) {
          console.log('[flexAuth] API key invalid or inactive');
          set.status = 401;
          throw new Error('Invalid or inactive API key');
        }
        
        if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
          console.log('[flexAuth] API key expired');
          set.status = 401;
          throw new Error('API key has expired');
        }
        
        // Update last used timestamp (fire and forget)
        db.update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, key.id))
          .then(() => {})
          .catch(err => console.error('[flexAuth] Failed to update lastUsedAt:', err));
        
        console.log('[flexAuth] API key authentication successful:', key.name);
        return { authenticated: true, authMethod: 'api-key' };
      }
      
      // Fall back to JWT authentication
      console.log('[flexAuth] JWT authentication attempt');
      
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token!);
      
      if (error || !user) {
        console.log('[flexAuth] JWT validation failed:', error?.message);
        set.status = 401;
        throw new Error('Invalid or expired token');
      }
      
      console.log('[flexAuth] JWT authentication successful:', user.email);
      return { authenticated: true, authMethod: 'jwt' };
    });

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const securityHeaders = () =>
  new Elysia({ name: 'security-headers' })
    .onAfterHandle(({ set }) => {
      set.headers['X-Content-Type-Options'] = 'nosniff';
      set.headers['X-Frame-Options'] = 'DENY';
      set.headers['X-XSS-Protection'] = '1; mode=block';
      set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      set.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
    });

// ============================================================================
// REQUEST LOGGING
// ============================================================================

export const requestLogger = () =>
  new Elysia({ name: 'request-logger' })
    .onBeforeHandle(({ request }) => {
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname;
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const timestamp = new Date().toISOString();
      
      console.log(`[${timestamp}] ${method} ${path} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);
    });

