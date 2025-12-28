/**
 * Redis caching layer for CT Price calculations
 * 
 * Reduces calculation overhead and improves response time
 * by caching results for 24 hours.
 */

import { Redis } from '@upstash/redis';
import type { CTPriceResult } from './types';

// Initialize Redis client (only if credentials exist)
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[CT Price Cache] Redis credentials not configured');
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

/**
 * Generate cache key for CT Price
 * 
 * @param card_id - Card ID
 * @param grade - Grade type
 * @param language - Language code
 * @returns Cache key
 */
function getCacheKey(
  card_id: number,
  grade: string,
  language: string | null
): string {
  return `ct_price:${card_id}:${grade}:${language || 'any'}`;
}

/**
 * Get cached CT Price
 * 
 * @param card_id - Card ID
 * @param grade - Grade type
 * @param language - Language code
 * @returns Cached price result or null
 */
export async function getCachedPrice(
  card_id: number,
  grade: string,
  language: string | null
): Promise<CTPriceResult | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const key = getCacheKey(card_id, grade, language);
    const cached = await client.get<string>(key);

    if (!cached) return null;

    const result = JSON.parse(cached as string) as CTPriceResult;

    // Parse date strings back to Date objects
    if (result.last_sale_date) {
      result.last_sale_date = new Date(result.last_sale_date);
    }
    result.calculation_date = new Date(result.calculation_date);

    console.log(`[CT Price Cache] Hit: ${key}`);
    return result;
  } catch (error) {
    console.error('[CT Price Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Cache CT Price result
 * 
 * @param card_id - Card ID
 * @param grade - Grade type
 * @param language - Language code
 * @param result - Price result to cache
 */
export async function cachePrice(
  card_id: number,
  grade: string,
  language: string | null,
  result: CTPriceResult
): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;

    const key = getCacheKey(card_id, grade, language);
    const ttl = 24 * 60 * 60; // 24 hours in seconds

    await client.set(key, JSON.stringify(result), { ex: ttl });

    console.log(`[CT Price Cache] Cached: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('[CT Price Cache] Error writing cache:', error);
  }
}

/**
 * Invalidate cache for specific card
 * 
 * Clears all cached prices for a card across all grades and languages.
 * 
 * @param card_id - Card ID to invalidate
 */
export async function invalidatePriceCache(card_id: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const grades = [
    'raw',
    'psa7',
    'psa8',
    'psa9',
    'psa10',
    'bgs9',
    'bgs9_5',
    'bgs10',
    'cgc9_5',
    'cgc10',
  ];
  const languages = ['jp', 'en', 'cn', null];

  const deletePromises = [];

  for (const grade of grades) {
    for (const language of languages) {
      const key = getCacheKey(card_id, grade, language);
      deletePromises.push(
        client.del(key).catch((err) => {
          console.error(`[CT Price Cache] Error deleting ${key}:`, err);
        })
      );
    }
  }

  await Promise.all(deletePromises);

  console.log(`[CT Price Cache] Invalidated all prices for card ${card_id}`);
}

/**
 * Invalidate cache for specific grade
 * 
 * @param card_id - Card ID
 * @param grade - Grade to invalidate
 */
export async function invalidateGradeCache(
  card_id: number,
  grade: string
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const languages = ['jp', 'en', 'cn', null];

  for (const language of languages) {
    const key = getCacheKey(card_id, grade, language);
    try {
      await client.del(key);
    } catch (error) {
      console.error(`[CT Price Cache] Error deleting ${key}:`, error);
    }
  }

  console.log(
    `[CT Price Cache] Invalidated ${grade} prices for card ${card_id}`
  );
}

/**
 * Get cache statistics
 * 
 * @returns Cache stats (keys, memory usage, etc.)
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  priceKeys: number;
}> {
  try {
    const client = getRedisClient();
    if (!client) {
      return { totalKeys: 0, priceKeys: 0 };
    }

    // Note: This is a simple implementation
    // In production, you might want to use Redis SCAN for better performance
    const keys = await client.keys('ct_price:*');
    const priceKeys = Array.isArray(keys) ? keys.length : 0;

    return {
      totalKeys: priceKeys,
      priceKeys,
    };
  } catch (error) {
    console.error('[CT Price Cache] Error getting stats:', error);
    return { totalKeys: 0, priceKeys: 0 };
  }
}
