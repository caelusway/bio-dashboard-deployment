/**
 * Check DAO Data
 *
 * Script to explore DAO entities and their data
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { daoEntities, daoFollowerSnapshots, twitterPosts } from '../src/db/schema';
import { sql } from 'drizzle-orm';

const DB_URL = process.env.SUPABASE_DB_URL!;

if (!DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const connection = postgres(DB_URL);
const db = drizzle(connection);

async function checkDaoData() {
  console.log('🔍 Checking DAO data...\n');

  // Get all DAOs
  const daos = await db.select().from(daoEntities);

  console.log(`Found ${daos.length} DAOs:\n`);

  for (const dao of daos) {
    console.log(`\n📊 ${dao.name} (@${dao.twitterHandle})`);
    console.log(`   Slug: ${dao.slug}`);
    console.log(`   Current Followers: ${dao.followerCount || 'N/A'}`);
    console.log(`   Last Synced: ${dao.lastSyncedAt || 'Never'}`);

    // Get follower snapshots count
    const snapshotCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(daoFollowerSnapshots)
      .where(sql`${daoFollowerSnapshots.daoId} = ${dao.id}`);

    console.log(`   Follower Snapshots: ${snapshotCount[0]?.count || 0}`);

    // Get posts count
    const postCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(twitterPosts)
      .where(sql`${twitterPosts.daoId} = ${dao.id}`);

    console.log(`   Twitter Posts: ${postCount[0]?.count || 0}`);
  }

  await connection.end();
}

checkDaoData().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
