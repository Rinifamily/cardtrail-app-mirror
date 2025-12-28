/**
 * Unit Tests: Price Sync Pipeline
 * 
 * Tests core sync logic without making real API calls.
 * Uses mocked Supabase client and price algorithm.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as syncPricesModule from '@/lib/internal/sync-prices';
import * as priceAlgorithmModule from '@/lib/price-algorithm';

const {
  getCardsForPriceUpdate,
  processSingleCard,
  syncPricesInBatches,
  syncPrices,
} = syncPricesModule;

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  or: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  range: vi.fn(() => mockSupabaseClient),
  upsert: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
};

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock price algorithm
vi.mock('@/lib/price-algorithm', () => ({
  calculateCTPrice: vi.fn(),
}));

describe('sync-prices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCardsForPriceUpdate', () => {
    it('should fetch cards needing updates', async () => {
      // Mock successful query
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [
          { card_id: 1, name_en: 'Test Card 1', set_code: 'SET1' },
          { card_id: 2, name_en: 'Test Card 2', set_code: 'SET2' },
        ],
        error: null,
      });

      const cards = await getCardsForPriceUpdate(100, 0);
      
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveProperty('card_id', 1);
      expect(cards[0]).toHaveProperty('name_en', 'Test Card 1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('card_extensions');
    });

    it('should handle empty results', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const cards = await getCardsForPriceUpdate(100, 0);
      
      expect(cards).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(getCardsForPriceUpdate()).rejects.toThrow('Failed to fetch cards');
    });

    it('should respect pagination parameters', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getCardsForPriceUpdate(50, 100);
      
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(100, 149);
    });
  });

  describe('processSingleCard', () => {
    beforeEach(() => {
      // Reset to successful price calculation
      vi.mocked(priceAlgorithmModule.calculateCTPrice).mockResolvedValue({
        price: 100,
        confidence: 'high',
        sample_size: 10,
        weighted_sample_size: 8,
        last_sale_date: new Date(),
        price_range: { min: 90, max: 110 },
        calculation_date: new Date(),
        outliers_removed: 1,
        is_estimated: false,
      });

      // Reset Supabase mocks to success
      mockSupabaseClient.upsert.mockResolvedValue({ error: null });
      mockSupabaseClient.insert.mockResolvedValue({ error: null });
    });

    it('should successfully process a card', async () => {
      const card = { card_id: 1, name_en: 'Test Card', set_code: 'SET1' };
      const result = await processSingleCard(card);

      expect(result.success).toBe(true);
      expect(result.price).toBe(100);
      expect(result.confidence).toBe('high');
      expect(mockSupabaseClient.upsert).toHaveBeenCalled();
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should handle cards with no valid price', async () => {
      vi.mocked(priceAlgorithmModule.calculateCTPrice).mockResolvedValueOnce({
        price: null,
        confidence: 'low',
        sample_size: 0,
        weighted_sample_size: 0,
        last_sale_date: null,
        price_range: null,
        calculation_date: new Date(),
        outliers_removed: 0,
        is_estimated: false,
        message: 'No recent sales data',
      });

      const card = { card_id: 2, name_en: 'No Price Card', set_code: 'SET2' };
      const result = await processSingleCard(card);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid price');
    });

    it('should handle zero price', async () => {
      vi.mocked(priceAlgorithmModule.calculateCTPrice).mockResolvedValueOnce({
        price: 0,
        confidence: 'low',
        sample_size: 1,
        weighted_sample_size: 1,
        last_sale_date: new Date(),
        price_range: { min: 0, max: 0 },
        calculation_date: new Date(),
        outliers_removed: 0,
        is_estimated: false,
      });

      const card = { card_id: 3, name_en: 'Zero Price Card', set_code: 'SET3' };
      const result = await processSingleCard(card);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid price');
    });

    it('should handle calculation errors gracefully', async () => {
      // Mock to fail all retry attempts (3 times)
      vi.mocked(priceAlgorithmModule.calculateCTPrice)
        .mockRejectedValueOnce(new Error('eBay API timeout'))
        .mockRejectedValueOnce(new Error('eBay API timeout'))
        .mockRejectedValueOnce(new Error('eBay API timeout'));

      const card = { card_id: 4, name_en: 'Error Card', set_code: 'SET4' };
      const result = await processSingleCard(card);

      expect(result.success).toBe(false);
      expect(result.error).toContain('eBay API timeout');
    });

    it('should handle database update errors', async () => {
      mockSupabaseClient.upsert.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      const card = { card_id: 5, name_en: 'DB Error Card', set_code: 'SET5' };
      const result = await processSingleCard(card);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update card_extensions');
    });

    it('should handle duplicate price_history entries gracefully', async () => {
      mockSupabaseClient.insert.mockResolvedValueOnce({
        error: { message: 'duplicate key value violates unique constraint' },
      });

      const card = { card_id: 6, name_en: 'Duplicate Card', set_code: 'SET6' };
      const result = await processSingleCard(card);

      // Should still succeed since duplicate is expected behavior
      expect(result.success).toBe(true);
    });
  });

  describe('syncPricesInBatches', () => {
    beforeEach(() => {
      vi.mocked(priceAlgorithmModule.calculateCTPrice).mockResolvedValue({
        price: 100,
        confidence: 'high',
        sample_size: 10,
        weighted_sample_size: 8,
        last_sale_date: new Date(),
        price_range: { min: 90, max: 110 },
        calculation_date: new Date(),
        outliers_removed: 1,
        is_estimated: false,
      });

      mockSupabaseClient.upsert.mockResolvedValue({ error: null });
      mockSupabaseClient.insert.mockResolvedValue({ error: null });
    });

    it('should process cards in batches', async () => {
      const cards = Array.from({ length: 250 }, (_, i) => ({
        card_id: i + 1,
        name_en: `Card ${i + 1}`,
        set_code: 'SET1',
      }));

      const summary = await syncPricesInBatches(cards, 100, 0); // 0ms delay for testing

      expect(summary.totalCards).toBe(250);
      expect(summary.processed).toBe(250);
      expect(summary.successful).toBe(250);
      expect(summary.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      // Mock different results for each call
      vi.mocked(priceAlgorithmModule.calculateCTPrice)
        .mockResolvedValueOnce({
          price: 100,
          confidence: 'high',
          sample_size: 10,
          weighted_sample_size: 8,
          last_sale_date: new Date(),
          price_range: { min: 90, max: 110 },
          calculation_date: new Date(),
          outliers_removed: 1,
          is_estimated: false,
        })
        .mockResolvedValueOnce({
          price: 200,
          confidence: 'medium',
          sample_size: 5,
          weighted_sample_size: 4,
          last_sale_date: new Date(),
          price_range: { min: 180, max: 220 },
          calculation_date: new Date(),
          outliers_removed: 0,
          is_estimated: false,
        })
        .mockRejectedValueOnce(new Error('API error'));

      const cards = [
        { card_id: 1, name_en: 'Card 1', set_code: 'SET1' },
        { card_id: 2, name_en: 'Card 2', set_code: 'SET2' },
        { card_id: 3, name_en: 'Card 3', set_code: 'SET3' },
      ];

      const summary = await syncPricesInBatches(cards, 10, 0);

      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0].cardId).toBe(3);
    });

    it('should collect error details', async () => {
      // Mock to fail all retry attempts (use mockRejectedValue for infinite rejections)
      vi.mocked(priceAlgorithmModule.calculateCTPrice)
        .mockRejectedValue(new Error('API Error'));

      const cards = [
        { card_id: 1, name_en: 'Card 1', set_code: 'SET1' },
        { card_id: 2, name_en: 'Card 2', set_code: 'SET2' },
      ];

      const summary = await syncPricesInBatches(cards, 10, 0);

      expect(summary.errors).toHaveLength(2);
      expect(summary.errors[0].error).toContain('API Error');
      expect(summary.errors[1].error).toContain('API Error');
    });

    it('should limit error list to 50 entries', async () => {
      vi.mocked(priceAlgorithmModule.calculateCTPrice).mockRejectedValue(new Error('Failed'));

      const cards = Array.from({ length: 100 }, (_, i) => ({
        card_id: i + 1,
        name_en: `Card ${i + 1}`,
        set_code: 'SET1',
      }));

      const summary = await syncPricesInBatches(cards, 100, 0);

      expect(summary.failed).toBe(100);
      expect(summary.errors).toHaveLength(50); // Capped at 50
    });
  });

  describe('syncPrices', () => {
    beforeEach(() => {
      vi.mocked(priceAlgorithmModule.calculateCTPrice).mockResolvedValue({
        price: 100,
        confidence: 'high',
        sample_size: 10,
        weighted_sample_size: 8,
        last_sale_date: new Date(),
        price_range: { min: 90, max: 110 },
        calculation_date: new Date(),
        outliers_removed: 1,
        is_estimated: false,
      });

      mockSupabaseClient.upsert.mockResolvedValue({ error: null });
      mockSupabaseClient.insert.mockResolvedValue({ error: null });
    });

    it('should handle dry run mode', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [
          { card_id: 1, name_en: 'Card 1', set_code: 'SET1' },
          { card_id: 2, name_en: 'Card 2', set_code: 'SET2' },
        ],
        error: null,
      });

      const summary = await syncPrices({ dryRun: true });

      expect(summary.processed).toBe(0);
      expect(summary.skipped).toBe(2);
      expect(mockSupabaseClient.upsert).not.toHaveBeenCalled();
    });

    it('should handle empty card list', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const summary = await syncPrices();

      expect(summary.totalCards).toBe(0);
      expect(summary.processed).toBe(0);
    });

    it('should process cards when available', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [
          { card_id: 1, name_en: 'Card 1', set_code: 'SET1' },
        ],
        error: null,
      });

      const summary = await syncPrices({ limit: 10 });

      expect(summary.totalCards).toBe(1);
      expect(summary.processed).toBe(1);
      expect(summary.successful).toBe(1);
    });

    it('should respect limit parameter', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await syncPrices({ limit: 50, offset: 100 });

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(100, 149);
    });
  });
});
