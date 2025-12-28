/**
 * Price History Queries
 * 
 * Query helpers for the price_history table.
 * Powers price charts on Search and Card Detail pages.
 */

import type { Database } from '../../../../apps/web/lib/database.types.generated';

export type PriceHistoryRow = Database['public']['Tables']['price_history']['Row'];

export interface PriceHistoryQuery {
  card_id: number;
  days?: number;
  data_source?: string;
}

export interface PriceHistoryResult {
  date: string;
  price_raw: number | null;
  price_psa9: number | null;
  price_psa10: number | null;
  volume: number;
}

/**
 * Build query for fetching price history
 * 
 * @param params - Query parameters
 * @returns Query configuration object
 * 
 * @example
 * ```ts
 * const query = buildPriceHistoryQuery({ card_id: 12, days: 90 });
 * const { data } = await supabase
 *   .from('price_history')
 *   .select(query.select)
 *   .eq('card_id', query.card_id)
 *   .order('date', { ascending: false })
 *   .limit(query.limit);
 * ```
 */
export function buildPriceHistoryQuery(params: PriceHistoryQuery) {
  const { card_id, days = 90, data_source = 'ebay' } = params;
  
  return {
    select: 'date, price_raw, price_psa9, price_psa10, volume',
    card_id,
    data_source,
    limit: days,
  };
}

/**
 * Get latest price for a card
 * 
 * @param card_id - Card ID to fetch price for
 * @returns Query configuration for latest price
 * 
 * @example
 * ```ts
 * const query = buildLatestPriceQuery(12);
 * const { data } = await supabase
 *   .from('price_history')
 *   .select(query.select)
 *   .eq('card_id', query.card_id)
 *   .order('date', { ascending: false })
 *   .limit(1)
 *   .single();
 * ```
 */
export function buildLatestPriceQuery(card_id: number) {
  return {
    select: 'date, price_raw, price_psa9, price_psa10, volume, data_source',
    card_id,
  };
}

/**
 * Get price history for multiple cards
 * 
 * @param card_ids - Array of card IDs
 * @param days - Number of days to fetch
 * @returns Query configuration
 * 
 * @example
 * ```ts
 * const query = buildMultiCardPriceQuery([12, 34, 56], 30);
 * const { data } = await supabase
 *   .from('price_history')
 *   .select(query.select)
 *   .in('card_id', query.card_ids)
 *   .order('date', { ascending: false })
 *   .limit(query.limit);
 * ```
 */
export function buildMultiCardPriceQuery(card_ids: number[], days: number = 30) {
  return {
    select: 'card_id, date, price_raw, price_psa9, price_psa10, volume',
    card_ids,
    limit: card_ids.length * days, // Ensure we get enough data for all cards
  };
}

/**
 * Constants for price history queries
 */
export const PRICE_HISTORY_DEFAULTS = {
  DEFAULT_DAYS: 90,
  MAX_DAYS: 365,
  CHART_DAYS: 30,
  DATA_SOURCE: 'ebay',
} as const;
