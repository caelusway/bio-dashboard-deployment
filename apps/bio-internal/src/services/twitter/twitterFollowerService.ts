import { env } from '../../config/env';
import { db } from '../../db/client';
import { daoEntities, daoFollowerSnapshots } from '../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { TWITTER_CONFIG, RATE_LIMITS } from './twitterConfig';
import type { TwitterUserInfo } from './twitterTypes';

export class TwitterFollowerService {
    private bearerToken: string;
    private rateLimitCounter: number = 0;
    private lastResetTime: number = Date.now();

    constructor(bearerToken?: string) {
        this.bearerToken = bearerToken || env.TWITTER_BEARER_TOKEN;

        // Reset rate limit counter every 15 minutes
        setInterval(() => {
            this.rateLimitCounter = 0;
            this.lastResetTime = Date.now();
        }, 15 * 60 * 1000);
    }

    private async checkRateLimit(): Promise<void> {
        if (this.rateLimitCounter >= RATE_LIMITS.TWEETS_PER_15_MIN) {
            const waitTime = 15 * 60 * 1000 - (Date.now() - this.lastResetTime);
            if (waitTime > 0) {
                console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
            this.rateLimitCounter = 0;
        }
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMITS.DELAY_BETWEEN_REQUESTS));
        this.rateLimitCounter++;
    }

    /**
     * Fetch user information including follower count by username
     */
    async getUserInfo(username: string): Promise<TwitterUserInfo | null> {
        try {
            await this.checkRateLimit();

            const response = await fetch(
                `${TWITTER_CONFIG.BASE_URL}/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics,verified,created_at`,
                {
                    headers: {
                        Authorization: `Bearer ${this.bearerToken}`,
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error fetching user info for ${username}:`, errorText);
                return null;
            }

            const data = await response.json();
            return data.data as TwitterUserInfo;
        } catch (error: any) {
            console.error(`Error fetching user info for ${username}:`, error.message);
            return null;
        }
    }

    /**
     * Fetch follower count for multiple users by usernames
     */
    async getMultipleUsersInfo(usernames: string[]): Promise<TwitterUserInfo[]> {
        try {
            await this.checkRateLimit();

            // Twitter API allows up to 100 usernames per request
            const usernameParam = usernames.slice(0, 100).join(',');

            const response = await fetch(
                `${TWITTER_CONFIG.BASE_URL}/users/by?usernames=${encodeURIComponent(usernameParam)}&user.fields=public_metrics,verified,created_at`,
                {
                    headers: {
                        Authorization: `Bearer ${this.bearerToken}`,
                    },
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error fetching multiple users info:', errorText);
                return [];
            }

            const data = await response.json();
            return data.data || [];
        } catch (error: any) {
            console.error('Error fetching multiple users info:', error.message);
            return [];
        }
    }

    /**
     * Update follower count and metadata for a specific DAO entity
     */
    async updateDaoFollowerCount(daoId: string, followerCount: number, userInfo?: TwitterUserInfo): Promise<void> {
        try {
            // Prepare update data - always update follower count
            const updateData: any = {
                followerCount: followerCount,
                followerCountUpdatedAt: new Date(),
                updatedAt: new Date(),
            };

            // Check if metadata is already available
            const [currentDao] = await db
                .select({ metadata: daoEntities.metadata })
                .from(daoEntities)
                .where(eq(daoEntities.id, daoId))
                .limit(1);

            const hasMetadata = currentDao?.metadata && Object.keys(currentDao.metadata as object).length > 0;

            // If we have additional user info from Twitter and metadata is not available, update it
            if (userInfo && !hasMetadata) {
                const newMetadata = {
                    twitterDisplayName: userInfo.name,
                    description: userInfo.description,
                    logoUrl: userInfo.profile_image_url,
                    twitterVerified: userInfo.verified,
                    twitterUserId: userInfo.id,
                    ...((currentDao?.metadata as object) || {})
                };
                
                updateData.metadata = newMetadata;
            }

            // Update the dao_entities record
            await db
                .update(daoEntities)
                .set(updateData)
                .where(eq(daoEntities.id, daoId));

            // Create a follower snapshot
            await db.insert(daoFollowerSnapshots).values({
                daoId: daoId,
                count: followerCount,
                recordedAt: new Date(),
            });

            const metadataUpdated = userInfo ? ' (with metadata)' : '';
            console.log(`✅ Recorded follower snapshot for DAO ${daoId}: ${followerCount}${metadataUpdated}`);
        } catch (error: any) {
            console.error(`❌ Error recording follower snapshot for DAO ${daoId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get all DAO entities with Twitter handles
     */
    async getDAOsWithTwitterHandles() {
        try {
            const daos = await db
                .select()
                .from(daoEntities)
                .where(sql`${daoEntities.twitterHandle} IS NOT NULL AND ${daoEntities.twitterHandle} <> ''`);

            return daos;
        } catch (error: any) {
            console.error('Error fetching DAOs with Twitter handles:', error.message);
            return [];
        }
    }

    /**
     * Update follower counts for all DAOs
     */
    async updateAllFollowerCounts(): Promise<{ success: number; errors: number }> {
        console.log('🚀 Starting follower count update for all DAOs...');

        const daos = await this.getDAOsWithTwitterHandles();
        let success = 0;
        let errors = 0;

        console.log(`📊 Found ${daos.length} DAOs with Twitter handles`);

        // Process DAOs in batches to respect rate limits
        const batchSize = 50;
        for (let i = 0; i < daos.length; i += batchSize) {
            const batch = daos.slice(i, i + batchSize);
            const usernames = batch.map((dao) => dao.twitterHandle).filter(Boolean) as string[];

            if (usernames.length === 0) continue;

            try {
                console.log(
                    `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(daos.length / batchSize)}`
                );

                const usersInfo = await this.getMultipleUsersInfo(usernames);

                // Create a map for quick lookup
                const userInfoMap = new Map<string, TwitterUserInfo>();
                usersInfo.forEach((user) => {
                    userInfoMap.set(user.username.toLowerCase(), user);
                });

                for (const dao of batch) {
                    if (!dao.twitterHandle) continue;

                    const userInfo = userInfoMap.get(dao.twitterHandle.toLowerCase());
                    if (userInfo) {
                        try {
                            await this.updateDaoFollowerCount(dao.id, userInfo.public_metrics.followers_count, userInfo);
                            success++;
                        } catch (error) {
                            console.error(`❌ Failed to update ${dao.name} (${dao.twitterHandle}):`, error);
                            errors++;
                        }
                    } else {
                        console.warn(`⚠️ User info not found for ${dao.name} (${dao.twitterHandle})`);
                        errors++;
                    }
                }

                // Add delay between batches
                if (i + batchSize < daos.length) {
                    console.log('⏳ Waiting 2 seconds before next batch...');
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ Error processing batch starting at index ${i}:`, error);
                errors += batch.length;
            }
        }

        console.log(`✅ Follower count update completed! Success: ${success}, Errors: ${errors}`);
        console.log('📈 Snapshots recorded for growth tracking');

        return { success, errors };
    }

    /**
     * Get follower snapshots for a DAO
     */
    async getFollowerSnapshots(daoId: string, limit: number = 30) {
    try {
        const snapshots = await db
            .select()
            .from(daoFollowerSnapshots)
            .where(eq(daoFollowerSnapshots.daoId, daoId))
            .orderBy(desc(daoFollowerSnapshots.recordedAt))
            .limit(limit);

        return snapshots;
    } catch (error: any) {
        console.error(`Error fetching follower snapshots for DAO ${daoId}:`, error.message);
        return [];
    }
}

    /**
     * Get DAOs with the highest follower counts
     */
    async getTopDAOsByFollowers(limit: number = 10) {
    try {
        const topDaos = await db
            .select()
            .from(daoEntities)
            .where(sql`${daoEntities.followerCount} IS NOT NULL`)
            .orderBy(desc(daoEntities.followerCount))
            .limit(limit);

        return topDaos;
    } catch (error: any) {
        console.error('Error fetching top DAOs by followers:', error.message);
        return [];
    }
}

    /**
     * Get growth over specified number of days for a DAO
     */
    async getDAOGrowthOverDays(daoId: string, days: number): Promise < {
    daoId: string;
    startDate: Date;
    endDate: Date;
    startFollowers: number;
    endFollowers: number;
    growthAmount: number;
    growthPercentage: number;
} | null > {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get snapshots at start and end of period
        const [startSnapshot] = await db
            .select()
            .from(daoFollowerSnapshots)
            .where(
                sql`${daoFollowerSnapshots.daoId} = ${daoId} AND ${daoFollowerSnapshots.recordedAt} >= ${startDate.toISOString()}`
            )
            .orderBy(daoFollowerSnapshots.recordedAt)
            .limit(1);

        const [endSnapshot] = await db
            .select()
            .from(daoFollowerSnapshots)
            .where(eq(daoFollowerSnapshots.daoId, daoId))
            .orderBy(desc(daoFollowerSnapshots.recordedAt))
            .limit(1);

        if(!startSnapshot || !endSnapshot) {
    return null;
}

const growthAmount = endSnapshot.count - startSnapshot.count;
const growthPercentage =
    startSnapshot.count > 0 ? (growthAmount / startSnapshot.count) * 100 : 0;

return {
    daoId,
    startDate: new Date(startSnapshot.recordedAt!),
    endDate: new Date(endSnapshot.recordedAt!),
    startFollowers: startSnapshot.count,
    endFollowers: endSnapshot.count,
    growthAmount,
    growthPercentage,
};
        } catch (error: any) {
    console.error(`Error fetching ${days}-day growth for DAO ${daoId}:`, error.message);
    return null;
}
    }

    /**
     * Get top growing DAOs over a period
     */
    async getTopGrowingDAOsOverDays(days: number = 7, limit: number = 10) {
    try {
        const daos = await this.getDAOsWithTwitterHandles();
        const growthData = [];

        for (const dao of daos) {
            const growth = await this.getDAOGrowthOverDays(dao.id, days);
            if (growth && growth.growthAmount !== 0) {
                growthData.push({
                    daoName: dao.name,
                    twitterHandle: dao.twitterHandle,
                    ...growth,
                });
            }
        }

        // Sort by growth amount (descending)
        growthData.sort((a, b) => b.growthAmount - a.growthAmount);

        return growthData.slice(0, limit);
    } catch (error: any) {
        console.error(`Error fetching top growing DAOs over ${days} days:`, error.message);
        return [];
    }
}
}

export default TwitterFollowerService;
