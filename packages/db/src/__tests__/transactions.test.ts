/**
 * Tests for transactions query builders
 */

import { describe, it, expect } from 'vitest';
import {
  buildTransactionsQuery,
  buildCTPriceQuery,
  buildTransactionStatsQuery,
  TRANSACTION_DEFAULTS,
  SUPPORTED_CURRENCIES,
  GRADE_TYPES,
} from '../queries/transactions';

describe('buildTransactionsQuery', () => {
  it('should build query with default parameters', () => {
    const query = buildTransactionsQuery({ card_id: 12 });
    
    expect(query.card_id).toBe(12);
    expect(query.limit).toBe(50);
    expect(query.exclude_outliers).toBe(true);
    expect(query.select).toContain('price');
    expect(query.select).toContain('sold_date');
  });
  
  it('should respect custom limit', () => {
    const query = buildTransactionsQuery({ card_id: 12, limit: 20 });
    
    expect(query.limit).toBe(20);
  });
  
  it('should allow including outliers', () => {
    const query = buildTransactionsQuery({ 
      card_id: 12, 
      exclude_outliers: false 
    });
    
    expect(query.exclude_outliers).toBe(false);
  });
  
  it('should enforce reasonable limit', () => {
    const query = buildTransactionsQuery({ card_id: 12, limit: 100 });
    
    expect(query.limit).toBe(100);
  });
});

describe('buildCTPriceQuery', () => {
  it('should build query for CT Price calculation', () => {
    const query = buildCTPriceQuery(12, 'psa10', 90);
    
    expect(query.card_id).toBe(12);
    expect(query.grade).toBe('psa10');
    expect(query.limit).toBe(100);
    expect(query.select).toBe('price, currency, sold_date');
  });
  
  it('should calculate since_date correctly', () => {
    const query = buildCTPriceQuery(12, 'psa10', 30);
    
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - 30);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    expect(query.since_date).toBe(expectedDateStr);
  });
  
  it('should use default days parameter', () => {
    const query = buildCTPriceQuery(12, 'raw');
    
    // Should use 90 days default
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const expectedDate = ninetyDaysAgo.toISOString().split('T')[0];
    
    expect(query.since_date).toBe(expectedDate);
  });
  
  it('should enforce CT Price transaction limit', () => {
    const query = buildCTPriceQuery(12, 'psa10');
    
    expect(query.limit).toBe(TRANSACTION_DEFAULTS.CT_PRICE_MAX_TRANSACTIONS);
  });
});

describe('buildTransactionStatsQuery', () => {
  it('should build query for statistics', () => {
    const query = buildTransactionStatsQuery(12, 30);
    
    expect(query.card_id).toBe(12);
    expect(query.select).toContain('price');
    expect(query.select).toContain('sold_date');
    expect(query.select).toContain('grade');
  });
  
  it('should calculate since_date correctly', () => {
    const query = buildTransactionStatsQuery(12, 14);
    
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - 14);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    expect(query.since_date).toBe(expectedDateStr);
  });
});

describe('TRANSACTION_DEFAULTS', () => {
  it('should define reasonable default values', () => {
    expect(TRANSACTION_DEFAULTS.DEFAULT_LIMIT).toBe(50);
    expect(TRANSACTION_DEFAULTS.CT_PRICE_DAYS).toBe(90);
    expect(TRANSACTION_DEFAULTS.CT_PRICE_MAX_TRANSACTIONS).toBe(100);
    expect(TRANSACTION_DEFAULTS.RECENT_SALES_LIMIT).toBe(20);
  });
});

describe('SUPPORTED_CURRENCIES', () => {
  it('should include standard currencies', () => {
    expect(SUPPORTED_CURRENCIES).toContain('USD');
    expect(SUPPORTED_CURRENCIES).toContain('CNY');
    expect(SUPPORTED_CURRENCIES).toContain('JPY');
    expect(SUPPORTED_CURRENCIES).toContain('EUR');
    expect(SUPPORTED_CURRENCIES).toContain('GBP');
  });
});

describe('GRADE_TYPES', () => {
  it('should define standard grade types', () => {
    expect(GRADE_TYPES.PSA10).toBe('psa10');
    expect(GRADE_TYPES.PSA9).toBe('psa9');
    expect(GRADE_TYPES.RAW).toBe('raw');
    expect(GRADE_TYPES.BGS10).toBe('bgs10');
  });
});
