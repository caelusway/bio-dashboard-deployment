/**
 * Calculate Changes for Growth Snapshots
 *
 * Calculates changeAbs and changePct for all snapshots based on previous values
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSnapshots } from '../src/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const DB_URL = process.env.SUPABASE_DB_URL!;

if (!DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const connection = postgres(DB_URL);
const db = drizzle(connection);

async function calculateChanges() {
  console.log('📊 Calculating changes for all snapshots...\n');

  // Get all snapshots ordered by time
  const snapshots = await db
    .select()
    .from(growthSnapshots)
    .orderBy(growthSnapshots.sourceId, growthSnapshots.metricType, growthSnapshots.snapshotWindow, growthSnapshots.snapshotAt);

  console.log(`Found ${snapshots.length} snapshots\n`);

  // Group by source + metric + window
  const groups = new Map<string, typeof snapshots>();

  for (const snapshot of snapshots) {
    const key = `${snapshot.sourceId}|${snapshot.metricType}|${snapshot.snapshotWindow}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(snapshot);
  }

  console.log(`Processing ${groups.size} groups...\n`);

  let updated = 0;

  for (const [key, groupSnapshots] of groups) {
    const [sourceId, metricType, window] = key.split('|');
    console.log(`Processing ${key}: ${groupSnapshots.length} snapshots`);

    // Sort by date to ensure correct order
    groupSnapshots.sort((a, b) => {
      const dateA = new Date(a.snapshotAt);
      const dateB = new Date(b.snapshotAt);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate changes for each snapshot (comparing to previous)
    for (let i = 0; i < groupSnapshots.length; i++) {
      const current = groupSnapshots[i];

      if (i === 0) {
        // First snapshot has no previous value
        await db
          .update(growthSnapshots)
          .set({
            changeAbs: null,
            changePct: null,
          })
          .where(eq(growthSnapshots.id, current.id));
        updated++;
      } else {
        const previous = groupSnapshots[i - 1];
        const currentValue = Number(current.value);
        const previousValue = Number(previous.value);

        const changeAbs = currentValue - previousValue;
        const changePct = previousValue !== 0 ? ((changeAbs / previousValue) * 100) : 0;

        await db
          .update(growthSnapshots)
          .set({
            changeAbs: changeAbs.toString(),
            changePct: changePct.toFixed(2),
          })
          .where(eq(growthSnapshots.id, current.id));

        updated++;

        console.log(`  ${new Date(current.snapshotAt).toISOString().split('T')[0]}: ${previousValue} → ${currentValue} (${changeAbs >= 0 ? '+' : ''}${changeAbs}, ${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%)`);
      }
    }
    console.log('');
  }

  console.log(`\n✅ Updated ${updated} snapshots with calculated changes`);

  await connection.end();
}

calculateChanges().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
