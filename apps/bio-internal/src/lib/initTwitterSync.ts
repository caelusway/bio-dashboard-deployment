import { EngagementSyncService } from '../services/twitter';

/**
 * Initialize and start automatic Twitter sync services
 */
export function initializeTwitterSync() {
    console.log('🐦 Initializing Twitter sync services...');

    // Start engagement sync with automatic intervals
    const engagementService = new EngagementSyncService(undefined, {
        daysToLookBack: 5,
        syncIntervalHours: 2, // Run every 2 hours
        maxRequestsPerBatch: 5,
    });

    engagementService.startAutomaticSync();

    console.log('✅ Twitter sync services initialized');
    console.log('   - Engagement sync: Every 2 hours');
    console.log('   - Follower sync: Run manually with `bun run sync:followers`');
}
