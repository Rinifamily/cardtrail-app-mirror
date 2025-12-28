/**
 * Transactions Queries
 * 
 * Query helpers for the transactions table.
 * Powers CT Price algorithm and recent sales display.
 */

import type { Database } from '../../../../apps/web/lib/database.types.generated';

export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export interface TransactionQuery {
  card_id: number;
  limit?: number;
  exclude_outliers?: boolean;
  grade?: string;
}

export interface TransactionResult {
  id: number;
  price: number;
  currency: string;
  sold_date: string | null;
  condition: string | null;
  grade: string | null;
  grading_company: string | null;
  is_outlier: boolean;
}

/**
 * Build query for fetching recent transactions
 * 
 * @param params - Query parameters
 * @returns Query configuration object
 * 
 * @example
 * ```ts
 * const query = buildTransactionsQuery({ card_id: 12, limit: 20 });
 * const { data } = await supabase
 *   .from('transactions')
 *   .select(query.select)
 *   .eq('card_id', query.card_id)
 *   .order('sold_date', { ascending: false, nullsFirst: false })
 *   .limit(query.limit);
 * ```
 */
export function buildTransactionsQuery(params: TransactionQuery) {
  const { card_id, limit = 50, exclude_outliers = true } = params;
  
  return {
    select: 'id, price, currency, sold_date, condition, grade, grading_company, is_outlier',
    card_id,
    limit,
    exclude_outliers,
  };
}

/**
 * Build query for CT Price calculation
 * 
 * @param card_id - Card ID
 * @param grade - Grading level ('psa10', 'psa9', 'raw')
 * @param days - Number of days to look back
 * @returns Query configuration
 * 
 * @example
 * ```ts
 * const query = buildCTPriceQuery(12, 'psa10', 90);
 * const { data } = await supabase
 *   .from('transactions')
 *   .select(query.select)
 *   .eq('card_id', query.card_id)
 *   .eq('grade', query.grade)
 *   .eq('is_outlier', false)
 *   .gte('sold_date', query.since_date)
 *   .order('sold_date', { ascending: false })
 *   .limit(query.limit);
 * ```
 */
export function buildCTPriceQuery(card_id: number, grade: string, days: number = 90) {
  const since_date = new Date();
  since_date.setDate(since_date.getDate() - days);
  
  return {
    select: 'price, currency, sold_date',
    card_id,
    grade,
    since_date: since_date.toISOString().split('T')[0],
    limit: 100, // Max transactions for CT Price
  };
}

/**
 * Build query for transaction statistics
 * 
 * @param card_id - Card ID
 * @param days - Number of days to analyze
 * @returns Query configuration
 * 
 * @example
 * ```ts
 * const query = buildTransactionStatsQuery(12, 30);
 * const { data, count } = await supabase
 *   .from('transactions')
 *   .select(query.select, { count: 'exact' })
 *   .eq('card_id', query.card_id)
 *   .gte('sold_date', query.since_date)
 *   .eq('is_outlier', false);
 * ```
 */
export function buildTransactionStatsQuery(card_id: number, days: number = 30) {
  const since_date = new Date();
  since_date.setDate(since_date.getDate() - days);
  
  return {
    select: 'price, sold_date, grade',
    card_id,
    since_date: since_date.toISOString().split('T')[0],
  };
}

/**
 * Constants for transaction queries
 */
export const TRANSACTION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  CT_PRICE_DAYS: 90,
  CT_PRICE_MAX_TRANSACTIONS: 100,
  RECENT_SALES_LIMIT: 20,
} as const;

export const SUPPORTED_CURRENCIES = ['USD', 'CNY', 'JPY', 'EUR', 'GBP'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const GRADE_TYPES = {
  PSA10: 'psa10',
  PSA9: 'psa9',
  PSA8: 'psa8',
  BGS10: 'bgs10',
  BGS9_5: 'bgs9.5',
  CGC10: 'cgc10',
  RAW: 'raw',
} as const;
