import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { twitterPosts } from '../db/schema';
import { syncTwitterAccounts } from '../jobs/twitterSync';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roles';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getEngagementHistory, getFollowerHistory } from '../services/twitterAnalytics';

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

export const twitterRoutes = new Elysia({ prefix: '/v1/twitter' })
  .use(authMiddleware)
  .use(roleGuard(['admin', 'analyst']))
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
  });
