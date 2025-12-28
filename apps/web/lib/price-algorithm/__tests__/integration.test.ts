/**
 * Integration tests for CT Price algorithm
 * 
 * These tests verify the complete end-to-end flow
 * using mock data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateCTPrice } from '../calculate-ct-price';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({
              limit: () => mockTransactionResponse,
            }),
          }),
        }),
      }),
      insert: () => ({ error: null }),
      update: () => ({ eq: () => ({ error: null }) }),
    }),
  }),
}));

let mockTransactionResponse: { data: any[] | null; error: any };

describe('CT Price Integration', () => {
  beforeEach(() => {
    // Reset mock response
    mockTransactionResponse = { data: [], error: null };
  });

  describe('End-to-End Calculation', () => {
    it('should calculate price with sufficient data', async () => {
      // Mock 10 transactions with reasonable prices
      const mockTransactions = Array.from({ length: 10 }, (_, i) => ({
        ebay_item_id: `item-${i}`,
        card_id: 1,
        title: 'Test Card PSA 10',
        price: 100 + i * 5, // Prices from 100 to 145
        currency: 'USD',
        sold_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        grading_company: 'PSA',
        grade: '10',
        quantity: 1,
        is_verified_sale: true,
        metadata: { language: 'jp' },
        created_at: new Date().toISOString(),
      }));

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.price).not.toBeNull();
      expect(result.price).toBeGreaterThan(100);
      expect(result.price).toBeLessThan(145);
      expect(result.sample_size).toBeGreaterThanOrEqual(10);
      expect(result.confidence).toBe('high');
      expect(result.outliers_removed).toBe(0);
      expect(result.is_estimated).toBe(false);
    });

    it('should handle sparse data gracefully', async () => {
      // Mock only 3 transactions
      const mockTransactions = [
        {
          ebay_item_id: 'item-1',
          card_id: 1,
          title: 'Test Card PSA 10',
          price: 100,
          currency: 'USD',
          sold_date: new Date().toISOString(),
          grading_company: 'PSA',
          grade: '10',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          ebay_item_id: 'item-2',
          card_id: 1,
          title: 'Test Card PSA 10',
          price: 110,
          currency: 'USD',
          sold_date: new Date().toISOString(),
          grading_company: 'PSA',
          grade: '10',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          ebay_item_id: 'item-3',
          card_id: 1,
          title: 'Test Card PSA 10',
          price: 105,
          currency: 'USD',
          sold_date: new Date().toISOString(),
          grading_company: 'PSA',
          grade: '10',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.price).not.toBeNull();
      expect(result.sample_size).toBe(3);
      expect(result.confidence).toBe('low'); // Low due to small sample
    });

    it('should remove outliers correctly', async () => {
      // Mock transactions with clear outlier
      const mockTransactions = [
        ...Array.from({ length: 7 }, (_, i) => ({
          ebay_item_id: `item-${i}`,
          card_id: 1,
          title: 'Test Card PSA 10',
          price: 100 + i * 2, // Normal prices: 100-112
          currency: 'USD',
          sold_date: new Date().toISOString(),
          grading_company: 'PSA',
          grade: '10',
          metadata: {},
          created_at: new Date().toISOString(),
        })),
        {
          ebay_item_id: 'outlier',
          card_id: 1,
          title: 'Test Card PSA 10',
          price: 500, // Outlier
          currency: 'USD',
          sold_date: new Date().toISOString(),
          grading_company: 'PSA',
          grade: '10',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.outliers_removed).toBeGreaterThan(0);
      expect(result.price).toBeLessThan(150); // Should not be skewed by 500
    });

    it('should return null for no data', async () => {
      mockTransactionResponse = { data: [], error: null };

      const result = await calculateCTPrice({
        card_id: 9999,
        grade: 'psa10',
      });

      expect(result.price).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.sample_size).toBe(0);
      expect(result.message).toContain('No recent sales');
    });

    it('should detect high volatility', async () => {
      // Mock transactions with high variance
      const mockTransactions = [
        { ebay_item_id: 'item-1', card_id: 1, price: 50, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-2', card_id: 1, price: 100, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-3', card_id: 1, price: 150, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-4', card_id: 1, price: 200, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-5', card_id: 1, price: 250, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
      ];

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.volatility_warning).toBe(true);
      expect(result.message).toContain('volatile');
    });
  });

  describe('Language Filtering', () => {
    it('should filter by language when sufficient data', async () => {
      const mockTransactions = [
        ...Array.from({ length: 6 }, (_, i) => ({
          ebay_item_id: `item-jp-${i}`,
          card_id: 1,
          price: 100 + i,
          grading_company: 'PSA',
          grade: '10',
          sold_date: new Date().toISOString(),
          metadata: { language: 'jp' },
          created_at: new Date().toISOString(),
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          ebay_item_id: `item-en-${i}`,
          card_id: 1,
          price: 200 + i,
          grading_company: 'PSA',
          grade: '10',
          sold_date: new Date().toISOString(),
          metadata: { language: 'en' },
          created_at: new Date().toISOString(),
        })),
      ];

      mockTransactionResponse = { data: mockTransactions, error: null };

      const jpResult = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
        language: 'jp',
      });

      // Should use JP prices (around 100), not EN prices (around 200)
      expect(jpResult.price).toBeLessThan(150);
    });

    it('should use all languages when insufficient language-specific data', async () => {
      const mockTransactions = [
        ...Array.from({ length: 2 }, (_, i) => ({
          ebay_item_id: `item-jp-${i}`,
          card_id: 1,
          price: 100,
          grading_company: 'PSA',
          grade: '10',
          sold_date: new Date().toISOString(),
          metadata: { language: 'jp' },
          created_at: new Date().toISOString(),
        })),
      ];

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
        language: 'jp',
      });

      // Should still return a result even with only 2 JP transactions
      expect(result.price).not.toBeNull();
    });
  });

  describe('Confidence Levels', () => {
    it('should assign high confidence for abundant recent data', async () => {
      const mockTransactions = Array.from({ length: 15 }, (_, i) => ({
        ebay_item_id: `item-${i}`,
        card_id: 1,
        price: 100 + i,
        grading_company: 'PSA',
        grade: '10',
        sold_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(), // 0-14 days ago
        metadata: {},
        created_at: new Date().toISOString(),
      }));

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.confidence).toBe('high');
    });

    it('should assign medium confidence for moderate data', async () => {
      const mockTransactions = Array.from({ length: 6 }, (_, i) => ({
        ebay_item_id: `item-${i}`,
        card_id: 1,
        price: 100 + i,
        grading_company: 'PSA',
        grade: '10',
        sold_date: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString(), // 0-25 days ago
        metadata: {},
        created_at: new Date().toISOString(),
      }));

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.confidence).toBe('medium');
    });

    it('should assign low confidence for sparse data', async () => {
      const mockTransactions = Array.from({ length: 3 }, (_, i) => ({
        ebay_item_id: `item-${i}`,
        card_id: 1,
        price: 100,
        grading_company: 'PSA',
        grade: '10',
        sold_date: new Date().toISOString(),
        metadata: {},
        created_at: new Date().toISOString(),
      }));

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.confidence).toBe('low');
    });
  });

  describe('Price Range', () => {
    it('should calculate min and max prices', async () => {
      const mockTransactions = [
        { ebay_item_id: 'item-1', card_id: 1, price: 80, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-2', card_id: 1, price: 100, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-3', card_id: 1, price: 120, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
        { ebay_item_id: 'item-4', card_id: 1, price: 90, grading_company: 'PSA', grade: '10', sold_date: new Date().toISOString(), metadata: {}, created_at: new Date().toISOString() },
      ];

      mockTransactionResponse = { data: mockTransactions, error: null };

      const result = await calculateCTPrice({
        card_id: 1,
        grade: 'psa10',
      });

      expect(result.price_range).not.toBeNull();
      expect(result.price_range?.min).toBe(80);
      expect(result.price_range?.max).toBe(120);
    });
  });
});
