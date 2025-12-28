/**
 * Unit tests for weight calculation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWeights,
  calculateRecencyWeight,
  calculateVolumeWeight,
  calculateQualityWeight,
} from '../weight-calculation';
import type { TransactionData } from '../types';

describe('Weight Calculation', () => {
  // Helper to create mock transaction
  const mockTransaction = (overrides: Partial<TransactionData>): TransactionData => ({
    ebay_item_id: 'item-123',
    card_id: 1,
    title: 'Test Card',
    price: 100,
    currency: 'USD',
    sold_date: new Date(),
    grading_company: 'PSA',
    grade: '10',
    quantity: 1,
    language: 'jp',
    is_verified_sale: true,
    listing_type: 'FixedPrice',
    created_at: new Date(),
    ...overrides,
  });

  describe('calculateRecencyWeight', () => {
    it('should give weight 1.0 for today', () => {
      const now = new Date();
      const weight = calculateRecencyWeight(now, now);
      expect(weight).toBeCloseTo(1.0, 2);
    });

    it('should give lower weight for older transactions', () => {
      const now = new Date('2024-12-10');
      const thirtyDaysAgo = new Date('2024-11-10');

      const weight = calculateRecencyWeight(thirtyDaysAgo, now);
      expect(weight).toBeCloseTo(0.37, 1); // e^(-30/30) ≈ 0.37
    });

    it('should give very low weight for 90 days ago', () => {
      const now = new Date('2024-12-10');
      const ninetyDaysAgo = new Date('2024-09-11');

      const weight = calculateRecencyWeight(ninetyDaysAgo, now);
      expect(weight).toBeCloseTo(0.05, 1); // e^(-90/30) ≈ 0.05
    });

    it('should decrease exponentially over time', () => {
      const now = new Date('2024-12-10');
      const tenDays = new Date('2024-11-30');
      const thirtyDays = new Date('2024-11-10');
      const sixtyDays = new Date('2024-10-11');

      const w10 = calculateRecencyWeight(tenDays, now);
      const w30 = calculateRecencyWeight(thirtyDays, now);
      const w60 = calculateRecencyWeight(sixtyDays, now);

      expect(w10).toBeGreaterThan(w30);
      expect(w30).toBeGreaterThan(w60);
    });
  });

  describe('calculateVolumeWeight', () => {
    it('should give weight 1.0 for single card', () => {
      expect(calculateVolumeWeight(1)).toBe(1.0);
    });

    it('should give weight <1.0 for bulk sales', () => {
      const weight5 = calculateVolumeWeight(5);
      const weight10 = calculateVolumeWeight(10);
      
      // Exponential decay formula: e^(-0.1 * (quantity - 1))
      expect(weight5).toBeCloseTo(0.67, 2); // e^(-0.4) ≈ 0.67
      expect(weight10).toBeCloseTo(0.41, 2); // e^(-0.9) ≈ 0.41
    });

    it('should heavily downweight large bulk sales', () => {
      const weight50 = calculateVolumeWeight(50);
      expect(weight50).toBeLessThan(0.01); // Very small weight for 50-card lot
    });

    it('should handle quantity 0 edge case', () => {
      const weight0 = calculateVolumeWeight(0);
      expect(weight0).toBeGreaterThan(1.0); // e^(0.1) > 1
    });
  });

  describe('calculateQualityWeight', () => {
    it('should give weight 1.0 for verified sale with grading', () => {
      const weight = calculateQualityWeight(true, true);
      expect(weight).toBe(1.0);
    });

    it('should give lower weight for active listing', () => {
      const weight = calculateQualityWeight(false, true);
      expect(weight).toBe(0.3);
    });

    it('should give lower weight for missing grading info', () => {
      const weight = calculateQualityWeight(true, false);
      expect(weight).toBe(0.7);
    });

    it('should give lowest weight for active listing without grading', () => {
      const weight = calculateQualityWeight(false, false);
      expect(weight).toBe(0.3 * 0.7);
    });
  });

  describe('calculateWeights', () => {
    it('should weight recent transactions higher', () => {
      const now = new Date('2024-12-10');
      const yesterday = new Date('2024-12-09');
      const monthAgo = new Date('2024-11-10');

      const transactions = [
        mockTransaction({ sold_date: yesterday }),
        mockTransaction({ sold_date: monthAgo }),
      ];

      const weighted = calculateWeights(transactions, now);

      expect(weighted[0].weight).toBeGreaterThan(weighted[1].weight);
      expect(weighted[0].recency_weight).toBeGreaterThan(weighted[1].recency_weight);
    });

    it('should weight single-card sales higher than bulk', () => {
      const transactions = [
        mockTransaction({ quantity: 1 }),
        mockTransaction({ quantity: 10 }),
      ];

      const weighted = calculateWeights(transactions);

      // Single card should have weight 1.0, bulk should be much lower
      expect(weighted[0].volume_weight).toBe(1.0);
      expect(weighted[1].volume_weight).toBeLessThan(0.5);
      expect(weighted[0].weight).toBeGreaterThan(weighted[1].weight);
    });

    it('should weight verified sales higher than active listings', () => {
      const transactions = [
        mockTransaction({ is_verified_sale: true }),
        mockTransaction({ is_verified_sale: false }),
      ];

      const weighted = calculateWeights(transactions);

      expect(weighted[0].weight).toBeGreaterThan(weighted[1].weight);
      expect(weighted[0].quality_weight).toBeGreaterThan(weighted[1].quality_weight);
    });

    it('should combine all weight factors', () => {
      const now = new Date('2024-12-10');

      const transactions = [
        // Perfect transaction: recent, single card, verified, graded
        mockTransaction({
          sold_date: new Date('2024-12-09'),
          quantity: 1,
          is_verified_sale: true,
          grading_company: 'PSA',
          grade: '10',
        }),
        // Poor transaction: old, bulk, active listing, no grading
        mockTransaction({
          sold_date: new Date('2024-09-10'),
          quantity: 10,
          is_verified_sale: false,
          grading_company: null,
          grade: null,
        }),
      ];

      const weighted = calculateWeights(transactions, now);

      // Perfect transaction should have much higher weight
      expect(weighted[0].weight).toBeGreaterThan(weighted[1].weight * 5);
    });

    it('should include weight metadata', () => {
      const transactions = [mockTransaction({})];

      const weighted = calculateWeights(transactions);

      expect(weighted[0]).toHaveProperty('weight');
      expect(weighted[0]).toHaveProperty('recency_weight');
      expect(weighted[0]).toHaveProperty('volume_weight');
      expect(weighted[0]).toHaveProperty('quality_weight');
    });
  });
});
