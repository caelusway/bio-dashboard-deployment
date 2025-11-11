import { eq, sql } from 'drizzle-orm';
import { env } from '../config/env';
import { db } from '../db/client';
import { daoEntities, twitterPosts, daoFollowerSnapshots } from '../db/schema';

type DaoEntity = typeof daoEntities.$inferSelect;

interface TwitterUserResponse {
  data?: {
    id: string;
    name: string;
    username: string;
  };
  errors?: Array<{ message: string }>;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{ id: string; type: string }>;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    impression_count?: number;
    bookmark_count?: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ id?: string; username?: string; name?: string }>;
    urls?: Array<Record<string, unknown>>;
  };
}

interface TwitterTweetsResponse {
  data?: TwitterTweet[];
  meta?: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
  errors?: Array<{ message: string }>;
}

const TWITTER_API_BASE = 'https://api.twitter.com/2';

type TwitterUserData = {
  id: string;
  name: string;
  username: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
};

async function fetchUser(handle: string): Promise<TwitterUserData | null> {
  const response = await fetch(
    `${TWITTER_API_BASE}/users/by/username/${encodeURIComponent(handle)}?user.fields=id,username,name,public_metrics`,
    {
      headers: {
        Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Twitter user lookup failed for @${handle}: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as TwitterUserResponse;
  return payload.data ?? null;
}

async function fetchRecentTweets(userId: string, sinceId?: string): Promise<TwitterTweet[]> {
  const params = new URLSearchParams({
    'tweet.fields': 'created_at,public_metrics,entities,conversation_id,in_reply_to_user_id,referenced_tweets',
    max_results: '100',
  });

  if (sinceId) {
    params.set('since_id', sinceId);
  }

  const response = await fetch(
    `${TWITTER_API_BASE}/users/${encodeURIComponent(userId)}/tweets?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Tweet fetch failed for user ${userId}: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as TwitterTweetsResponse;
  return payload.data ?? [];
}

async function syncDao(handle: string, entity: DaoEntity): Promise<void> {
  const normalizedHandle = handle.replace(/^@/, '').trim();
  if (!normalizedHandle) {
    console.warn(`Skipping DAO ${entity.slug}: missing twitter handle`);
    return;
  }

  const metadata = (entity.metadata ?? {}) as Record<string, any>;
  let twitterUserId: string | undefined = metadata.twitter_user_id;
  let twitterUserName: string | undefined = metadata.twitter_user_name;

  if (!twitterUserId) {
    const user = await fetchUser(normalizedHandle);
    if (!user) {
      console.warn(`Twitter user not found for handle @${normalizedHandle}`);
      return;
    }
    twitterUserId = user.id;
    twitterUserName = user.name;
    metadata.twitter_user_id = user.id;
    metadata.twitter_user_name = user.name;
    metadata.twitter_username = user.username;
    if (user.public_metrics?.followers_count !== undefined) {
      metadata.twitter_followers = user.public_metrics.followers_count;
    }
  }

  // If follower count is stale or missing, fetch user info again to refresh metrics.
  if (!('twitter_followers' in metadata) || !entity.followerCountUpdatedAt || Date.now() - new Date(entity.followerCountUpdatedAt).getTime() > 6 * 60 * 60 * 1000) {
    const user = await fetchUser(normalizedHandle);
    if (user?.public_metrics?.followers_count !== undefined) {
      metadata.twitter_followers = user.public_metrics.followers_count;
      metadata.twitter_following = user.public_metrics.following_count;
      metadata.twitter_tweet_count = user.public_metrics.tweet_count;
      metadata.twitter_listed = user.public_metrics.listed_count;
    }
  }

  const tweets = await fetchRecentTweets(twitterUserId, entity.lastTweetId ?? undefined);

  const followersCount = metadata.twitter_followers ?? entity.followerCount ?? null;

  if (!tweets.length) {
    await db
      .update(daoEntities)
      .set({
        lastSyncedAt: new Date(),
        followerCount: followersCount,
        followerCountUpdatedAt: followersCount ? new Date() : entity.followerCountUpdatedAt,
        metadata,
      })
      .where(eq(daoEntities.id, entity.id));
    console.log(`No new tweets for @${normalizedHandle}`);
    return;
  }

  const now = new Date();
  const values = tweets.map((tweet) => {
    const replyRef = tweet.referenced_tweets?.find((ref) => ref.type === 'replied_to');
    return {
      orgId: entity.orgId,
      daoId: entity.id,
      tweetId: tweet.id,
      author: {
        username: normalizedHandle,
        name: twitterUserName ?? entity.name,
        id: twitterUserId,
      },
      content: tweet.text,
      tweetMetrics: {
        retweet_count: tweet.public_metrics?.retweet_count ?? 0,
        reply_count: tweet.public_metrics?.reply_count ?? 0,
        like_count: tweet.public_metrics?.like_count ?? 0,
        quote_count: tweet.public_metrics?.quote_count ?? 0,
        view_count: tweet.public_metrics?.impression_count ?? 0,
        bookmark_count: tweet.public_metrics?.bookmark_count ?? 0,
      },
      hashtags: tweet.entities?.hashtags ?? [],
      mentions: tweet.entities?.mentions ?? [],
      media: [],
      conversationId: tweet.conversation_id,
      inReplyToId: replyRef?.id,
      inReplyToUserId: tweet.in_reply_to_user_id,
      tweetedAt: new Date(tweet.created_at),
      ingestedAt: now,
      rawPayload: tweet,
    } satisfies typeof twitterPosts.$inferInsert;
  });

  try {
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
          updatedAt: sql`NOW()`,
          rawPayload: sql`excluded.raw_payload`,
        },
      });
  } catch (error) {
    console.error(`Failed to upsert tweets for @${normalizedHandle}:`, error);
    throw error;
  }

  const newestTweetId = tweets[0]?.id ?? entity.lastTweetId ?? null;

  await db
    .update(daoEntities)
    .set({
      lastSyncedAt: now,
      lastTweetId: newestTweetId,
      followerCount: followersCount,
      followerCountUpdatedAt: followersCount ? now : entity.followerCountUpdatedAt,
      metadata,
    })
    .where(eq(daoEntities.id, entity.id));

  console.log(`Synced ${tweets.length} tweets for @${normalizedHandle}`);
}

export async function syncTwitterAccounts(): Promise<void> {
  const daos = await db
    .select()
    .from(daoEntities)
    .where(sql`${daoEntities.twitterHandle} IS NOT NULL AND ${daoEntities.twitterHandle} <> ''`);

  for (const dao of daos) {
    try {
      await syncDao(dao.twitterHandle, dao);
      if (dao.followerCount !== null && dao.followerCount !== undefined) {
        await db.insert(daoFollowerSnapshots).values({
          daoId: dao.id,
          count: dao.followerCount,
          metadata: dao.metadata,
        });
      }
    } catch (error) {
      console.error(`Error syncing DAO ${dao.slug}:`, error);
    }
  }
}

if (import.meta.main) {
  syncTwitterAccounts()
    .then(() => {
      console.log('✅ Twitter sync completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Twitter sync failed:', error);
      process.exit(1);
    });
}
