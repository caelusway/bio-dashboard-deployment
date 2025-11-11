import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { invites, users } from '../db/schema';
import { adminOnly } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const ADMIN_EMAIL = 'emre@bio.xyz';

// Generate secure random invite token
const generateInviteToken = (): string => {
  return randomBytes(32).toString('hex');
};

// Calculate expiry date (7 days from now)
const getExpiryDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
};

export const inviteRoutes = new Elysia({ prefix: '/invites' })
  // Admin-only routes
  .use(adminOnly())

  // List all invites (admin only)
  .get('/', async () => {
    const allInvites = await db
      .select({
        id: invites.id,
        email: invites.email,
        invitedBy: invites.invitedBy,
        status: invites.status,
        expiresAt: invites.expiresAt,
        acceptedAt: invites.acceptedAt,
        createdAt: invites.createdAt,
      })
      .from(invites)
      .orderBy(invites.createdAt);

    return { invites: allInvites };
  })

  // Create new invite (admin only)
  .post(
    '/',
    async ({ body, user, set }) => {
      const { email } = body;

      // Check if email already invited
      const [existing] = await db
        .select()
        .from(invites)
        .where(eq(invites.email, email))
        .limit(1);

      if (existing && existing.status === 'pending') {
        set.status = 400;
        return { error: 'Email already has a pending invite' };
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        set.status = 400;
        return { error: 'User already exists' };
      }

      // Create invite
      const [invite] = await db
        .insert(invites)
        .values({
          email,
          invitedBy: user.email,
          inviteToken: generateInviteToken(),
          expiresAt: getExpiryDate(),
          status: 'pending',
        })
        .returning();

      return {
        invite: {
          id: invite.id,
          email: invite.email,
          inviteToken: invite.inviteToken,
          expiresAt: invite.expiresAt,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
    },
  )

  // Revoke invite (admin only)
  .delete(
    '/:id',
    async ({ params, set }) => {
      const [invite] = await db
        .update(invites)
        .set({ status: 'revoked', updatedAt: new Date() })
        .where(and(eq(invites.id, params.id), eq(invites.status, 'pending')))
        .returning();

      if (!invite) {
        set.status = 404;
        return { error: 'Invite not found or already used' };
      }

      return { message: 'Invite revoked successfully' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Resend invite (admin only) - generates new token
  .post(
    '/:id/resend',
    async ({ params, set }) => {
      const [invite] = await db
        .update(invites)
        .set({
          inviteToken: generateInviteToken(),
          expiresAt: getExpiryDate(),
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(invites.id, params.id))
        .returning();

      if (!invite) {
        set.status = 404;
        return { error: 'Invite not found' };
      }

      return {
        invite: {
          id: invite.id,
          email: invite.email,
          inviteToken: invite.inviteToken,
          expiresAt: invite.expiresAt,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
