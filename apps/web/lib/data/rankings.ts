/**
 * Rankings Data Access Layer
 * Phase 04 - Task 01
 * 
 * Provides server-side data fetching for rankings leaderboards
 * with in-memory caching (5 minute TTL).
 */

import { createClient } from '@/lib/supabase';
import type { 
  RankingCard, 
  RankingsFilters, 
  RankingCardDB,
  RankingCategory 
} from '@/types/rankings';

// In-memory cache (pending Redis in future phase)
interface CacheEntry {
  data: RankingCard[];
  timestamp: number;
}

const rankingsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from filters
 */
function getCacheKey(filters: RankingsFilters): string {
  return JSON.stringify({
    category: filters.category,
    timeframe: filters.timeframe,
    rarity: filters.rarity || null,
    grade: filters.grade || null,
    language: filters.language || null,
  });
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Extract primary image from image_urls column
 * Handles pipe-separated values: "url1|url2|url3" or JSON arrays
 */
function extractPrimaryImage(imageUrls: string | null): string {
  if (!imageUrls) return '/placeholder-card.png';
  
  // Handle pipe-separated: "url1|url2|url3"
  if (imageUrls.includes('|')) {
    const urls = imageUrls.split('|');
    return urls[0].trim() || '/placeholder-card.png';
  }
  
  // Handle JSON array: ["url1", "url2"]
  try {
    const parsed = JSON.parse(imageUrls);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    // Not JSON, return as-is
    return imageUrls;
  }
  
  return imageUrls;
}

/**
 * Transform database response to RankingCard format
 */
function transformDBToRankingCard(dbCards: RankingCardDB[]): RankingCard[] {
  return dbCards.map((card, index) => ({
    rank: index + 1,
    cardId: card.card_id.toString(),
    cardName: card.card_name,
    cardNameJa: card.card_name_ja,
    thumbnailUrl: extractPrimaryImage(card.image_urls),
    currentPrice: Number(card.current_price) || 0,
    priceChange: Number(card.price_change) || 0,
    priceChangePercent: Number(card.price_change_percent) || 0,
    volume: card.volume || 0,
    transactionCount: card.transaction_count || 0,
    rarity: card.rarity,
  }));
}

/**
 * Get RPC function name based on category
 */
function getRPCFunction(category: RankingCategory): string {
  const rpcMap: Record<RankingCategory, string> = {
    gainers: 'get_price_gainers',
    fallers: 'get_price_fallers',
    volume: 'get_volume_leaders',
    popularity: 'get_popularity_rankings',
  };
  return rpcMap[category];
}

/**
 * Fetch rankings from Supabase with caching
 */
export async function getRankings(filters: RankingsFilters): Promise<RankingCard[]> {
  const cacheKey = getCacheKey(filters);

  // Check cache first
  const cachedEntry = rankingsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    console.log('[Rankings Cache] HIT:', cacheKey);
    return cachedEntry.data;
  }

  console.log('[Rankings Cache] MISS:', cacheKey);

  try {
    const supabase = createClient();
    const rpcFunction = getRPCFunction(filters.category);

    // Build RPC parameters
    const params = {
      timeframe_param: filters.timeframe,
      limit_count: 100,
      rarity_filter: filters.rarity || null,
      grade_filter: filters.grade || null,
      language_filter: filters.language || null,
    };

    // Call appropriate RPC function
    const { data, error } = await supabase.rpc(
      rpcFunction as any, // Type cast needed due to dynamic function selection
      params
    );

    if (error) {
      console.error('[Rankings] RPC Error:', error);
      throw new Error(`Failed to fetch rankings: ${error.message}`);
    }

    if (!data) {
      console.warn('[Rankings] No data returned');
      return [];
    }

    // Transform and cache results
    const transformedData = transformDBToRankingCard(data as RankingCardDB[]);
    
    rankingsCache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now(),
    });

    return transformedData;
  } catch (error) {
    console.error('[Rankings] Fetch error:', error);
    
    // Return cached data even if expired as fallback
    if (cachedEntry) {
      console.warn('[Rankings] Using stale cache as fallback');
      return cachedEntry.data;
    }
    
    // Return empty array as last resort
    return [];
  }
}

/**
 * Clear all rankings cache (useful for testing or forced refresh)
 */
export function clearRankingsCache(): void {
  rankingsCache.clear();
  console.log('[Rankings Cache] Cleared');
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getRankingsCacheStats() {
  const entries = Array.from(rankingsCache.entries());
  return {
    size: entries.length,
    entries: entries.map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      isValid: isCacheValid(value),
    })),
  };
}
