/**
 * Tests for price history query builders
 */

import { describe, it, expect } from 'vitest';
import {
  buildPriceHistoryQuery,
  buildLatestPriceQuery,
  buildMultiCardPriceQuery,
  PRICE_HISTORY_DEFAULTS,
} from '../queries/price-history';

describe('buildPriceHistoryQuery', () => {
  it('should build query with default parameters', () => {
    const query = buildPriceHistoryQuery({ card_id: 12 });
    
    expect(query).toEqual({
      select: 'date, price_raw, price_psa9, price_psa10, volume',
      card_id: 12,
      data_source: 'ebay',
      limit: 90,
    });
  });
  
  it('should respect custom days parameter', () => {
    const query = buildPriceHistoryQuery({ card_id: 12, days: 30 });
    
    expect(query.limit).toBe(30);
  });
  
  it('should respect custom data source', () => {
    const query = buildPriceHistoryQuery({ 
      card_id: 12, 
      data_source: 'yahoo_jp' 
    });
    
    expect(query.data_source).toBe('yahoo_jp');
  });
  
  it('should enforce limit for safety', () => {
    const query = buildPriceHistoryQuery({ card_id: 12, days: 365 });
    
    expect(query.limit).toBe(365);
    expect(query.limit).toBeLessThanOrEqual(PRICE_HISTORY_DEFAULTS.MAX_DAYS);
  });
});

describe('buildLatestPriceQuery', () => {
  it('should build query for latest price', () => {
    const query = buildLatestPriceQuery(12);
    
    expect(query).toEqual({
      select: 'date, price_raw, price_psa9, price_psa10, volume, data_source',
      card_id: 12,
    });
  });
});

describe('buildMultiCardPriceQuery', () => {
  it('should build query for multiple cards', () => {
    const query = buildMultiCardPriceQuery([12, 34, 56], 30);
    
    expect(query.card_ids).toEqual([12, 34, 56]);
    expect(query.limit).toBe(90); // 3 cards * 30 days
  });
  
  it('should use default days parameter', () => {
    const query = buildMultiCardPriceQuery([12, 34]);
    
    expect(query.limit).toBe(60); // 2 cards * 30 days default
  });
  
  it('should include all necessary fields', () => {
    const query = buildMultiCardPriceQuery([12]);
    
    expect(query.select).toContain('card_id');
    expect(query.select).toContain('date');
    expect(query.select).toContain('price_raw');
  });
});

describe('PRICE_HISTORY_DEFAULTS', () => {
  it('should define reasonable default values', () => {
    expect(PRICE_HISTORY_DEFAULTS.DEFAULT_DAYS).toBe(90);
    expect(PRICE_HISTORY_DEFAULTS.MAX_DAYS).toBe(365);
    expect(PRICE_HISTORY_DEFAULTS.CHART_DAYS).toBe(30);
    expect(PRICE_HISTORY_DEFAULTS.DATA_SOURCE).toBe('ebay');
  });
});
