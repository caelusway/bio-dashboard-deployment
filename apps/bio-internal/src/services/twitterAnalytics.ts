import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { daoEntities, daoFollowerSnapshots, twitterPosts } from '../db/schema';

export interface FollowerHistoryPoint {
  recordedAt: string;
  count: number;
}

export interface EngagementPoint {
  day: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  impressions: number;
  bookmarks: number;
  tweets: number;
}

const DEFAULT_RANGE_DAYS = 30;

export async function getFollowerHistory(slug: string, days = DEFAULT_RANGE_DAYS): Promise<FollowerHistoryPoint[]> {
  const dao = await db
    .select({ id: daoEntities.id })
    .from(daoEntities)
    .where(eq(daoEntities.slug, slug))
    .limit(1);

  const daoId = dao[0]?.id;
  if (!daoId) {
    return [];
  }

  const rows = await db
    .select({
      recordedAt: daoFollowerSnapshots.recordedAt,
      count: daoFollowerSnapshots.count,
    })
    .from(daoFollowerSnapshots)
    .where(
      and(
        eq(daoFollowerSnapshots.daoId, daoId),
        sql`${daoFollowerSnapshots.recordedAt} >= NOW() - INTERVAL '${days} days'`,
      ),
    )
    .orderBy(daoFollowerSnapshots.recordedAt);

  return rows.map((row) => ({
    recordedAt: formatDate(row.recordedAt),
    count: row.count,
  }));
}

export async function getEngagementHistory(slug: string, days = DEFAULT_RANGE_DAYS): Promise<EngagementPoint[]> {
  const dao = await db
    .select({ id: daoEntities.id })
    .from(daoEntities)
    .where(eq(daoEntities.slug, slug))
    .limit(1);

  const daoId = dao[0]?.id;
  if (!daoId) {
    return [];
  }

  const rows = await db
    .select({
      day: sql`date_trunc('day', ${twitterPosts.tweetedAt})`.as('day'),
      likes: sql`SUM((( ${twitterPosts.tweetMetrics} )->>'like_count')::int)`.
        mapWith(Number).as('likes'),
      retweets: sql`SUM((( ${twitterPosts.tweetMetrics} )->>'retweet_count')::int)`.
        mapWith(Number).as('retweets'),
      replies: sql`SUM((( ${twitterPosts.tweetMetrics} )->>'reply_count')::int)`.
        mapWith(Number).as('replies'),
      quotes: sql`SUM((( ${twitterPosts.tweetMetrics} )->>'quote_count')::int)`.
        mapWith(Number).as('quotes'),
      impressions: sql`SUM((( ${twitterPosts.tweetMetrics} )->>'view_count')::int)`.
        mapWith(Number).as('impressions'),
      bookmarks: sql`SUM((( ${twitterPosts.tweetMetrics} )->>'bookmark_count')::int)`.
        mapWith(Number).as('bookmarks'),
      tweets: sql`COUNT(*)`.mapWith(Number).as('tweets'),
    })
    .from(twitterPosts)
    .where(
      and(
        eq(twitterPosts.daoId, daoId),
        sql`${twitterPosts.tweetedAt} >= NOW() - INTERVAL '${days} days'`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${twitterPosts.tweetedAt})`)
    .orderBy(sql`date_trunc('day', ${twitterPosts.tweetedAt})`);

  return rows.map((row) => ({
    day: formatDate(row.day),
    likes: row.likes ?? 0,
    retweets: row.retweets ?? 0,
    replies: row.replies ?? 0,
    quotes: row.quotes ?? 0,
    impressions: row.impressions ?? 0,
    bookmarks: row.bookmarks ?? 0,
    tweets: row.tweets ?? 0,
  }));
}

function formatDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return new Date(value as string).toISOString();
}
