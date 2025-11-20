import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { twitterPosts, daoEntities, apiKeys } from '../db/schema';
import { syncTwitterAccounts } from '../jobs/twitterSync';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getEngagementHistory, getFollowerHistory } from '../services/twitterAnalytics';
import { flexAuth, hashApiKey } from '../middleware/security';
import { supabase } from '../lib/supabase';

const ingestSchema = t.Object({
  orgId: t.String(),
  daoId: t.String(),
  posts: t.Array(
    t.Object({
      tweetId: t.String(),
      author: t.Record(t.String(), t.Any()),
      content: t.Optional(t.String()),
      tweetMetrics: t.Optional(t.Record(t.String(), t.Any())),
      hashtags: t.Optional(t.Array(t.String())),
      mentions: t.Optional(t.Array(t.Record(t.String(), t.Any()))),
      media: t.Optional(t.Array(t.Record(t.String(), t.Any()))),
      conversationId: t.Optional(t.String()),
      inReplyToId: t.Optional(t.String()),
      inReplyToUserId: t.Optional(t.String()),
      tweetedAt: t.String(),
      rawPayload: t.Optional(t.Record(t.String(), t.Any())),
    })
  ),
});

export const twitterRoutes = new Elysia({ prefix: '/v1/twitter', tags: ['Twitter'] })
  .guard({
    beforeHandle: async ({ request, set }) => {
      console.log('[GUARD] ========== GUARD CALLED ==========');
      
      const apiKey = request.headers.get('x-api-key');
      const authorization = request.headers.get('authorization');
      const token = authorization?.split(' ')[1];
      
      // Require at least one authentication method
      if (!apiKey && !token) {
        console.log('[GUARD] ❌ No authentication - BLOCKING');
        set.status = 401;
        return {
          success: false,
          error: 'Authentication required. Provide either X-API-Key or Authorization header.'
        };
      }
      
      // Validate API key if provided
      if (apiKey) {
        console.log('[GUARD] 🔑 Validating API key...');
        const keyHash = await hashApiKey(apiKey);
        const [key] = await db
          .select()
          .from(apiKeys)
          .where(eq(apiKeys.keyHash, keyHash))
          .limit(1);
        
        if (!key || !key.isActive) {
          console.log('[GUARD] ❌ Invalid or inactive API key - BLOCKING');
          set.status = 401;
          return {
            success: false,
            error: 'Invalid or inactive API key'
          };
        }
        
        if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
          console.log('[GUARD] ❌ API key expired - BLOCKING');
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
          .catch(err => console.error('[GUARD] Failed to update lastUsedAt:', err));
        
        console.log('[GUARD] ✅ API key valid:', key.name);
        return; // Allow request to continue
      }
      
      // Validate JWT if provided
      if (token) {
        console.log('[GUARD] 🔐 Validating JWT token...');
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          console.log('[GUARD] ❌ Invalid JWT token - BLOCKING');
          set.status = 401;
          return {
            success: false,
            error: 'Invalid or expired token'
          };
        }
        
        console.log('[GUARD] ✅ JWT valid:', user.email);
        return; // Allow request to continue
      }
    }
  }, (app) => app
    /**
     * GET /v1/twitter/handle/:handle/tweets
     * Get tweets by Twitter handle (for external clients)
     */
    .get(
    '/handle/:handle/tweets',
    async ({ params, query, set }) => {
      console.log('🔥 ROUTE HANDLER CALLED - /handle/:handle/tweets');
      try {
        const { handle } = params;
        const { limit = '25', offset = '0' } = query;
        
        // Find DAO by Twitter handle
        const [dao] = await db
          .select({ id: daoEntities.id, name: daoEntities.name })
          .from(daoEntities)
          .where(eq(daoEntities.twitterHandle, handle))
          .limit(1);
        
        if (!dao) {
          set.status = 404;
          return {
            success: false,
            error: `Twitter handle @${handle} not found`,
          };
        }
        
        // Get tweets for this DAO
        const tweets = await db
          .select({
            id: twitterPosts.id,
            tweetId: twitterPosts.tweetId,
            author: twitterPosts.author,
            content: twitterPosts.content,
            tweetMetrics: twitterPosts.tweetMetrics,
            hashtags: twitterPosts.hashtags,
            mentions: twitterPosts.mentions,
            media: twitterPosts.media,
            conversationId: twitterPosts.conversationId,
            inReplyToId: twitterPosts.inReplyToId,
            tweetedAt: twitterPosts.tweetedAt,
            ingestedAt: twitterPosts.ingestedAt,
          })
          .from(twitterPosts)
          .where(eq(twitterPosts.daoId, dao.id))
          .orderBy(desc(twitterPosts.tweetedAt))
          .limit(parseInt(limit))
          .offset(parseInt(offset));
        
        return {
          success: true,
          data: {
            handle: handle,
            daoName: dao.name,
            tweets: tweets,
            pagination: {
              limit: parseInt(limit),
              offset: parseInt(offset),
              count: tweets.length,
            },
          },
        };
      } catch (error: any) {
        console.error('[twitterRoutes] Error fetching tweets by handle:', error);
        set.status = 500;
        return {
          success: false,
          error: error.message || 'Failed to fetch tweets',
        };
      }
    },
    {
      params: t.Object({
        handle: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Get tweets by Twitter handle',
        description: 'Fetch tweets for a specific Twitter handle. Returns tweets ordered by date (newest first).',
        tags: ['Twitter'],
        parameters: [
          {
            in: 'path',
            name: 'handle',
            required: true,
            schema: { type: 'string' },
            description: 'Twitter handle (without @)',
            example: 'BioProtocol',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'string', default: '25' },
            description: 'Number of tweets to return (default: 25, max: 100)',
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'string', default: '0' },
            description: 'Pagination offset',
          },
        ],
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    handle: 'molecule_dao',
                    daoName: 'Molecule',
                    tweets: [
                      {
                        id: 'uuid',
                        tweetId: '1234567890',
                        author: {
                          id: '123456',
                          name: 'Molecule',
                          username: 'molecule_dao',
                        },
                        content: 'Exciting announcement!',
                        tweetMetrics: {
                          retweet_count: 50,
                          reply_count: 25,
                          like_count: 300,
                        },
                        tweetedAt: '2025-11-20T10:00:00.000Z',
                      },
                    ],
                    pagination: {
                      limit: 50,
                      offset: 0,
                      count: 1,
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Twitter handle not found',
          },
        },
      },
    }
  )
  
  /**
   * GET /v1/twitter/handle/:handle/engagement
   * Get engagement metrics by Twitter handle
   */
  .get(
    '/handle/:handle/engagement',
    async ({ params, query, set }) => {
      try {
        const { handle } = params;
        const { days = '30' } = query;
        
        // Find DAO by Twitter handle
        const [dao] = await db
          .select({ id: daoEntities.id, name: daoEntities.name })
          .from(daoEntities)
          .where(eq(daoEntities.twitterHandle, handle))
          .limit(1);
        
        if (!dao) {
          set.status = 404;
          return {
            success: false,
            error: `Twitter handle @${handle} not found`,
          };
        }
        
        const history = await getEngagementHistory(dao.id, parseInt(days));
        
        return {
          success: true,
          data: {
            handle: handle,
            daoName: dao.name,
            engagement: history,
          },
        };
      } catch (error: any) {
        console.error('[twitterRoutes] Error fetching engagement by handle:', error);
        set.status = 500;
        return {
          success: false,
          error: error.message || 'Failed to fetch engagement',
        };
      }
    },
    {
      params: t.Object({
        handle: t.String(),
      }),
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Get engagement metrics by Twitter handle',
        description: 'Fetch engagement history (likes, retweets, replies, views) for a specific Twitter handle.',
        tags: ['Twitter'],
        parameters: [
          {
            in: 'path',
            name: 'handle',
            required: true,
            schema: { type: 'string' },
            description: 'Twitter handle (without @)',
            example: 'BioProtocol',
          },
          {
            in: 'query',
            name: 'days',
            schema: { type: 'string', default: '30' },
            description: 'Number of days of history',
          },
        ],
      },
    }
  )
  
  /**
   * GET /v1/twitter/handle/:handle/followers
   * Get follower history by Twitter handle
   */
  .get(
    '/handle/:handle/followers',
    async ({ params, query, set }) => {
      try {
        const { handle } = params;
        const { days = '30' } = query;
        
        // Find DAO by Twitter handle
        const [dao] = await db
          .select({ id: daoEntities.id, name: daoEntities.name })
          .from(daoEntities)
          .where(eq(daoEntities.twitterHandle, handle))
          .limit(1);
        
        if (!dao) {
          set.status = 404;
          return {
            success: false,
            error: `Twitter handle @${handle} not found`,
          };
        }
        
        const history = await getFollowerHistory(dao.id, parseInt(days));
        
        return {
          success: true,
          data: {
            handle: handle,
            daoName: dao.name,
            followers: history,
          },
        };
      } catch (error: any) {
        console.error('[twitterRoutes] Error fetching followers by handle:', error);
        set.status = 500;
        return {
          success: false,
          error: error.message || 'Failed to fetch followers',
        };
      }
    },
    {
      params: t.Object({
        handle: t.String(),
      }),
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Get follower history by Twitter handle',
        description: 'Fetch follower count history for a specific Twitter handle.',
        tags: ['Twitter'],
        parameters: [
          {
            in: 'path',
            name: 'handle',
            required: true,
            schema: { type: 'string' },
            description: 'Twitter handle (without @)',
            example: 'BioProtocol',
          },
          {
            in: 'query',
            name: 'days',
            schema: { type: 'string', default: '30' },
            description: 'Number of days of history',
          },
        ],
      },
    }
  )
  .post('/ingest', async ({ body }) => {
    const { orgId, daoId, posts } = ingestSchema.parse(body);

    const values = posts.map((post: any) => ({
      orgId,
      daoId,
      tweetId: post.tweetId,
      author: post.author,
      content: post.content,
      tweetMetrics: post.tweetMetrics ?? {},
      hashtags: post.hashtags ?? [],
      mentions: post.mentions ?? [],
      media: post.media ?? [],
      conversationId: post.conversationId,
      inReplyToId: post.inReplyToId,
      inReplyToUserId: post.inReplyToUserId,
      tweetedAt: new Date(post.tweetedAt),
      rawPayload: post.rawPayload ?? null,
    }));

    await db
      .insert(twitterPosts)
      .values(values)
      .onConflictDoUpdate({
        target: twitterPosts.tweetId,
        set: {
          content: sql`excluded.content`,
          tweetMetrics: sql`excluded.tweet_metrics`,
          hashtags: sql`excluded.hashtags`,
          mentions: sql`excluded.mentions`,
          media: sql`excluded.media`,
          conversationId: sql`excluded.conversation_id`,
          inReplyToId: sql`excluded.in_reply_to_id`,
          inReplyToUserId: sql`excluded.in_reply_to_user_id`,
          updatedAt: sql`NOW()`
        },
      });

    return { success: true, count: values.length };
  })
  .get('/posts', async ({ query }) => {
    const limit = Number(query.limit ?? 50);
    const daoId = query.daoId as string | undefined;
    const since = query.since ? new Date(query.since as string) : undefined;

    const whereClauses = [] as any[];
    if (daoId) {
      whereClauses.push(eq(twitterPosts.daoId, daoId));
    }
    if (since) {
      whereClauses.push(sql`${twitterPosts.tweetedAt} >= ${since}`);
    }

    const rows = await db
      .select()
      .from(twitterPosts)
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(twitterPosts.tweetedAt))
      .limit(limit);

    return { data: rows };
  })
  .post('/sync', async () => {
    await syncTwitterAccounts();
    return { success: true };
  })
  .get('/followers/:slug', async ({ params, query, set }) => {
    const days = query.days ? Number(query.days) : undefined;
    if (days !== undefined && Number.isNaN(days)) {
      set.status = 400;
      return { error: 'Invalid days parameter' };
    }

    const data = await getFollowerHistory(params.slug, days);
    return { data };
  })
  .get('/engagement/:slug', async ({ params, query, set }) => {
    const days = query.days ? Number(query.days) : undefined;
    if (days !== undefined && Number.isNaN(days)) {
      set.status = 400;
      return { error: 'Invalid days parameter' };
    }

    const data = await getEngagementHistory(params.slug, days);
    return { data };
  })
); // Close the guard
