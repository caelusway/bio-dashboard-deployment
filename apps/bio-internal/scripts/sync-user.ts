#!/usr/bin/env bun
import { db } from '../src/db/client';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const CORRECT_USER_ID = '9be69369-a69f-4fde-a02f-268c9dbafc01'; // From Supabase Auth
const ADMIN_EMAIL = 'emre@bio.xyz';

console.log('🔧 Syncing user ID...\n');

try {
  // Find user by email
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existingUser) {
    console.log('✅ Found user in database:');
    console.log('   Current ID:', existingUser.id);
    console.log('   Email:', existingUser.email);
    console.log('   Role:', existingUser.role);

    if (existingUser.id !== CORRECT_USER_ID) {
      console.log('\n⚠️  ID mismatch! Fixing...');
      console.log('   Supabase Auth ID:', CORRECT_USER_ID);
      console.log('   Database ID:', existingUser.id);

      // Delete old user
      await db.delete(users).where(eq(users.email, ADMIN_EMAIL));
      console.log('   ✅ Deleted old user');

      // Insert with correct ID
      await db.insert(users).values({
        id: CORRECT_USER_ID,
        email: ADMIN_EMAIL,
        role: 'admin',
        fullName: existingUser.fullName || 'Emre',
      });
      console.log('   ✅ Created user with correct ID');
    } else {
      console.log('\n✅ IDs match!');

      if (existingUser.role !== 'admin') {
        console.log('   🔄 Updating role to admin...');
        await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, CORRECT_USER_ID));
        console.log('   ✅ Role updated');
      }
    }
  } else {
    console.log('❌ User not found by email, creating new...');
    await db.insert(users).values({
      id: CORRECT_USER_ID,
      email: ADMIN_EMAIL,
      role: 'admin',
      fullName: 'Emre',
    });
    console.log('✅ User created!');
  }

  console.log('\n✅ Done! Try logging in now.\n');
} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}

process.exit(0);
