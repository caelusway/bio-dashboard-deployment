import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { daoEntities, daoFollowerSnapshots, twitterPosts } from '../db/schema';
import { eq, sql, desc, and, gte, inArray } from 'drizzle-orm';
import { syncAllDaoProfileImages, syncDaoProfileImage } from '../services/twitterProfileImage';
import { authGuard } from '../middleware/authGuard';

export const daoRoutes = new Elysia({ prefix: '/daos' })
  .guard(authGuard, (app) => app
    // Get all DAOs with summary stats (with pagination)
    .get(
    '/',
    async ({ query }) => {
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '12');
      const sortBy = query.sortBy || 'followers';
      const offset = (page - 1) * limit;

      // Get total count for pagination metadata (exclude DAOs with 0 or null followers)
      const totalCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(daoEntities)
        .where(sql`${daoEntities.followerCount} > 0`);

      // For growth sorting, we need to fetch ALL DAOs, calculate growth, sort, then paginate
      // For other sorting, we can paginate at the database level
      const shouldFetchAll = sortBy === 'growth';

      const baseQuery = db
        .select({
          id: daoEntities.id,
          slug: daoEntities.slug,
          name: daoEntities.name,
          twitterHandle: daoEntities.twitterHandle,
          followerCount: daoEntities.followerCount,
          lastSyncedAt: daoEntities.lastSyncedAt,
          metadata: daoEntities.metadata,
          totalPosts: sql<number>`count(distinct ${twitterPosts.id})::int`,
        })
        .from(daoEntities)
        .leftJoin(twitterPosts, eq(twitterPosts.daoId, daoEntities.id))
        .where(sql`${daoEntities.followerCount} > 0`)  // ✅ Filter out 0 or null followers
        .groupBy(daoEntities.id);

      // Apply sorting and pagination based on sortBy parameter
      let daosWithPosts;
      if (sortBy === 'posts') {
        daosWithPosts = await baseQuery
          .orderBy(desc(sql`count(distinct ${twitterPosts.id})`))
          .limit(shouldFetchAll ? undefined : limit)
          .offset(shouldFetchAll ? undefined : offset);
      } else {
        // Default to followers sorting (or fetch all for growth sorting)
        daosWithPosts = await baseQuery
          .orderBy(desc(daoEntities.followerCount))
          .limit(shouldFetchAll ? undefined : limit)
          .offset(shouldFetchAll ? undefined : offset);
      }

      // Fetch follower growth data only for paginated DAOs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const daoIds = daosWithPosts.map((dao) => dao.id);

      const allSnapshots = await db
        .select({
          daoId: daoFollowerSnapshots.daoId,
          count: daoFollowerSnapshots.count,
          recordedAt: daoFollowerSnapshots.recordedAt,
        })
        .from(daoFollowerSnapshots)
        .where(
          and(
            inArray(daoFollowerSnapshots.daoId, daoIds),
            gte(daoFollowerSnapshots.recordedAt, thirtyDaysAgo)
          )
        )
        .orderBy(daoFollowerSnapshots.daoId, daoFollowerSnapshots.recordedAt);

      // Group snapshots by DAO ID for efficient lookup
      const snapshotsByDao = new Map<string, typeof allSnapshots>();
      allSnapshots.forEach((snapshot) => {
        if (!snapshotsByDao.has(snapshot.daoId)) {
          snapshotsByDao.set(snapshot.daoId, []);
        }
        snapshotsByDao.get(snapshot.daoId)!.push(snapshot);
      });

      // Calculate stats for each DAO
      const daosWithStats = daosWithPosts.map((dao) => {
        let followerGrowth = 0;
        let followerGrowthPct = 0;

        const recentSnapshots = snapshotsByDao.get(dao.id) || [];
        if (recentSnapshots.length >= 2) {
          const oldestCount = recentSnapshots[0].count;
          const latestCount = recentSnapshots[recentSnapshots.length - 1].count;
          followerGrowth = latestCount - oldestCount;
          followerGrowthPct = oldestCount > 0 ? (followerGrowth / oldestCount) * 100 : 0;
        }

        const metadata = dao.metadata as any;
        const profileImageUrl = metadata?.profileImageUrl || null;

        return {
          id: dao.id,
          slug: dao.slug,
          name: dao.name,
          twitterHandle: dao.twitterHandle,
          followerCount: dao.followerCount || 0,
          followerGrowth,
          followerGrowthPct: parseFloat(followerGrowthPct.toFixed(2)),
          totalPosts: dao.totalPosts || 0,
          lastSyncedAt: dao.lastSyncedAt,
          profileImageUrl,
        };
      });

      // If sorting by growth, we need to sort after calculating growth stats, then paginate
      let finalDaos = daosWithStats;
      if (sortBy === 'growth') {
        const sorted = [...daosWithStats].sort((a, b) => b.followerGrowthPct - a.followerGrowthPct);
        finalDaos = sorted.slice(offset, offset + limit);
      }

      const total = totalCount[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: finalDaos,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
      }),
    }
  )

  // Get specific DAO details
  .get(
    '/:slug',
    async ({ params }) => {
      const dao = await db.select().from(daoEntities).where(eq(daoEntities.slug, params.slug)).limit(1);

      if (dao.length === 0) {
        return {
          success: false,
          error: 'DAO not found',
        };
      }

      return {
        success: true,
        data: dao[0],
      };
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  )

  // Get DAO follower history
  .get(
    '/:slug/followers',
    async ({ params, query }) => {
      const dao = await db.select().from(daoEntities).where(eq(daoEntities.slug, params.slug)).limit(1);

      if (dao.length === 0) {
        return {
          success: false,
          error: 'DAO not found',
        };
      }

      const days = parseInt(query.days || '365');
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const snapshots = await db
        .select()
        .from(daoFollowerSnapshots)
        .where(
          and(
            eq(daoFollowerSnapshots.daoId, dao[0].id),
            gte(daoFollowerSnapshots.recordedAt, daysAgo)
          )
        )
        .orderBy(daoFollowerSnapshots.recordedAt);

      return {
        success: true,
        data: snapshots.map((snapshot) => ({
          count: snapshot.count,
          recordedAt: snapshot.recordedAt,
        })),
      };
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
      query: t.Object({
        days: t.Optional(t.String()),
      }),
    }
  )

  // Get DAO Twitter analytics
  .get(
    '/:slug/analytics',
    async ({ params, query }) => {
      const dao = await db.select().from(daoEntities).where(eq(daoEntities.slug, params.slug)).limit(1);

      if (dao.length === 0) {
        return {
          success: false,
          error: 'DAO not found',
        };
      }

      const days = parseInt(query.days || '90');
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      // Get all tweets for this DAO in the time period
      const tweets = await db
        .select()
        .from(twitterPosts)
        .where(
          and(
            eq(twitterPosts.daoId, dao[0].id),
            gte(twitterPosts.tweetedAt, daysAgo)
          )
        )
        .orderBy(desc(twitterPosts.tweetedAt));

      // Calculate engagement metrics
      const totalTweets = tweets.length;

      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      let totalImpressions = 0;

      tweets.forEach((tweet) => {
        const metrics = tweet.tweetMetrics as any;
        if (metrics) {
          totalLikes += metrics.like_count || 0;
          totalRetweets += metrics.retweet_count || 0;
          totalReplies += metrics.reply_count || 0;
          totalImpressions += metrics.impression_count || 0;
        }
      });

      const avgEngagement = totalTweets > 0
        ? (totalLikes + totalRetweets + totalReplies) / totalTweets
        : 0;

      const avgLikes = totalTweets > 0 ? totalLikes / totalTweets : 0;
      const avgRetweets = totalTweets > 0 ? totalRetweets / totalTweets : 0;
      const avgReplies = totalTweets > 0 ? totalReplies / totalTweets : 0;

      // Calculate engagement rate (engagement per follower)
      const engagementRate = dao[0].followerCount > 0
        ? ((totalLikes + totalRetweets + totalReplies) / (totalTweets * dao[0].followerCount)) * 100
        : 0;

      // Group tweets by day for activity chart
      const tweetsByDay: { [key: string]: number } = {};
      tweets.forEach((tweet) => {
        const date = new Date(tweet.tweetedAt).toISOString().split('T')[0];
        tweetsByDay[date] = (tweetsByDay[date] || 0) + 1;
      });

      const activityData = Object.entries(tweetsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Get top performing tweets
      const topTweets = [...tweets]
        .sort((a, b) => {
          const aMetrics = a.tweetMetrics as any;
          const bMetrics = b.tweetMetrics as any;
          const aTotal = (aMetrics?.like_count || 0) + (aMetrics?.retweet_count || 0) + (aMetrics?.reply_count || 0);
          const bTotal = (bMetrics?.like_count || 0) + (bMetrics?.retweet_count || 0) + (bMetrics?.reply_count || 0);
          return bTotal - aTotal;
        })
        .slice(0, 10)
        .map((tweet) => ({
          id: tweet.tweetId,
          content: tweet.content,
          tweetedAt: tweet.tweetedAt,
          metrics: tweet.tweetMetrics,
        }));

      return {
        success: true,
        data: {
          summary: {
            totalTweets,
            totalEngagement: totalLikes + totalRetweets + totalReplies,
            totalLikes,
            totalRetweets,
            totalReplies,
            totalImpressions,
            avgEngagement: Math.round(avgEngagement),
            avgLikes: Math.round(avgLikes),
            avgRetweets: Math.round(avgRetweets),
            avgReplies: Math.round(avgReplies),
            engagementRate: parseFloat(engagementRate.toFixed(4)),
          },
          activityData,
          topTweets,
        },
      };
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
      query: t.Object({
        days: t.Optional(t.String()),
      }),
    }
  )

  // Get DAO ecosystem overview
  .get('/stats/ecosystem', async () => {
    // Total DAOs
    const totalDaos = await db.select({ count: sql<number>`count(*)::int` }).from(daoEntities);

    // Total followers across all DAOs
    const totalFollowers = await db
      .select({ sum: sql<number>`sum(follower_count)::int` })
      .from(daoEntities);

    // Total posts
    const totalPosts = await db.select({ count: sql<number>`count(*)::int` }).from(twitterPosts);

    // Top 5 DAOs by followers (exclude DAOs with 0 or null followers)
    const topDaos = await db
      .select({
        name: daoEntities.name,
        slug: daoEntities.slug,
        followerCount: daoEntities.followerCount,
      })
      .from(daoEntities)
      .where(sql`${daoEntities.followerCount} > 0`)
      .orderBy(desc(daoEntities.followerCount))
      .limit(5);

    // Ecosystem follower growth over last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const ecosystemGrowth = await db
      .select({
        date: sql<string>`DATE(${daoFollowerSnapshots.recordedAt})`,
        totalFollowers: sql<number>`sum(${daoFollowerSnapshots.count})::int`,
      })
      .from(daoFollowerSnapshots)
      .where(gte(daoFollowerSnapshots.recordedAt, ninetyDaysAgo))
      .groupBy(sql`DATE(${daoFollowerSnapshots.recordedAt})`)
      .orderBy(sql`DATE(${daoFollowerSnapshots.recordedAt})`);

    return {
      success: true,
      data: {
        totalDaos: totalDaos[0]?.count || 0,
        totalFollowers: totalFollowers[0]?.sum || 0,
        totalPosts: totalPosts[0]?.count || 0,
        topDaos,
        ecosystemGrowth,
      },
    };
  })

  // Get DAO ecosystem weekly stats
  .get('/stats/weekly', async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Total DAOs
    const totalDaos = await db.select({ count: sql<number>`count(*)::int` }).from(daoEntities);

    // Total reach (current followers)
    const totalFollowers = await db
      .select({ sum: sql<number>`sum(follower_count)::int` })
      .from(daoEntities);

    // Get all DAOs with their IDs for subsequent queries
    const allDaos = await db.select({ id: daoEntities.id, slug: daoEntities.slug, name: daoEntities.name }).from(daoEntities);
    const daoIds = allDaos.map(dao => dao.id);

    // Weekly follower growth - get most recent snapshot per DAO for current week
    const latestSnapshots = await db
      .select({
        daoId: daoFollowerSnapshots.daoId,
        count: sql<number>`MAX(${daoFollowerSnapshots.count})::int`,
      })
      .from(daoFollowerSnapshots)
      .where(
        and(
          inArray(daoFollowerSnapshots.daoId, daoIds),
          gte(daoFollowerSnapshots.recordedAt, sevenDaysAgo)
        )
      )
      .groupBy(daoFollowerSnapshots.daoId);

    const weekOldSnapshots = await db
      .select({
        daoId: daoFollowerSnapshots.daoId,
        count: sql<number>`MAX(${daoFollowerSnapshots.count})::int`,
      })
      .from(daoFollowerSnapshots)
      .where(
        and(
          inArray(daoFollowerSnapshots.daoId, daoIds),
          gte(daoFollowerSnapshots.recordedAt, fourteenDaysAgo)
        )
      )
      .groupBy(daoFollowerSnapshots.daoId);

    // Calculate weekly growth
    const currentTotal = latestSnapshots.reduce((sum, s) => sum + s.count, 0);
    const previousTotal = weekOldSnapshots.reduce((sum, s) => sum + s.count, 0);
    const weeklyGrowth = currentTotal - previousTotal;
    const weeklyGrowthPct = previousTotal > 0 ? (weeklyGrowth / previousTotal) * 100 : 0;

    // Top performer by growth percentage
    const growthByDao = new Map<string, { current: number; previous: number }>();

    latestSnapshots.forEach(s => {
      growthByDao.set(s.daoId, { current: s.count, previous: 0 });
    });

    weekOldSnapshots.forEach(s => {
      if (!growthByDao.has(s.daoId)) {
        growthByDao.set(s.daoId, { current: 0, previous: s.count });
      } else {
        growthByDao.get(s.daoId)!.previous = s.count;
      }
    });

    const daoGrowths = Array.from(growthByDao.entries())
      .map(([daoId, counts]) => {
        const growth = counts.current - counts.previous;
        const growthPct = counts.previous > 0 ? (growth / counts.previous) * 100 : 0;
        const dao = allDaos.find(d => d.id === daoId);
        return {
          daoId,
          name: dao?.name || '',
          slug: dao?.slug || '',
          growth,
          growthPct,
        };
      })
      .filter(d => d.name !== '' && d.growthPct !== 0)
      .sort((a, b) => b.growthPct - a.growthPct);

    const topPerformer = daoGrowths[0] || null;

    // Most active DAO (most tweets in last 7 days)
    const mostActiveDaos = await db
      .select({
        daoId: twitterPosts.daoId,
        tweetCount: sql<number>`count(*)::int`,
      })
      .from(twitterPosts)
      .where(gte(twitterPosts.tweetedAt, sevenDaysAgo))
      .groupBy(twitterPosts.daoId)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const mostActive = mostActiveDaos.length > 0
      ? {
          ...allDaos.find(d => d.id === mostActiveDaos[0].daoId),
          tweetCount: mostActiveDaos[0].tweetCount,
        }
      : null;

    // Engagement leader (best engagement rate in last 7 days)
    const recentTweets = await db
      .select({
        daoId: twitterPosts.daoId,
        tweetMetrics: twitterPosts.tweetMetrics,
      })
      .from(twitterPosts)
      .where(
        and(
          inArray(twitterPosts.daoId, daoIds),
          gte(twitterPosts.tweetedAt, sevenDaysAgo)
        )
      );

    const engagementByDao = new Map<string, { totalEngagement: number; tweetCount: number }>();

    recentTweets.forEach(tweet => {
      const metrics = tweet.tweetMetrics as any;
      const engagement = (metrics?.like_count || 0) + (metrics?.retweet_count || 0) + (metrics?.reply_count || 0);

      if (!engagementByDao.has(tweet.daoId)) {
        engagementByDao.set(tweet.daoId, { totalEngagement: 0, tweetCount: 0 });
      }

      const stats = engagementByDao.get(tweet.daoId)!;
      stats.totalEngagement += engagement;
      stats.tweetCount += 1;
    });

    // Get follower counts for engagement rate calculation
    const daosWithFollowers = await db
      .select({
        id: daoEntities.id,
        name: daoEntities.name,
        slug: daoEntities.slug,
        followerCount: daoEntities.followerCount,
      })
      .from(daoEntities)
      .where(inArray(daoEntities.id, Array.from(engagementByDao.keys())));

    const engagementLeaders = daosWithFollowers
      .map(dao => {
        const stats = engagementByDao.get(dao.id);
        if (!stats || stats.tweetCount === 0 || !dao.followerCount || dao.followerCount === 0) {
          return null;
        }

        const avgEngagementPerTweet = stats.totalEngagement / stats.tweetCount;
        const engagementRate = (avgEngagementPerTweet / dao.followerCount) * 100;

        return {
          name: dao.name,
          slug: dao.slug,
          engagementRate,
          avgEngagement: Math.round(avgEngagementPerTweet),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.engagementRate - a!.engagementRate);

    const engagementLeader = engagementLeaders[0] || null;

    // 7-day sparkline data for total followers
    const sparklineData = await db
      .select({
        date: sql<string>`DATE(${daoFollowerSnapshots.recordedAt})`,
        totalFollowers: sql<number>`sum(${daoFollowerSnapshots.count})::int`,
      })
      .from(daoFollowerSnapshots)
      .where(gte(daoFollowerSnapshots.recordedAt, sevenDaysAgo))
      .groupBy(sql`DATE(${daoFollowerSnapshots.recordedAt})`)
      .orderBy(sql`DATE(${daoFollowerSnapshots.recordedAt})`);

    // Total posts across all DAOs
    const totalPosts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(twitterPosts);

    // Largest DAO by follower count (exclude DAOs with 0 or null followers)
    const largestDao = await db
      .select({
        name: daoEntities.name,
        slug: daoEntities.slug,
        followerCount: daoEntities.followerCount,
      })
      .from(daoEntities)
      .where(sql`${daoEntities.followerCount} > 0`)
      .orderBy(desc(daoEntities.followerCount))
      .limit(1);

    return {
      success: true,
      data: {
        totalDaos: totalDaos[0]?.count || 0,
        totalFollowers: totalFollowers[0]?.sum || 0,
        totalPosts: totalPosts[0]?.count || 0,
        weeklyGrowth,
        weeklyGrowthPct: parseFloat(weeklyGrowthPct.toFixed(2)),
        topPerformer,
        largestDao: largestDao[0] || null,
        mostActive,
        engagementLeader,
        sparklineData,
      },
    };
  })

  // Get DAO growth chart data (top DAOs over time)
  .get('/stats/growth-chart', async ({ query }) => {
    const days = parseInt(query.days as string) || 30;
    const limit = parseInt(query.limit as string) || 8;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get top DAOs by current follower count (exclude DAOs with 0 or null followers)
    const topDaos = await db
      .select({
        id: daoEntities.id,
        slug: daoEntities.slug,
        name: daoEntities.name,
        followerCount: daoEntities.followerCount,
      })
      .from(daoEntities)
      .where(sql`${daoEntities.followerCount} > 0`)
      .orderBy(desc(daoEntities.followerCount))
      .limit(limit);

    const daoIds = topDaos.map(dao => dao.id);

    // Get daily snapshots for these DAOs
    const snapshots = await db
      .select({
        daoId: daoFollowerSnapshots.daoId,
        date: sql<string>`DATE(${daoFollowerSnapshots.recordedAt})`,
        count: sql<number>`MAX(${daoFollowerSnapshots.count})::int`,
      })
      .from(daoFollowerSnapshots)
      .where(
        and(
          inArray(daoFollowerSnapshots.daoId, daoIds),
          gte(daoFollowerSnapshots.recordedAt, startDate)
        )
      )
      .groupBy(daoFollowerSnapshots.daoId, sql`DATE(${daoFollowerSnapshots.recordedAt})`)
      .orderBy(sql`DATE(${daoFollowerSnapshots.recordedAt})`);

    // Group snapshots by DAO
    const snapshotsByDao = new Map<string, Array<{ date: string; count: number }>>();
    for (const snapshot of snapshots) {
      if (!snapshotsByDao.has(snapshot.daoId)) {
        snapshotsByDao.set(snapshot.daoId, []);
      }
      snapshotsByDao.get(snapshot.daoId)!.push({
        date: snapshot.date,
        count: snapshot.count,
      });
    }

    // Build response with DAO info and their timeseries data
    const chartData = topDaos.map(dao => ({
      id: dao.id,
      slug: dao.slug,
      name: dao.name,
      currentFollowers: dao.followerCount,
      data: snapshotsByDao.get(dao.id) || [],
    }));

    return {
      success: true,
      data: {
        daos: chartData,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
          days,
        },
      },
    };
  })

  // Get engagement breakdown data (top 10 DAOs by total engagement)
  .get('/stats/engagement-breakdown', async () => {
    // Use raw SQL for better performance with JSONB operations
    const result = await db.execute<{
      daoName: string;
      daoSlug: string;
      totalLikes: string;
      totalRetweets: string;
      totalReplies: string;
      totalEngagement: string;
    }>(sql`
      WITH engagement_metrics AS (
        SELECT
          dao_id,
          COALESCE((tweet_metrics->>'like_count')::integer, 0) as likes,
          COALESCE((tweet_metrics->>'retweet_count')::integer, 0) as retweets,
          COALESCE((tweet_metrics->>'reply_count')::integer, 0) as replies
        FROM twitter_posts
        WHERE tweet_metrics IS NOT NULL
      ),
      dao_engagement AS (
        SELECT
          em.dao_id,
          SUM(em.likes) as total_likes,
          SUM(em.retweets) as total_retweets,
          SUM(em.replies) as total_replies,
          SUM(em.likes + em.retweets + em.replies) as total_engagement
        FROM engagement_metrics em
        GROUP BY em.dao_id
        ORDER BY total_engagement DESC
        LIMIT 10
      )
      SELECT
        de.name as "daoName",
        de.slug as "daoSlug",
        COALESCE(dag.total_likes, 0)::text as "totalLikes",
        COALESCE(dag.total_retweets, 0)::text as "totalRetweets",
        COALESCE(dag.total_replies, 0)::text as "totalReplies",
        COALESCE(dag.total_engagement, 0)::text as "totalEngagement"
      FROM dao_engagement dag
      INNER JOIN dao_entities de ON de.id = dag.dao_id
      ORDER BY dag.total_engagement DESC
    `);

    return {
      success: true,
      data: result,
    };
  })

  // Sync profile images for all DAOs
  .post('/sync-profile-images', async () => {
    const result = await syncAllDaoProfileImages();

    return {
      success: result.success > 0,
      data: {
        successCount: result.success,
        failedCount: result.failed,
        errors: result.errors,
      },
      message: `Successfully synced ${result.success} profile images. ${result.failed} failed.`,
    };
  })

  // Sync profile image for a specific DAO
  .post(
    '/:slug/sync-profile-image',
    async ({ params }) => {
      const result = await syncDaoProfileImage(params.slug);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          profileImageUrl: result.profileImageUrl,
        },
        message: 'Profile image synced successfully',
      };
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  )
); // Close the guard
