/**
 * Apply Enum Migration
 * Adds new enum values for website platform and metrics
 */

import postgres from 'postgres';

const NEW_DB_URL = process.env.SUPABASE_DB_URL!;

if (!NEW_DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const sql = postgres(NEW_DB_URL);

async function main() {
  console.log('🔧 Applying enum migrations...\n');

  try {
    // Add 'website' to growth_platform enum
    console.log('Adding "website" to growth_platform enum...');
    await sql.unsafe(`ALTER TYPE growth_platform ADD VALUE IF NOT EXISTS 'website'`);
    console.log('✓ Added website platform');

    // Add website metrics
    console.log('\nAdding website metrics to growth_metric enum...');
    await sql.unsafe(`ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'website_page_views'`);
    await sql.unsafe(`ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'website_active_users'`);
    await sql.unsafe(`ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'website_new_users'`);
    console.log('✓ Added website metrics');

    // Add twitter and youtube metrics
    console.log('\nAdding additional metrics...');
    await sql.unsafe(`ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'twitter_impression_count'`);
    await sql.unsafe(`ALTER TYPE growth_metric ADD VALUE IF NOT EXISTS 'youtube_view_count'`);
    console.log('✓ Added additional metrics');

    console.log('\n✅ Enum migrations applied successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
