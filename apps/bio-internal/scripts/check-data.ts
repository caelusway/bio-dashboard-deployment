#!/usr/bin/env bun
/**
 * Check what data exists in the database for debugging
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSources, growthMetrics, growthSnapshots } from '../src/db/schema';

const sql = postgres(process.env.SUPABASE_DB_URL!);
const db = drizzle(sql);

async function checkData() {
  console.log('\n=== Checking Growth Sources ===');
  const sources = await db.select().from(growthSources);
  console.log(`Found ${sources.length} sources:`);
  sources.forEach(s => console.log(`  - ${s.slug} (${s.platform})`));

  console.log('\n=== Checking Growth Metrics ===');
  const metrics = await db.select().from(growthMetrics);
  console.log(`Found ${metrics.length} metrics:`);
  const metricsBySource = metrics.reduce((acc, m) => {
    acc[m.sourceId] = (acc[m.sourceId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(metricsBySource).forEach(([sourceId, count]) => {
    const source = sources.find(s => s.id === sourceId);
    console.log(`  - ${source?.slug || sourceId}: ${count} metrics`);
  });

  console.log('\n=== Checking Growth Snapshots ===');
  const snapshots = await db.select().from(growthSnapshots);
  console.log(`Found ${snapshots.length} snapshots:`);
  const snapshotsBySource = snapshots.reduce((acc, s) => {
    acc[s.sourceId] = (acc[s.sourceId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(snapshotsBySource).forEach(([sourceId, count]) => {
    const source = sources.find(s => s.id === sourceId);
    console.log(`  - ${source?.slug || sourceId}: ${count} snapshots`);
  });

  // Check telegram specifically
  console.log('\n=== Telegram Data ===');
  const telegramSource = sources.find(s => s.slug === 'telegram');
  if (telegramSource) {
    const telegramMetrics = metrics.filter(m => m.sourceId === telegramSource.id);
    console.log(`Telegram metrics (${telegramMetrics.length}):`);
    telegramMetrics.forEach(m => console.log(`  - ${m.metricType}: ${m.value}`));

    const telegramSnapshots = snapshots.filter(s => s.sourceId === telegramSource.id);
    console.log(`\nTelegram snapshots (${telegramSnapshots.length}):`);
    telegramSnapshots.forEach(s => console.log(`  - window: ${s.snapshotWindow} @ ${s.snapshotAt}: ${s.value}`));
  } else {
    console.log('Telegram source not found!');
  }

  await sql.end();
}

checkData().catch(console.error);
