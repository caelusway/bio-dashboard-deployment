#!/usr/bin/env bun
import { db } from '../src/db/client';
import { users, invites } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

console.log('🔍 Checking database setup...\n');

try {
  // Try to query the users table directly
  console.log('📊 Checking if tables exist...');

  let tablesExist = true;
  try {
    await db.select().from(users).limit(1);
    console.log('  ✅ users table exists');
  } catch (e: any) {
    console.log('  ❌ users table NOT found');
    tablesExist = false;
  }

  try {
    await db.select().from(invites).limit(1);
    console.log('  ✅ invites table exists');
  } catch (e: any) {
    console.log('  ❌ invites table NOT found');
    tablesExist = false;
  }

  if (!tablesExist) {
    console.log('\n❌ ERROR: Tables not found!');
    console.log('\nYou need to run the migration first:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the migration file: apps/bio-internal/drizzle/0007_add_auth_and_invites.sql');
    process.exit(1);
  }

  // Check for admin user in database
  console.log('\n👤 Checking for admin user in database...');
  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'emre@bio.xyz'))
    .limit(1);

  if (adminUser) {
    console.log('✅ Admin user exists in database');
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Name:', adminUser.fullName || 'Not set');
  } else {
    console.log('❌ Admin user NOT found in database');
    console.log('\nYou need to:');
    console.log('1. Create user in Supabase Auth Dashboard');
    console.log('2. Add user to database with SQL:');
    console.log(`   INSERT INTO users (id, email, role, full_name)`);
    console.log(`   VALUES ('user-id-from-supabase', 'emre@bio.xyz', 'admin', 'Emre');`);
  }

  console.log('\n📧 Checking invites...');
  const allInvites = await db.select().from(invites);
  console.log('Total invites:', allInvites.length);

  console.log('\n✅ Setup check complete!');

} catch (error: any) {
  console.error('\n❌ Error checking setup:', error.message);
  process.exit(1);
}

process.exit(0);
