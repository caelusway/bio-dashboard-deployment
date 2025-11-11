/**
 * Check Website Data
 *
 * Quick script to check what data exists for website_bio and website_app
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSources, growthSnapshots } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const DB_URL = process.env.SUPABASE_DB_URL!;

if (!DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const connection = postgres(DB_URL);
const db = drizzle(connection);

async function checkWebsiteData() {
  console.log('🔍 Checking website data...\n');

  // Get both website sources
  const sources = await db
    .select()
    .from(growthSources)
    .where(eq(growthSources.platform, 'website'));

  console.log(`Found ${sources.length} website sources:\n`);

  for (const source of sources) {
    console.log(`📊 ${source.displayName} (${source.slug})`);
    console.log(`   ID: ${source.id}`);

    // Get snapshots for this source
    const snapshots = await db
      .select()
      .from(growthSnapshots)
      .where(eq(growthSnapshots.sourceId, source.id))
      .orderBy(growthSnapshots.snapshotAt);

    console.log(`   Total snapshots: ${snapshots.length}`);

    if (snapshots.length > 0) {
      console.log(`   Latest snapshot: ${snapshots[snapshots.length - 1].snapshotAt}`);
      console.log(`   Value: ${snapshots[snapshots.length - 1].value}`);
      console.log(`   Metric: ${snapshots[snapshots.length - 1].metricType}`);
    }

    console.log('');
  }

  await connection.end();
}

checkWebsiteData().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
