/**
 * Discord Reports API Routes
 * 🔒 Protected with flexAuth (JWT or API key)
 */

import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { discordChannels, discordMessages, discordReports, daoEntities } from '../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { authGuard } from '../middleware/authGuard';

export const discordRoutes = new Elysia({ prefix: '/api/discord', tags: ['Discord'] })
  .guard(authGuard, (app) => app
    /**
     * GET /api/discord/channels
     * Get all Discord channels with DAO info
     */
    .get(
    '/channels',
    async () => {
      try {
        const channels = await db
        .select({
          id: discordChannels.id,
          channelId: discordChannels.channelId,
          name: discordChannels.name,
          type: discordChannels.type,
          category: discordChannels.category,
          categoryId: discordChannels.categoryId,
          lastSyncedAt: discordChannels.lastSyncedAt,
          daoId: discordChannels.daoId,
          daoName: daoEntities.name,
          daoSlug: daoEntities.slug,
        })
        .from(discordChannels)
        .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id));

      // Sort in JavaScript instead of SQL to avoid orderBy issues
      const sortedChannels = channels.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return a.name.localeCompare(b.name);
      });

      // Add isForum flag based on type
      const channelsWithForum = sortedChannels.map(channel => ({
        ...channel,
        isForum: channel.type === 'forum',
      }));

      return {
        success: true,
        data: channelsWithForum,
      };
    } catch (error) {
      console.error('Error fetching Discord channels:', error);
      return {
        success: false,
        error: 'Failed to fetch Discord channels',
      };
    }
  })

  /**
   * GET /api/discord/reports
   * Get all Discord reports with filtering
   */
  .get(
    '/reports',
    async ({ query }) => {
      try {
        const { channelId, reportType, daoId, limit = '50', hideEmpty = 'false' } = query;

        // Build filter conditions
        const conditions = [];
        if (channelId) {
          conditions.push(eq(discordReports.channelId, channelId));
        }
        if (reportType) {
          conditions.push(eq(discordReports.reportType, reportType as 'weekly' | 'monthly'));
        }
        if (daoId) {
          conditions.push(eq(discordChannels.daoId, daoId));
        }
        
        // Filter out empty reports (reports with 0 messages)
        if (hideEmpty === 'true') {
          conditions.push(sql`CAST((${discordReports.metadata}->'stats'->>'totalMessages') AS INTEGER) > 0`);
        }

        // Build base query
        const baseQuery = db
          .select({
            id: discordReports.id,
            channelId: discordReports.channelId,
            reportType: discordReports.reportType,
            periodStart: discordReports.periodStart,
            periodEnd: discordReports.periodEnd,
            content: discordReports.content,
            summary: discordReports.summary,
            status: discordReports.status,
            metadata: discordReports.metadata,
            createdAt: discordReports.createdAt,
            channelName: discordChannels.name,
            channelCategory: discordChannels.category,
            daoId: daoEntities.id,
            daoName: daoEntities.name,
            daoSlug: daoEntities.slug,
          })
          .from(discordReports)
          .leftJoin(discordChannels, eq(discordReports.channelId, discordChannels.id))
          .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id))
          .$dynamic();

        // Execute query with or without filters
        const reports = conditions.length > 0
          ? await baseQuery
              .where(and(...conditions))
              .orderBy(desc(discordReports.createdAt))
              .limit(parseInt(limit))
          : await baseQuery
              .orderBy(desc(discordReports.createdAt))
              .limit(parseInt(limit));

        return {
          success: true,
          data: reports,
        };
      } catch (error) {
        console.error('Error fetching Discord reports:', error);
        return {
          success: false,
          error: 'Failed to fetch Discord reports',
        };
      }
    },
    {
      query: t.Object({
        channelId: t.Optional(t.String()),
        reportType: t.Optional(t.String()),
        daoId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        hideEmpty: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /api/discord/reports/:id
   * Get a specific report by ID
   */
  .get('/reports/:id', async ({ params }) => {
    try {
      const [report] = await db
        .select({
          id: discordReports.id,
          channelId: discordReports.channelId,
          reportType: discordReports.reportType,
          periodStart: discordReports.periodStart,
          periodEnd: discordReports.periodEnd,
          content: discordReports.content,
          summary: discordReports.summary,
          status: discordReports.status,
          metadata: discordReports.metadata,
          createdAt: discordReports.createdAt,
          channelName: discordChannels.name,
          channelCategory: discordChannels.category,
          daoId: daoEntities.id,
          daoName: daoEntities.name,
          daoSlug: daoEntities.slug,
        })
        .from(discordReports)
        .leftJoin(discordChannels, eq(discordReports.channelId, discordChannels.id))
        .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id))
        .where(eq(discordReports.id, params.id))
        .limit(1);

      if (!report) {
        return {
          success: false,
          error: 'Report not found',
        };
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      console.error('Error fetching Discord report:', error);
      return {
        success: false,
        error: 'Failed to fetch Discord report',
      };
    }
  })

  /**
   * GET /api/discord/stats
   * Get Discord statistics
   */
  .get('/stats', async () => {
    try {
      // Get total channels
      const [channelCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(discordChannels);

      // Get total messages
      const [messageCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(discordMessages);

      // Get total reports
      const [reportCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(discordReports);

      // Get messages per DAO
      const messagesByDao = await db
        .select({
          daoId: daoEntities.id,
          daoName: daoEntities.name,
          daoSlug: daoEntities.slug,
          messageCount: sql<number>`count(${discordMessages.id})::int`,
        })
        .from(discordMessages)
        .leftJoin(discordChannels, eq(discordMessages.channelId, discordChannels.id))
        .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id))
        .groupBy(daoEntities.id, daoEntities.name, daoEntities.slug)
        .orderBy(desc(sql`count(${discordMessages.id})`))
        .limit(10);

      // Get latest sync times
      const latestSync = await db
        .select({
          channelName: discordChannels.name,
          lastSyncedAt: discordChannels.lastSyncedAt,
        })
        .from(discordChannels)
        .orderBy(desc(discordChannels.lastSyncedAt))
        .limit(5);

      return {
        success: true,
        data: {
          totalChannels: channelCount.count,
          totalMessages: messageCount.count,
          totalReports: reportCount.count,
          messagesByDao,
          latestSync,
        },
      };
    } catch (error) {
      console.error('Error fetching Discord stats:', error);
      return {
        success: false,
        error: 'Failed to fetch Discord statistics',
      };
    }
  })
); // Close the guard

