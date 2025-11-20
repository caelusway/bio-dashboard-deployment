import { db } from '../db/client';
import { apiKeys } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * Generate a new API key
 * @param name - Descriptive name for the API key
 * @param createdBy - User ID who created the key
 * @param expiresInDays - Optional expiration in days
 * @returns Object containing the full key (only shown once) and the database record
 */
export async function generateApiKey(
  name: string,
  createdBy: string,
  expiresInDays?: number
) {
  // Generate key: bio_live_<32 random base64url chars>
  const keySecret = randomBytes(32).toString('base64url');
  const fullKey = `bio_live_${keySecret}`;
  const keyPrefix = fullKey.substring(0, 16); // Store prefix for display (bio_live_XXXXXX)
  
  // Hash the full key for secure storage
  const encoder = new TextEncoder();
  const data = encoder.encode(fullKey);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Calculate expiration date if provided
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;
  
  // Insert into database
  const [newKey] = await db
    .insert(apiKeys)
    .values({
      name,
      keyHash,
      keyPrefix,
      createdBy,
      expiresAt,
      isActive: true,
      metadata: {},
    })
    .returning();
  
  console.log(`[apiKeyService] Generated new API key: ${name} (${keyPrefix}...)`);
  
  return {
    key: fullKey, // Full key - only shown once!
    record: newKey,
  };
}

/**
 * Revoke an API key (soft delete by setting isActive to false)
 * @param keyId - UUID of the API key to revoke
 */
export async function revokeApiKey(keyId: string) {
  const [revokedKey] = await db
    .update(apiKeys)
    .set({ 
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, keyId))
    .returning();
  
  if (revokedKey) {
    console.log(`[apiKeyService] Revoked API key: ${revokedKey.name} (${revokedKey.keyPrefix}...)`);
  }
  
  return revokedKey;
}

/**
 * List all API keys (optionally filtered by user)
 * @param userId - Optional user ID to filter keys
 * @returns Array of API key records (without the actual key)
 */
export async function listApiKeys(userId?: string) {
  const query = db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdBy: apiKeys.createdBy,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      isActive: apiKeys.isActive,
      metadata: apiKeys.metadata,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));
  
  if (userId) {
    return await query.where(eq(apiKeys.createdBy, userId));
  }
  
  return await query;
}

/**
 * Get a specific API key by ID
 * @param keyId - UUID of the API key
 * @returns API key record or null
 */
export async function getApiKeyById(keyId: string) {
  const [key] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdBy: apiKeys.createdBy,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      isActive: apiKeys.isActive,
      metadata: apiKeys.metadata,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);
  
  return key || null;
}

/**
 * Delete an API key permanently (hard delete)
 * @param keyId - UUID of the API key to delete
 */
export async function deleteApiKey(keyId: string) {
  const [deletedKey] = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .returning();
  
  if (deletedKey) {
    console.log(`[apiKeyService] Deleted API key: ${deletedKey.name} (${deletedKey.keyPrefix}...)`);
  }
  
  return deletedKey;
}

