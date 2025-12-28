import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { ebayLogger } from './logger';

// Initialize Redis client with Upstash
// Falls back to undefined if env vars not set (graceful degradation)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  } else {
    ebayLogger.warn('Redis not configured - caching disabled', {
      missingEnvVars: ['UPSTASH_REDIS_URL', 'UPSTASH_REDIS_TOKEN']
    });
  }
} catch (error) {
  ebayLogger.error('Failed to initialize Redis', {
    error: error instanceof Error ? error.message : String(error)
  });
}

const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
const CACHE_PREFIX = 'ebay:search:';

/**
 * Generate cache key from search params
 * 
 * Uses SHA256 hash of sorted params for consistent key generation
 * 
 * @param params - Search parameters object
 * @returns Cache key string
 */
export function getCacheKey(params: Record<string, any>): string {
  // Sort keys for consistent hashing
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sorted))
    .digest('hex')
    .slice(0, 16); // Use first 16 chars for brevity

  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get cached eBay response
 * 
 * @param cacheKey - Cache key to retrieve
 * @returns Cached data or null if not found/error
 */
export async function getCachedResponse<T>(
  cacheKey: string
): Promise<T | null> {
  if (!redis) {
    return null; // Caching disabled
  }

  try {
    const cached = await redis.get<T>(cacheKey);
    
    if (cached) {
      ebayLogger.debug('Cache HIT', { cacheKey });
      return cached;
    }
    
    ebayLogger.debug('Cache MISS', { cacheKey });
    return null;
  } catch (error) {
    ebayLogger.error('Error reading cache', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error)
    });
    return null; // Fail gracefully - don't block API calls
  }
}

/**
 * Cache eBay response
 * 
 * @param cacheKey - Cache key to store under
 * @param data - Data to cache
 */
export async function setCachedResponse<T>(
  cacheKey: string,
  data: T
): Promise<void> {
  if (!redis) {
    return; // Caching disabled
  }

  try {
    await redis.set(cacheKey, data, { ex: CACHE_TTL });
    ebayLogger.debug('Cache SET', { cacheKey, ttl: CACHE_TTL });
  } catch (error) {
    ebayLogger.error('Error writing cache', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't throw - caching is optional and shouldn't break API calls
  }
}

/**
 * Invalidate cache for a specific query
 * 
 * @param cacheKey - Cache key to invalidate
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    await redis.del(cacheKey);
    ebayLogger.info('Cache invalidated', { cacheKey });
  } catch (error) {
    ebayLogger.error('Error invalidating cache', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Invalidate all eBay caches
 * 
 * WARNING: Use sparingly! This deletes ALL eBay search caches.
 * Useful for debugging or when eBay data structure changes.
 */
export async function invalidateAllCaches(): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      ebayLogger.info('All caches invalidated', { keysDeleted: keys.length });
    } else {
      ebayLogger.info('No caches to invalidate', { keysDeleted: 0 });
    }
  } catch (error) {
    ebayLogger.error('Error invalidating all caches', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get cache statistics (for monitoring)
 */
export async function getCacheStats(): Promise<{
  configured: boolean;
  keyCount: number;
}> {
  if (!redis) {
    return { configured: false, keyCount: 0 };
  }

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    return {
      configured: true,
      keyCount: keys.length,
    };
  } catch (error) {
    ebayLogger.error('Error getting cache stats', {
      error: error instanceof Error ? error.message : String(error)
    });
    return { configured: true, keyCount: -1 };
  }
}
