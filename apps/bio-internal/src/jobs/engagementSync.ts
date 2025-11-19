import { EngagementSyncService } from '../services/twitter';

/**
 * Engagement Sync Job
 *
 * Fetches new tweets and updates engagement metrics (likes, retweets, replies, views)
 * for recent tweets across all DAOs.
 */
async function runEngagementSync() {
    console.log('🚀 Starting Twitter engagement sync...');

    const service = new EngagementSyncService(undefined, {
        daysToLookBack: 5, // Update engagement for tweets from last 5 days
        syncIntervalHours: 2, // Not used in manual runs
        maxRequestsPerBatch: 5, // Conservative batch size for rate limiting
    });

    try {
        const stats = await service.runEngagementSync();

        console.log('✅ Engagement sync completed');
        console.log(`   Tweets processed: ${stats.totalTweetsProcessed}`);
        console.log(`   Tweets updated: ${stats.tweetsUpdated}`);
        console.log(`   New tweets added: ${stats.tweetsAdded}`);
        console.log(`   API requests used: ${stats.apiRequestsUsed}`);
        console.log(`   Duration: ${(stats.syncDuration / 1000).toFixed(2)}s`);

        if (stats.errors.length > 0) {
            console.warn(`⚠️ ${stats.errors.length} errors occurred during sync`);
            stats.errors.forEach((err, idx) => {
                console.warn(`   ${idx + 1}. ${err}`);
            });
        }

        process.exit(stats.errors.length > 0 ? 1 : 0);
    } catch (error) {
        console.error('❌ Engagement sync failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.main) {
    runEngagementSync();
}

export { runEngagementSync };
