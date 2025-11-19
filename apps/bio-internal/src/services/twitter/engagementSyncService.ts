import { env } from '../../config/env';
import { db } from '../../db/client';
import { daoEntities, twitterPosts } from '../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { TWITTER_CONFIG } from './twitterConfig';
import { RateLimitManager } from './rateLimitManager';
import { SyncLogger, LogLevel } from './syncLogger';
import type { TwitterPost, EngagementSyncOptions, SyncStats } from './twitterTypes';

export class EngagementSyncService {
    private bearerToken: string;
    private rateLimitManager: RateLimitManager;
    private logger: SyncLogger;
    private syncInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private lastApiErrorTime: number = 0;

    constructor(
        bearerToken?: string,
        private options: EngagementSyncOptions = {
            daysToLookBack: 5,
            syncIntervalHours: 2,
            maxRequestsPerBatch: 5,
        }
    ) {
        this.bearerToken = bearerToken || env.TWITTER_BEARER_TOKEN;
        this.rateLimitManager = new RateLimitManager();
        this.logger = new SyncLogger('EngagementSync');
    }

    /**
     * Safely convert Twitter date to ISO format
     */
    private formatTwitterDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            return date.toISOString();
        } catch (error) {
            this.logger.warn(`Invalid date format: ${dateString}, using current timestamp`);
            return new Date().toISOString();
        }
    }

    /**
     * Validate and sanitize tweet data before database insertion
     */
    private validateTweetData(
        tweet: any,
        dao: any
    ): { isValid: boolean; data?: any; error?: string } {
        try {
            if (!tweet.id || typeof tweet.id !== 'string') {
                return { isValid: false, error: 'Missing or invalid tweet ID' };
            }

            if (!tweet.text || typeof tweet.text !== 'string') {
                return { isValid: false, error: 'Missing or invalid tweet text' };
            }

            if (!tweet.created_at || typeof tweet.created_at !== 'string') {
                return { isValid: false, error: 'Missing or invalid tweet created_at' };
            }

            const truncatedText = tweet.text.length > 5000 ? tweet.text.substring(0, 5000) + '...' : tweet.text;
            const formattedDate = this.formatTwitterDate(tweet.created_at);
            const metrics = tweet.public_metrics || {};

            const tweetData = {
                orgId: dao.orgId,
                daoId: dao.id,
                tweetId: tweet.id,
                author: {
                    username: dao.twitterHandle,
                    name: dao.name,
                    id: tweet.author_id || null,
                },
                content: truncatedText,
                tweetMetrics: {
                    retweet_count: Math.max(0, parseInt(metrics.retweet_count) || 0),
                    reply_count: Math.max(0, parseInt(metrics.reply_count) || 0),
                    like_count: Math.max(0, parseInt(metrics.like_count) || 0),
                    quote_count: Math.max(0, parseInt(metrics.quote_count) || 0),
                    view_count: Math.max(0, parseInt(metrics.impression_count) || 0),
                    bookmark_count: Math.max(0, parseInt(metrics.bookmark_count) || 0),
                },
                hashtags: Array.isArray(tweet.entities?.hashtags) ? tweet.entities.hashtags : [],
                mentions: Array.isArray(tweet.entities?.mentions) ? tweet.entities.mentions : [],
                media: Array.isArray(tweet.attachments?.media_keys) ? tweet.attachments.media_keys : [],
                conversationId: tweet.conversation_id || tweet.id,
                inReplyToId: tweet.in_reply_to_status_id || null,
                inReplyToUserId: tweet.in_reply_to_user_id || null,
                tweetedAt: new Date(formattedDate),
                ingestedAt: new Date(),
                rawPayload: tweet,
            };

            return { isValid: true, data: tweetData };
        } catch (error) {
            return {
                isValid: false,
                error: `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * Wait for 15 minutes after API error before retrying
     */
    private async waitForApiErrorCooldown(): Promise<void> {
        const now = Date.now();
        const timeSinceLastError = now - this.lastApiErrorTime;
        const waitTime = 15 * 60 * 1000;

        if (timeSinceLastError < waitTime) {
            const remainingWait = waitTime - timeSinceLastError;
            this.logger.warn(`API error cooldown: waiting ${Math.round(remainingWait / 1000 / 60)} minutes`);
            await new Promise((resolve) => setTimeout(resolve, remainingWait));
        }
    }

    /**
     * Handle API errors with automatic retry after 15 minutes
     */
    private async handleApiError(error: any, context: string): Promise<void> {
        this.lastApiErrorTime = Date.now();
        this.logger.error(`API error in ${context}: ${error.message || error}`, error);

        const errorMessage = (error.message || error.toString()).toLowerCase();
        const shouldWait =
            errorMessage.includes('rate limit') ||
            errorMessage.includes('too many requests') ||
            errorMessage.includes('429') ||
            errorMessage.includes('service unavailable') ||
            errorMessage.includes('503');

        if (shouldWait) {
            this.logger.warn('API error detected - will wait 15 minutes before next retry');
        }
    }

    /**
     * Get all DAOs with Twitter handles
     */
    private async getDAOTwitterAccounts() {
        const daos = await db
            .select()
            .from(daoEntities)
            .where(sql`${daoEntities.twitterHandle} IS NOT NULL`);

        return daos || [];
    }

    /**
     * Get Twitter user ID from username
     */
    private async getTwitterUserId(username: string): Promise<string | null> {
        try {
            await this.waitForApiErrorCooldown();
            await this.rateLimitManager.checkRateLimit();

            const response = await fetch(
                `${TWITTER_CONFIG.BASE_URL}/users/by/username/${encodeURIComponent(username)}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.bearerToken}`,
                    },
                }
            );

            this.rateLimitManager.incrementRequestCount();

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Failed to get user ID for @${username}: ${errorText}`);
                return null;
            }

            const data = await response.json();
            return data.data?.id || null;
        } catch (error) {
            await this.handleApiError(error, `getTwitterUserId(@${username})`);
            return null;
        }
    }

    /**
     * Get the last synced tweet ID for a DAO
     */
    private async getLastSyncedTweetId(daoId: string): Promise<string | null> {
        try {
            const [lastTweet] = await db
                .select({ tweetId: twitterPosts.tweetId })
                .from(twitterPosts)
                .where(eq(twitterPosts.daoId, daoId))
                .orderBy(desc(twitterPosts.tweetedAt))
                .limit(1);

            return lastTweet?.tweetId || null;
        } catch (error: any) {
            this.logger.error(`Failed to get last synced tweet for DAO ${daoId}`, error);
            return null;
        }
    }

    /**
     * Fetch new tweets from Twitter timeline for a DAO
     */
    private async fetchNewTweetsFromTimeline(dao: any): Promise<TwitterPost[]> {
        try {
            const userId = await this.getTwitterUserId(dao.twitterHandle);
            if (!userId) {
                this.logger.warn(`Could not find Twitter user ID for @${dao.twitterHandle}`);
                return [];
            }

            const lastTweetId = await this.getLastSyncedTweetId(dao.id);
            this.logger.info(`Fetching new tweets for ${dao.name} since ${lastTweetId || 'beginning'}`);

            await this.waitForApiErrorCooldown();
            await this.rateLimitManager.checkRateLimit();

            const params = new URLSearchParams({
                'tweet.fields': 'created_at,public_metrics,entities,conversation_id,in_reply_to_user_id,author_id',
                max_results: '100',
            });

            if (lastTweetId) {
                params.set('since_id', lastTweetId);
            }

            const response = await fetch(
                `${TWITTER_CONFIG.BASE_URL}/users/${userId}/tweets?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.bearerToken}`,
                    },
                }
            );

            this.rateLimitManager.incrementRequestCount();

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Tweet fetch failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            const newTweets = data.data || [];

            this.logger.info(`Found ${newTweets.length} new tweets for ${dao.name}`);
            return newTweets;
        } catch (error) {
            await this.handleApiError(error, `fetchNewTweetsFromTimeline(${dao.name})`);
            return [];
        }
    }

    /**
     * Store new tweets in the database
     */
    private async storeNewTweets(dao: any, tweets: TwitterPost[]): Promise<number> {
        if (tweets.length === 0) return 0;

        let stored = 0;

        for (const tweet of tweets) {
            try {
                const validation = this.validateTweetData(tweet, dao);
                if (!validation.isValid) {
                    this.logger.error(`Invalid tweet data for ${tweet.id}: ${validation.error}`);
                    continue;
                }

                await db.insert(twitterPosts).values(validation.data).onConflictDoNothing();
                stored++;
                this.logger.debug(`Stored new tweet ${tweet.id}`);
            } catch (error: any) {
                // Silently skip duplicates
                if (!error.message?.includes('duplicate')) {
                    this.logger.error(`Error storing tweet ${tweet.id}: ${error.message}`, error);
                }
            }
        }

        return stored;
    }

    /**
     * Get recent tweets for a DAO from the last N days
     */
    private async getRecentTweets(daoId: string, days: number = 5) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        try {
            const tweets = await db
                .select()
                .from(twitterPosts)
                .where(
                    sql`${twitterPosts.daoId} = ${daoId} AND ${twitterPosts.tweetedAt} >= ${cutoffDate.toISOString()}`
                )
                .orderBy(desc(twitterPosts.tweetedAt));

            return tweets || [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch recent tweets for DAO ${daoId}`, error);
            return [];
        }
    }

    /**
     * Fetch latest engagement data for tweet IDs
     */
    private async fetchEngagementData(tweetIds: string[]): Promise<TwitterPost[]> {
        try {
            await this.waitForApiErrorCooldown();
            await this.rateLimitManager.checkRateLimit();

            const params = new URLSearchParams({
                ids: tweetIds.join(','),
                'tweet.fields': 'public_metrics,created_at,author_id',
            });

            const response = await fetch(`${TWITTER_CONFIG.BASE_URL}/tweets?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${this.bearerToken}`,
                },
            });

            this.rateLimitManager.incrementRequestCount();

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Engagement fetch failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            await this.handleApiError(error, `fetchEngagementData(${tweetIds.length} tweets)`);
            throw error;
        }
    }

    /**
     * Update engagement metrics for tweets
     */
    private async updateEngagementMetrics(
        daoId: string,
        tweets: TwitterPost[]
    ): Promise<{ updated: number; added: number }> {
        let updated = 0;
        let added = 0;

        for (const tweet of tweets) {
            try {
                const metrics = tweet.public_metrics || {};
                const tweetMetrics = {
                    retweet_count: Math.max(0, parseInt(metrics.retweet_count as any) || 0),
                    reply_count: Math.max(0, parseInt(metrics.reply_count as any) || 0),
                    like_count: Math.max(0, parseInt(metrics.like_count as any) || 0),
                    quote_count: Math.max(0, parseInt(metrics.quote_count as any) || 0),
                    view_count: Math.max(0, parseInt(metrics.impression_count as any) || 0),
                    bookmark_count: Math.max(0, parseInt(metrics.bookmark_count as any) || 0),
                };

                // Try to update existing tweet
                const result = await db
                    .update(twitterPosts)
                    .set({
                        tweetMetrics: tweetMetrics,
                        updatedAt: new Date(),
                    })
                    .where(eq(twitterPosts.tweetId, tweet.id));

                updated++;
                this.logger.debug(`Updated engagement for tweet ${tweet.id}`);
            } catch (error: any) {
                this.logger.error(`Error processing tweet ${tweet.id}: ${error.message}`, error);
            }
        }

        return { updated, added };
    }

    /**
     * Sync engagement data for a specific DAO
     */
    private async syncDAOEngagement(dao: any): Promise<Partial<SyncStats>> {
        const startTime = Date.now();
        const stats: Partial<SyncStats> = {
            totalTweetsProcessed: 0,
            tweetsUpdated: 0,
            tweetsAdded: 0,
            apiRequestsUsed: 0,
            errors: [],
        };

        try {
            this.logger.info(`Starting engagement sync for ${dao.name} (@${dao.twitterHandle})`);

            // Step 1: Fetch and store new tweets
            const newTweets = await this.fetchNewTweetsFromTimeline(dao);
            const newTweetsStored = await this.storeNewTweets(dao, newTweets);

            stats.tweetsAdded = newTweetsStored;
            stats.apiRequestsUsed = (stats.apiRequestsUsed || 0) + (newTweets.length > 0 ? 2 : 1);

            this.logger.info(`Stored ${newTweetsStored} new tweets for ${dao.name}`);

            // Step 2: Get recent tweets for engagement update
            const recentTweets = await this.getRecentTweets(dao.id, this.options.daysToLookBack);

            if (recentTweets.length === 0) {
                this.logger.info(`No recent tweets found for ${dao.name}`);
                return stats;
            }

            this.logger.info(`Found ${recentTweets.length} recent tweets to update for ${dao.name}`);

            // Step 3: Process in batches
            const batchSize = this.options.maxRequestsPerBatch;
            const tweetIds = recentTweets.map((t) => t.tweetId);

            for (let i = 0; i < tweetIds.length; i += batchSize) {
                const batch = tweetIds.slice(i, i + batchSize);

                if (!this.rateLimitManager.canMakeRequest()) {
                    this.logger.warn('Rate limit reached, waiting...');
                    await this.rateLimitManager.waitForRateLimit();
                }

                try {
                    const freshTweets = await this.fetchEngagementData(batch);
                    stats.apiRequestsUsed = (stats.apiRequestsUsed || 0) + 1;

                    const { updated, added } = await this.updateEngagementMetrics(dao.id, freshTweets);

                    stats.tweetsUpdated = (stats.tweetsUpdated || 0) + updated;
                    stats.tweetsAdded = (stats.tweetsAdded || 0) + added;
                    stats.totalTweetsProcessed = (stats.totalTweetsProcessed || 0) + freshTweets.length;

                    this.logger.info(`Processed batch: ${updated} updated, ${added} added`);
                } catch (error) {
                    const errorMsg = `Failed to process batch for ${dao.name}: ${error}`;
                    stats.errors?.push(errorMsg);
                    this.logger.error(errorMsg, error);
                }
            }

            const duration = Date.now() - startTime;
            stats.syncDuration = duration;

            this.logger.info(
                `Completed sync for ${dao.name}: ${stats.totalTweetsProcessed} tweets processed in ${duration}ms`
            );
        } catch (error) {
            const errorMsg = `Failed to sync ${dao.name}: ${error}`;
            stats.errors?.push(errorMsg);
            this.logger.error(errorMsg, error);
        }

        return stats;
    }

    /**
     * Run engagement sync for all DAOs
     */
    async runEngagementSync(): Promise<SyncStats> {
        if (this.isRunning) {
            this.logger.warn('Engagement sync already running, skipping...');
            throw new Error('Sync already in progress');
        }

        this.isRunning = true;
        const overallStartTime = Date.now();

        const aggregateStats: SyncStats = {
            totalTweetsProcessed: 0,
            tweetsUpdated: 0,
            tweetsAdded: 0,
            apiRequestsUsed: 0,
            syncDuration: 0,
            errors: [],
        };

        try {
            this.logger.info('Starting Twitter engagement sync cycle');

            const daos = await this.getDAOTwitterAccounts();
            this.logger.info(`Found ${daos.length} DAOs with Twitter handles`);

            for (const dao of daos) {
                try {
                    const daoStats = await this.syncDAOEngagement(dao);

                    aggregateStats.totalTweetsProcessed += daoStats.totalTweetsProcessed || 0;
                    aggregateStats.tweetsUpdated += daoStats.tweetsUpdated || 0;
                    aggregateStats.tweetsAdded += daoStats.tweetsAdded || 0;
                    aggregateStats.apiRequestsUsed += daoStats.apiRequestsUsed || 0;
                    aggregateStats.errors.push(...(daoStats.errors || []));
                } catch (error) {
                    const errorMsg = `Failed to sync DAO ${dao.name}: ${error}`;
                    aggregateStats.errors.push(errorMsg);
                    this.logger.error(errorMsg, error);
                }
            }

            aggregateStats.syncDuration = Date.now() - overallStartTime;
            await this.logger.logSyncStats(aggregateStats);

            this.logger.info(
                `Engagement sync completed: ${aggregateStats.totalTweetsProcessed} tweets processed, ${aggregateStats.apiRequestsUsed} API requests used`
            );
        } catch (error) {
            this.logger.error('Fatal error in engagement sync', error);
            aggregateStats.errors.push(`Fatal error: ${error}`);
        } finally {
            this.isRunning = false;
        }

        return aggregateStats;
    }

    /**
     * Start automated engagement sync
     */
    startAutomaticSync(): void {
        if (this.syncInterval) {
            this.logger.warn('Automatic sync already started');
            return;
        }

        this.logger.info(`Starting automatic engagement sync every ${this.options.syncIntervalHours} hours`);

        // Run initial sync
        this.runEngagementSync().catch((error) => {
            this.logger.error('Initial sync failed', error);
        });

        // Set up interval
        this.syncInterval = setInterval(
            () => {
                const timeSinceLastError = Date.now() - this.lastApiErrorTime;
                if (timeSinceLastError < 15 * 60 * 1000) {
                    this.logger.info('Skipping scheduled sync - still in API error cooldown period');
                    return;
                }

                this.runEngagementSync().catch((error) => {
                    this.logger.error('Scheduled sync failed', error);
                });
            },
            this.options.syncIntervalHours * 60 * 60 * 1000
        );

        this.logger.info('Automatic engagement sync started');
    }

    /**
     * Stop automated engagement sync
     */
    stopAutomaticSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.logger.info('Automatic engagement sync stopped');
        }
    }

    /**
     * Get current sync status
     */
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            isAutomatic: !!this.syncInterval,
            rateLimitStatus: this.rateLimitManager.getStatus(),
            rateLimitUsage: this.rateLimitManager.getUsageStats(),
            options: this.options,
        };
    }
}
