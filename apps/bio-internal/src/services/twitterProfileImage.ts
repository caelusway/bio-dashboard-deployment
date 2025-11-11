import { db } from '../db/client';
import { daoEntities } from '../db/schema';
import { env } from '../config/env';
import { eq } from 'drizzle-orm';

interface TwitterUser {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
  };
}

/**
 * Fetches a Twitter user's profile information including profile image URL
 * @param username Twitter handle without @ symbol
 * @returns Twitter user data or null if not found
 */
export async function fetchTwitterUserProfile(username: string): Promise<TwitterUser | null> {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=profile_image_url`,
      {
        headers: {
          Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch profile for @${username}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching profile for @${username}:`, error);
    return null;
  }
}

/**
 * Updates a DAO entity's metadata with the Twitter profile image URL
 * @param daoId UUID of the DAO entity
 * @param profileImageUrl URL of the Twitter profile image
 */
export async function updateDaoProfileImage(daoId: string, profileImageUrl: string): Promise<void> {
  await db
    .update(daoEntities)
    .set({
      metadata: {
        profileImageUrl,
      },
      updatedAt: new Date(),
    })
    .where(eq(daoEntities.id, daoId));
}

/**
 * Syncs Twitter profile images for all DAOs
 * @returns Object with success/failure counts
 */
export async function syncAllDaoProfileImages(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ handle: string; error: string }>;
}> {
  const daos = await db.select().from(daoEntities);

  let success = 0;
  let failed = 0;
  const errors: Array<{ handle: string; error: string }> = [];

  for (const dao of daos) {
    try {
      // Remove @ symbol if present
      const handle = dao.twitterHandle.replace('@', '');

      const userData = await fetchTwitterUserProfile(handle);

      if (userData?.data?.profile_image_url) {
        // Twitter returns small images by default, replace with larger version
        const largeImageUrl = userData.data.profile_image_url.replace('_normal', '_400x400');

        await updateDaoProfileImage(dao.id, largeImageUrl);
        console.log(`✓ Updated profile image for ${dao.name} (@${handle})`);
        success++;
      } else {
        console.warn(`✗ No profile image found for ${dao.name} (@${handle})`);
        failed++;
        errors.push({ handle, error: 'Profile not found or no image available' });
      }

      // Rate limiting: Twitter API allows 300 requests per 15 minutes for user lookup
      // Add a small delay to be safe (150ms = ~400 requests per minute)
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (error) {
      console.error(`✗ Error processing ${dao.name}:`, error);
      failed++;
      errors.push({
        handle: dao.twitterHandle,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { success, failed, errors };
}

/**
 * Syncs Twitter profile image for a single DAO by slug
 * @param slug DAO slug identifier
 * @returns Success status and profile image URL
 */
export async function syncDaoProfileImage(slug: string): Promise<{
  success: boolean;
  profileImageUrl?: string;
  error?: string;
}> {
  try {
    const dao = await db.select().from(daoEntities).where(eq(daoEntities.slug, slug)).limit(1);

    if (dao.length === 0) {
      return { success: false, error: 'DAO not found' };
    }

    const handle = dao[0].twitterHandle.replace('@', '');
    const userData = await fetchTwitterUserProfile(handle);

    if (!userData?.data?.profile_image_url) {
      return { success: false, error: 'Profile not found or no image available' };
    }

    const largeImageUrl = userData.data.profile_image_url.replace('_normal', '_400x400');
    await updateDaoProfileImage(dao[0].id, largeImageUrl);

    return { success: true, profileImageUrl: largeImageUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
