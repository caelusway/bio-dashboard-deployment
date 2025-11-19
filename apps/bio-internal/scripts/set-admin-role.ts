#!/usr/bin/env bun
import { supabase } from '../src/lib/supabase';

const ADMIN_EMAIL = 'emre@bio.xyz';

console.log('🔧 Setting admin role in Supabase user metadata...\n');

try {
  // Get all users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    process.exit(1);
  }

  const adminUser = users?.find(u => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    console.error('❌ User not found:', ADMIN_EMAIL);
    process.exit(1);
  }

  console.log('✅ Found user:', adminUser.email);
  console.log('   Current metadata:', adminUser.user_metadata);

  // Update user metadata to set role
  const { data, error } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    {
      user_metadata: {
        ...adminUser.user_metadata,
        role: 'admin',
      }
    }
  );

  if (error) {
    console.error('❌ Error updating user:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Admin role set successfully!');
  console.log('   User:', ADMIN_EMAIL);
  console.log('   Role: admin');
  console.log('\nYou can now login and access admin features!\n');

} catch (error: any) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

process.exit(0);
