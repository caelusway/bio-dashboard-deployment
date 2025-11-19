import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { invites, users } from '../db/schema';
import { supabase } from '../lib/supabase';
import { eq, and } from 'drizzle-orm';
import { auth } from '../middleware/auth';

const ADMIN_EMAIL = 'emre@bio.xyz';

export const authRoutes = new Elysia({ prefix: '/auth' })
  // Verify invite token (public endpoint)
  .get(
    '/verify-invite/:token',
    async ({ params, set }) => {
      const [invite] = await db
        .select({
          id: invites.id,
          email: invites.email,
          status: invites.status,
          expiresAt: invites.expiresAt,
        })
        .from(invites)
        .where(eq(invites.inviteToken, params.token))
        .limit(1);

      if (!invite) {
        set.status = 404;
        return { error: 'Invalid invite token' };
      }

      if (invite.status !== 'pending') {
        set.status = 400;
        return { error: 'Invite already used or expired' };
      }

      if (new Date() > new Date(invite.expiresAt)) {
        // Mark as expired
        await db
          .update(invites)
          .set({ status: 'expired' })
          .where(eq(invites.id, invite.id));

        set.status = 400;
        return { error: 'Invite has expired' };
      }

      return {
        valid: true,
        email: invite.email,
      };
    },
    {
      params: t.Object({
        token: t.String(),
      }),
    },
  )

  // Sign up with invite token (public endpoint)
  .post(
    '/signup',
    async ({ body, set }) => {
      const { email, password, fullName, inviteToken } = body;

      // Verify invite
      const [invite] = await db
        .select()
        .from(invites)
        .where(and(eq(invites.inviteToken, inviteToken), eq(invites.email, email)))
        .limit(1);

      if (!invite) {
        set.status = 400;
        return { error: 'Invalid invite or email mismatch' };
      }

      if (invite.status !== 'pending') {
        set.status = 400;
        return { error: 'Invite already used or revoked' };
      }

      if (new Date() > new Date(invite.expiresAt)) {
        await db
          .update(invites)
          .set({ status: 'expired' })
          .where(eq(invites.id, invite.id));

        set.status = 400;
        return { error: 'Invite has expired' };
      }

      // Determine role: admin for emre@bio.xyz, member for others
      const role = email === ADMIN_EMAIL ? 'admin' : 'member';

      // Create Supabase auth user with role in metadata
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for invited users
        user_metadata: {
          full_name: fullName,
          role, // Store role in metadata
        },
      });

      if (authError || !authData.user) {
        console.error('Supabase signup error:', authError);
        set.status = 400;
        return { error: authError?.message || 'Failed to create account' };
      }

      // Mark invite as accepted
      await db
        .update(invites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          userId: authData.user.id,
        })
        .where(eq(invites.id, invite.id));

      return {
        message: 'Account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        fullName: t.Optional(t.String()),
        inviteToken: t.String(),
      }),
    },
  )

  // Login (public endpoint)
  .post(
    '/login',
    async ({ body, set }) => {
      const { email, password } = body;

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        set.status = 401;
        return { error: 'Invalid email or password' };
      }

      // Update last login time
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, data.user.id));

      // Get user role
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, data.user.id))
        .limit(1);

      return {
        session: data.session,
        user: user || {
          id: data.user.id,
          email: data.user.email,
          role: 'member',
          fullName: null,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    },
  )

  // Logout (public endpoint)
  .post('/logout', async ({ request }) => {
    const authorization = request.headers.get('authorization');
    const token = authorization?.split(' ')[1];

    if (token) {
      await supabase.auth.admin.signOut(token);
    }

    return { message: 'Logged out successfully' };
  });

// Protected auth routes
export const protectedAuthRoutes = new Elysia({ prefix: '/auth' })
  .use(auth())
  .get('/me', async ({ user }) => {
    console.log('GET /auth/me - user:', user);
    return { user };
  });
