/**
 * Market Indices Queries
 * 
 * Query helpers for the market_indices table.
 * Powers market dashboard charts and CTI visualization.
 */

import type { Database } from '../../../../apps/web/lib/database.types.generated';

export type MarketIndexRow = Database['public']['Tables']['market_indices']['Row'];

export interface MarketIndexQuery {
  index_type: string;
  days?: number;
}

export interface MarketIndexResult {
  date: string;
  value: number;
  change_24h: number | null;
  change_7d: number | null;
  volume: number | null;
}

/**
 * Build query for fetching market index history
 * 
 * @param params - Query parameters
 * @returns Query configuration object
 * 
 * @example
 * ```ts
 * const query = buildMarketIndexQuery({ index_type: 'cti', days: 30 });
 * const { data } = await supabase
 *   .from('market_indices')
 *   .select(query.select)
 *   .eq('index_type', query.index_type)
 *   .order('date', { ascending: false })
 *   .limit(query.limit);
 * ```
 */
export function buildMarketIndexQuery(params: MarketIndexQuery) {
  const { index_type, days = 30 } = params;
  
  return {
    select: 'date, value, change_24h, change_7d, volume',
    index_type,
    limit: days,
  };
}

/**
 * Get latest index value
 * 
 * @param index_type - Index type ('cti', 'cti_vintage', 'cti_modern')
 * @returns Query configuration for latest index
 * 
 * @example
 * ```ts
 * const query = buildLatestIndexQuery('cti');
 * const { data } = await supabase
 *   .from('market_indices')
 *   .select(query.select)
 *   .eq('index_type', query.index_type)
 *   .order('date', { ascending: false })
 *   .limit(1)
 *   .single();
 * ```
 */
export function buildLatestIndexQuery(index_type: string) {
  return {
    select: '*',
    index_type,
  };
}

/**
 * Get all index types for a specific date
 * 
 * @param date - Date in YYYY-MM-DD format
 * @returns Query configuration
 * 
 * @example
 * ```ts
 * const query = buildIndexByDateQuery('2025-12-05');
 * const { data } = await supabase
 *   .from('market_indices')
 *   .select(query.select)
 *   .eq('date', query.date)
 *   .limit(query.limit);
 * ```
 */
export function buildIndexByDateQuery(date: string) {
  return {
    select: 'index_type, value, change_24h, change_7d, volume',
    date,
    limit: 10, // Maximum number of index types
  };
}

/**
 * Constants for market index queries
 */
export const MARKET_INDEX_TYPES = {
  CTI: 'cti',
  CTI_VINTAGE: 'cti_vintage',
  CTI_MODERN: 'cti_modern',
} as const;

export const MARKET_INDEX_DEFAULTS = {
  DEFAULT_DAYS: 30,
  CHART_DAYS: 90,
  MAX_DAYS: 365,
} as const;
