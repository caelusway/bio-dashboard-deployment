import { Elysia, t } from 'elysia';
import { supabase } from '../lib/supabase';
import { 
  generateApiKey, 
  revokeApiKey, 
  deleteApiKey, 
  listApiKeys, 
  getApiKeyById 
} from '../services/apiKeyService';

/**
 * API Key Management Routes
 * 🔒 Admin only - for managing API keys for external applications
 */
export const apiKeyRoutes = new Elysia({ prefix: '/api/keys' })
  // Inline authentication and admin check
  .derive(async ({ request, set }) => {
    console.log('[apiKeyRoutes] Authenticating request...');
    const authorization = request.headers.get('authorization');
    const token = authorization?.split(' ')[1];
    
    if (!token) {
      console.log('[apiKeyRoutes] No token provided');
      set.status = 401;
      throw new Error('Authentication required');
    }
    
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      console.log('[apiKeyRoutes] Invalid token:', error?.message);
      set.status = 401;
      throw new Error('Invalid or expired token');
    }
    
    const role = (supabaseUser.user_metadata?.role || (supabaseUser.email === 'emre@bio.xyz' ? 'admin' : 'member')) as 'admin' | 'member';
    
    const user = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role,
      fullName: supabaseUser.user_metadata?.full_name,
    };
    
    console.log('[apiKeyRoutes] Authenticated user:', user);
    
    if (role !== 'admin') {
      console.log('[apiKeyRoutes] Access denied - user is not admin');
      set.status = 403;
      throw new Error('Forbidden: Admin access required');
    }
    
    console.log('[apiKeyRoutes] Access granted - user is admin');
    return { user };
  })
  
  /**
   * GET /api/keys
   * List all API keys
   */
  .get('/', async ({ user }) => {
    console.log('[apiKeyRoutes] User in handler:', user);
    try {
      const keys = await listApiKeys();
      return {
        success: true,
        data: keys,
      };
    } catch (error: any) {
      console.error('[apiKeyRoutes] Error listing API keys:', error);
      return {
        success: false,
        error: error.message || 'Failed to list API keys',
      };
    }
  })
  
  /**
   * GET /api/keys/:id
   * Get a specific API key by ID
   */
  .get('/:id', async ({ params, set }) => {
    try {
      const key = await getApiKeyById(params.id);
      
      if (!key) {
        set.status = 404;
        return {
          success: false,
          error: 'API key not found',
        };
      }
      
      return {
        success: true,
        data: key,
      };
    } catch (error: any) {
      console.error('[apiKeyRoutes] Error getting API key:', error);
      set.status = 500;
      return {
        success: false,
        error: error.message || 'Failed to get API key',
      };
    }
  })
  
  /**
   * POST /api/keys
   * Generate a new API key
   */
  .post(
    '/',
    async ({ body, user, set }) => {
      try {
        const { name, expiresInDays } = body;
        
        if (!user) {
          set.status = 401;
          return {
            success: false,
            error: 'Authentication required',
          };
        }
        
        const { key, record } = await generateApiKey(
          name,
          user.id,
          expiresInDays
        );
        
        return {
          success: true,
          data: {
            ...record,
            key, // ⚠️ Full key is only shown once!
          },
          warning: '⚠️ Save this key now! You will not be able to see it again.',
        };
      } catch (error: any) {
        console.error('[apiKeyRoutes] Error generating API key:', error);
        set.status = 500;
        return {
          success: false,
          error: error.message || 'Failed to generate API key',
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        expiresInDays: t.Optional(t.Number({ minimum: 1, maximum: 3650 })), // Max 10 years
      }),
    }
  )
  
  /**
   * PATCH /api/keys/:id/revoke
   * Revoke an API key (soft delete)
   */
  .patch('/:id/revoke', async ({ params, set }) => {
    try {
      const revokedKey = await revokeApiKey(params.id);
      
      if (!revokedKey) {
        set.status = 404;
        return {
          success: false,
          error: 'API key not found',
        };
      }
      
      return {
        success: true,
        message: 'API key revoked successfully',
        data: revokedKey,
      };
    } catch (error: any) {
      console.error('[apiKeyRoutes] Error revoking API key:', error);
      set.status = 500;
      return {
        success: false,
        error: error.message || 'Failed to revoke API key',
      };
    }
  })
  
  /**
   * DELETE /api/keys/:id
   * Permanently delete an API key
   */
  .delete('/:id', async ({ params, set }) => {
    try {
      const deletedKey = await deleteApiKey(params.id);
      
      if (!deletedKey) {
        set.status = 404;
        return {
          success: false,
          error: 'API key not found',
        };
      }
      
      return {
        success: true,
        message: 'API key deleted permanently',
      };
    } catch (error: any) {
      console.error('[apiKeyRoutes] Error deleting API key:', error);
      set.status = 500;
      return {
        success: false,
        error: error.message || 'Failed to delete API key',
      };
    }
  });

