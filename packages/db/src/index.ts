/**
 * @cardtrail/db
 * 
 * Database query helpers and utilities for CardTrail.
 * 
 * @example
 * ```ts
 * import { buildPriceHistoryQuery, PRICE_HISTORY_DEFAULTS } from '@cardtrail/db';
 * 
 * const query = buildPriceHistoryQuery({ 
 *   card_id: 12, 
 *   days: PRICE_HISTORY_DEFAULTS.DEFAULT_DAYS 
 * });
 * ```
 */

export * from './queries';
