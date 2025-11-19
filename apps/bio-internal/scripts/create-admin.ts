#!/usr/bin/env bun
/**
 * Creates admin user in both Supabase Auth and database
 * Run with: bun run scripts/create-admin.ts
 */
import { supabase } from '../src/lib/supabase';
import { db } from '../src/db/client';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'emre@bio.xyz';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

console.log('🔧 Creating admin user...\n');

if (ADMIN_PASSWORD === 'ChangeMe123!') {
  console.log('⚠️  Using default password. Set ADMIN_PASSWORD env var for custom password.\n');
}

try {
  // Step 1: Create user in Supabase Auth
  console.log('1️⃣  Creating user in Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // Auto-confirm
    user_metadata: {
      full_name: 'Emre',
    },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('   ℹ️  User already exists in Supabase Auth');

      // Get existing user
      const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.error('   ❌ Error listing users:', listError.message);
        process.exit(1);
      }

      const existingUser = existingUsers?.find(u => u.email === ADMIN_EMAIL);

      if (!existingUser) {
        console.error('   ❌ User exists but could not retrieve ID');
        process.exit(1);
      }

      console.log('   ✅ Found existing user:', existingUser.id);

      // Step 2: Ensure user exists in database
      console.log('\n2️⃣  Checking database...');
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, ADMIN_EMAIL))
        .limit(1);

      if (dbUser) {
        console.log('   ✅ User already exists in database with role:', dbUser.role);

        if (dbUser.role !== 'admin') {
          console.log('   🔄 Updating role to admin...');
          await db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.email, ADMIN_EMAIL));
          console.log('   ✅ Role updated');
        }
      } else {
        console.log('   📝 Adding user to database...');
        await db.insert(users).values({
          id: existingUser.id,
          email: ADMIN_EMAIL,
          role: 'admin',
          fullName: 'Emre',
          lastLoginAt: new Date(),
        });
        console.log('   ✅ User added to database');
      }
    } else {
      console.error('   ❌ Error creating user:', authError.message);
      process.exit(1);
    }
  } else if (authData.user) {
    console.log('   ✅ User created in Supabase Auth');
    console.log('   User ID:', authData.user.id);

    // Step 2: Create user in database
    console.log('\n2️⃣  Adding user to database...');

    // Check if user already exists
    const [existingDbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    if (existingDbUser) {
      console.log('   ℹ️  User already exists in database');

      if (existingDbUser.role !== 'admin') {
        console.log('   🔄 Updating role to admin...');
        await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.email, ADMIN_EMAIL));
        console.log('   ✅ Role updated');
      }
    } else {
      await db.insert(users).values({
        id: authData.user.id,
        email: ADMIN_EMAIL,
        role: 'admin',
        fullName: 'Emre',
        lastLoginAt: new Date(),
      });
      console.log('   ✅ User added to database');
    }
  }

  console.log('\n✅ Admin user setup complete!\n');
  console.log('📧 Email:', ADMIN_EMAIL);
  console.log('🔑 Password:', ADMIN_PASSWORD);
  console.log('\nYou can now login at: http://localhost:3000/login\n');

} catch (error: any) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

process.exit(0);
