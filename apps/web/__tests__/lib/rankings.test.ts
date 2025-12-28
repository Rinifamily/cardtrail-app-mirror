import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRankings, clearRankingsCache, getRankingsCacheStats } from '@/lib/data/rankings';
import type { RankingsFilters } from '@/types/rankings';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
  })),
}));

describe('Rankings Data Access Layer', () => {
  beforeEach(() => {
    clearRankingsCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRankings', () => {
    it('should fetch gainers data successfully', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            card_id: 1,
            card_name: 'Charizard',
            card_name_ja: 'リザードン',
            thumbnail_url: '/test.png',
            rarity: 'rare',
            current_price: 100,
            price_change: 20,
            price_change_percent: 20,
            volume: 50,
          },
        ],
        error: null,
      });

      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const filters: RankingsFilters = {
        category: 'gainers',
        timeframe: '7d',
      };

      const result = await getRankings(filters);

      expect(mockRpc).toHaveBeenCalledWith('get_price_gainers', {
        timeframe_param: '7d',
        limit_count: 100,
        rarity_filter: null,
        grade_filter: null,
        language_filter: null,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rank: 1,
        cardId: '1',
        cardName: 'Charizard',
        cardNameJa: 'リザードン',
        currentPrice: 100,
        priceChange: 20,
        priceChangePercent: 20,
        volume: 50,
      });
    });

    it('should use correct RPC function for each category', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const categories = ['gainers', 'fallers', 'volume', 'popularity'] as const;
      const expectedFunctions = [
        'get_price_gainers',
        'get_price_fallers',
        'get_volume_leaders',
        'get_popularity_rankings',
      ];

      for (let i = 0; i < categories.length; i++) {
        mockRpc.mockClear();
        await getRankings({ category: categories[i], timeframe: '7d' });
        expect(mockRpc).toHaveBeenCalledWith(
          expectedFunctions[i],
          expect.any(Object)
        );
      }
    });

    it('should apply filters correctly', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const filters: RankingsFilters = {
        category: 'gainers',
        timeframe: '24h',
        rarity: 'rare',
        language: 'ja',
      };

      await getRankings(filters);

      expect(mockRpc).toHaveBeenCalledWith('get_price_gainers', {
        timeframe_param: '24h',
        limit_count: 100,
        rarity_filter: 'rare',
        grade_filter: null,
        language_filter: 'ja',
      });
    });

    it('should return empty array when no data', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const result = await getRankings({
        category: 'gainers',
        timeframe: '7d',
      });

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const result = await getRankings({
        category: 'gainers',
        timeframe: '7d',
      });

      expect(result).toEqual([]);
    });
  });

  describe('Caching', () => {
    it('should cache results', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            card_id: 1,
            card_name: 'Test',
            card_name_ja: 'テスト',
            thumbnail_url: '/test.png',
            rarity: 'common',
            current_price: 10,
            price_change: 0,
            price_change_percent: 0,
            volume: 1,
          },
        ],
        error: null,
      });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const filters: RankingsFilters = {
        category: 'gainers',
        timeframe: '7d',
      };

      // First call
      await getRankings(filters);
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await getRankings(filters);
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it('should generate different cache keys for different filters', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      await getRankings({ category: 'gainers', timeframe: '7d' });
      await getRankings({ category: 'fallers', timeframe: '7d' });

      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      await getRankings({ category: 'gainers', timeframe: '7d' });
      expect(mockRpc).toHaveBeenCalledTimes(1);

      clearRankingsCache();

      await getRankings({ category: 'gainers', timeframe: '7d' });
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Transformation', () => {
    it('should assign ranks starting at 1', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            card_id: 1,
            card_name: 'Card 1',
            card_name_ja: 'カード1',
            thumbnail_url: '/1.png',
            rarity: 'rare',
            current_price: 100,
            price_change: 10,
            price_change_percent: 10,
            volume: 50,
          },
          {
            card_id: 2,
            card_name: 'Card 2',
            card_name_ja: 'カード2',
            thumbnail_url: '/2.png',
            rarity: 'common',
            current_price: 50,
            price_change: 5,
            price_change_percent: 5,
            volume: 25,
          },
        ],
        error: null,
      });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const result = await getRankings({
        category: 'gainers',
        timeframe: '7d',
      });

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it('should handle null/undefined values', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            card_id: 1,
            card_name: 'Card',
            card_name_ja: 'カード',
            thumbnail_url: null,
            rarity: 'rare',
            current_price: null,
            price_change: null,
            price_change_percent: null,
            volume: null,
          },
        ],
        error: null,
      });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      const result = await getRankings({
        category: 'gainers',
        timeframe: '7d',
      });

      expect(result[0].thumbnailUrl).toBe('/placeholder-card.png');
      expect(result[0].currentPrice).toBe(0);
      expect(result[0].priceChange).toBe(0);
      expect(result[0].priceChangePercent).toBe(0);
      expect(result[0].volume).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache stats', async () => {
      const { createClient } = await import('@/lib/supabase');
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      (createClient as any).mockReturnValue({ rpc: mockRpc });

      await getRankings({ category: 'gainers', timeframe: '7d' });
      await getRankings({ category: 'fallers', timeframe: '24h' });

      const stats = getRankingsCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('key');
      expect(stats.entries[0]).toHaveProperty('age');
      expect(stats.entries[0]).toHaveProperty('isValid');
    });
  });
});
