/**
 * Tests for market indices query builders
 */

import { describe, it, expect } from 'vitest';
import {
  buildMarketIndexQuery,
  buildLatestIndexQuery,
  buildIndexByDateQuery,
  MARKET_INDEX_TYPES,
  MARKET_INDEX_DEFAULTS,
} from '../queries/market-indices';

describe('buildMarketIndexQuery', () => {
  it('should build query with default parameters', () => {
    const query = buildMarketIndexQuery({ index_type: 'cti' });
    
    expect(query).toEqual({
      select: 'date, value, change_24h, change_7d, volume',
      index_type: 'cti',
      limit: 30,
    });
  });
  
  it('should respect custom days parameter', () => {
    const query = buildMarketIndexQuery({ index_type: 'cti_vintage', days: 90 });
    
    expect(query.limit).toBe(90);
    expect(query.index_type).toBe('cti_vintage');
  });
  
  it('should enforce limit for safety', () => {
    const query = buildMarketIndexQuery({ index_type: 'cti', days: 180 });
    
    expect(query.limit).toBe(180);
    expect(query.limit).toBeLessThanOrEqual(MARKET_INDEX_DEFAULTS.MAX_DAYS);
  });
});

describe('buildLatestIndexQuery', () => {
  it('should build query for latest index value', () => {
    const query = buildLatestIndexQuery('cti');
    
    expect(query).toEqual({
      select: '*',
      index_type: 'cti',
    });
  });
  
  it('should work with different index types', () => {
    const query1 = buildLatestIndexQuery(MARKET_INDEX_TYPES.CTI);
    const query2 = buildLatestIndexQuery(MARKET_INDEX_TYPES.CTI_VINTAGE);
    
    expect(query1.index_type).toBe('cti');
    expect(query2.index_type).toBe('cti_vintage');
  });
});

describe('buildIndexByDateQuery', () => {
  it('should build query for specific date', () => {
    const query = buildIndexByDateQuery('2025-12-05');
    
    expect(query).toEqual({
      select: 'index_type, value, change_24h, change_7d, volume',
      date: '2025-12-05',
      limit: 10,
    });
  });
  
  it('should enforce reasonable limit', () => {
    const query = buildIndexByDateQuery('2025-12-05');
    
    expect(query.limit).toBe(10); // Max index types
  });
});

describe('MARKET_INDEX_TYPES', () => {
  it('should define standard index types', () => {
    expect(MARKET_INDEX_TYPES.CTI).toBe('cti');
    expect(MARKET_INDEX_TYPES.CTI_VINTAGE).toBe('cti_vintage');
    expect(MARKET_INDEX_TYPES.CTI_MODERN).toBe('cti_modern');
  });
});

describe('MARKET_INDEX_DEFAULTS', () => {
  it('should define reasonable default values', () => {
    expect(MARKET_INDEX_DEFAULTS.DEFAULT_DAYS).toBe(30);
    expect(MARKET_INDEX_DEFAULTS.CHART_DAYS).toBe(90);
    expect(MARKET_INDEX_DEFAULTS.MAX_DAYS).toBe(365);
  });
});
