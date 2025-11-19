#!/usr/bin/env bun
import { db } from '../src/db/client';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const USER_ID = '9be69369-a69f-4fde-a02f-268c9dbafc01'; // From the login response
const ADMIN_EMAIL = 'emre@bio.xyz';

console.log('🔧 Fixing admin user...\n');

try {
  // Check if user exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, USER_ID))
    .limit(1);

  if (existingUser) {
    console.log('✅ Found user:', existingUser.email);
    console.log('   Current role:', existingUser.role);

    if (existingUser.role !== 'admin') {
      console.log('\n🔄 Updating to admin...');
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, USER_ID));
      console.log('✅ Role updated to admin!');
    } else {
      console.log('✅ Already admin!');
    }
  } else {
    console.log('❌ User not found in database, creating...');
    await db.insert(users).values({
      id: USER_ID,
      email: ADMIN_EMAIL,
      role: 'admin',
      fullName: 'Emre',
    });
    console.log('✅ User created with admin role!');
  }

  console.log('\n✅ Done! You can now login as admin.\n');
} catch (error: any) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

process.exit(0);
