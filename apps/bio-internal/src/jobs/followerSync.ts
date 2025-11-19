import { TwitterFollowerService } from '../services/twitter';

/**
 * Daily Follower Sync Job
 *
 * Fetches current follower counts from Twitter for all DAOs
 * and records daily snapshots for growth tracking.
 */
async function runFollowerSync() {
    console.log('🚀 Starting Twitter follower sync...');
    const service = new TwitterFollowerService();

    try {
        const result = await service.updateAllFollowerCounts();

        console.log('✅ Follower sync completed');
        console.log(`   Success: ${result.success} DAOs updated`);
        console.log(`   Errors: ${result.errors} DAOs failed`);

        if (result.success > 0) {
            // Log top DAOs for monitoring
            const topDaos = await service.getTopDAOsByFollowers(3);
            console.log(
                `🏆 Top DAOs: ${topDaos.map((d) => `${d.name} (${d.followerCount?.toLocaleString()})`).join(', ')}`
            );

            // Log recent growth
            try {
                const topDaily = await service.getTopGrowingDAOsOverDays(1, 3);
                const topWeekly = await service.getTopGrowingDAOsOverDays(7, 3);

                if (topDaily.length > 0) {
                    const dailyGrowthStr = topDaily
                        .filter((g) => g.growthAmount !== 0)
                        .map((g) => `${g.daoName} (${g.growthAmount > 0 ? '+' : ''}${g.growthAmount})`)
                        .join(', ');
                    if (dailyGrowthStr) {
                        console.log(`📈 Daily growth: ${dailyGrowthStr}`);
                    }
                }

                if (topWeekly.length > 0) {
                    const weeklyGrowthStr = topWeekly
                        .filter((g) => g.growthAmount !== 0)
                        .map((g) => `${g.daoName} (${g.growthAmount > 0 ? '+' : ''}${g.growthAmount})`)
                        .join(', ');
                    if (weeklyGrowthStr) {
                        console.log(`📊 Weekly growth: ${weeklyGrowthStr}`);
                    }
                }
            } catch (growthError) {
                console.warn('⚠️ Could not fetch growth metrics for logging:', growthError);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Follower sync failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.main) {
    runFollowerSync();
}

export { runFollowerSync };
