#!/usr/bin/env bun
/**
 * Calculate Month-over-Month Changes for October 2025
 *
 * Compares October 2025 with September 2025 and updates changeAbs and changePct
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSnapshots } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const NEW_DB_URL = process.env.SUPABASE_DB_URL!;

if (!NEW_DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const sql = postgres(NEW_DB_URL);
const db = drizzle(sql);

async function calculateChanges() {
  console.log('🔢 Calculating month-over-month changes for October 2025...\n');

  const septemberDate = new Date(2025, 8, 1); // September 2025 (month 8, 0-indexed)
  const octoberDate = new Date(2025, 9, 1); // October 2025 (month 9, 0-indexed)

  // Get all October snapshots
  const octoberSnapshots = await db
    .select()
    .from(growthSnapshots)
    .where(eq(growthSnapshots.snapshotAt, octoberDate));

  console.log(`Found ${octoberSnapshots.length} October 2025 snapshots\n`);

  if (octoberSnapshots.length === 0) {
    console.log('⚠️  No October 2025 snapshots found. Run import-october-2025.ts first.');
    return;
  }

  let updatedCount = 0;

  for (const octoberSnapshot of octoberSnapshots) {
    // Find corresponding September snapshot
    const septemberSnapshots = await db
      .select()
      .from(growthSnapshots)
      .where(
        and(
          eq(growthSnapshots.sourceId, octoberSnapshot.sourceId),
          eq(growthSnapshots.metricType, octoberSnapshot.metricType),
          eq(growthSnapshots.snapshotWindow, octoberSnapshot.snapshotWindow),
          eq(growthSnapshots.snapshotAt, septemberDate)
        )
      );

    if (septemberSnapshots.length === 0) {
      console.log(`⚠️  No September data for ${octoberSnapshot.metricType} - skipping`);
      continue;
    }

    const septemberSnapshot = septemberSnapshots[0];

    // Calculate changes
    const octoberValue = parseFloat(octoberSnapshot.value);
    const septemberValue = parseFloat(septemberSnapshot.value);

    const changeAbs = octoberValue - septemberValue;
    const changePct = septemberValue !== 0
      ? ((changeAbs / septemberValue) * 100)
      : 0;

    // Update October snapshot with changes
    await db
      .update(growthSnapshots)
      .set({
        changeAbs: changeAbs.toString(),
        changePct: changePct.toFixed(2),
        previousSnapshotAt: septemberDate,
      })
      .where(eq(growthSnapshots.id, octoberSnapshot.id));

    const changeSign = changeAbs >= 0 ? '+' : '';
    console.log(`✓ ${octoberSnapshot.metricType}: ${septemberValue.toLocaleString()} → ${octoberValue.toLocaleString()} (${changeSign}${changeAbs.toLocaleString()}, ${changeSign}${changePct.toFixed(2)}%)`);

    updatedCount++;
  }

  console.log(`\n✅ Updated ${updatedCount} snapshots with month-over-month changes!`);
}

async function main() {
  console.log('🚀 Starting October 2025 Change Calculation...\n');

  try {
    await calculateChanges();
  } catch (error) {
    console.error('\n❌ Calculation failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
