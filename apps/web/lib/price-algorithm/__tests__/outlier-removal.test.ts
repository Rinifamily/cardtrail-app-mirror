/**
 * Unit tests for outlier removal
 */

import { describe, it, expect } from 'vitest';
import { removeOutliers } from '../outlier-removal';
import type { TransactionData } from '../types';

describe('Outlier Removal', () => {
  // Helper to create mock transaction
  const mockTransaction = (price: number): TransactionData => ({
    ebay_item_id: `item-${price}`,
    card_id: 1,
    title: 'Test Card',
    price,
    currency: 'USD',
    sold_date: new Date(),
    grading_company: 'PSA',
    grade: '10',
    quantity: 1,
    language: 'jp',
    is_verified_sale: true,
    listing_type: 'FixedPrice',
    created_at: new Date(),
  });

  describe('IQR Method', () => {
    it('should remove statistical outliers', () => {
      const transactions = [
        mockTransaction(50),
        mockTransaction(55),
        mockTransaction(60),
        mockTransaction(65),
        mockTransaction(70),
        mockTransaction(75),
        mockTransaction(80),
        mockTransaction(500), // Outlier
      ];

      const { filtered, outliers } = removeOutliers(transactions);

      expect(filtered.length).toBe(7);
      expect(outliers.length).toBe(1);
      expect(outliers[0].price).toBe(500);
    });

    it('should handle multiple outliers', () => {
      const transactions = [
        mockTransaction(5), // Low outlier
        mockTransaction(50),
        mockTransaction(55),
        mockTransaction(60),
        mockTransaction(65),
        mockTransaction(500), // High outlier
      ];

      const { filtered, outliers } = removeOutliers(transactions);

      expect(outliers.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(transactions.length);
    });

    it('should not remove values when all are close', () => {
      const transactions = [
        mockTransaction(100),
        mockTransaction(105),
        mockTransaction(110),
        mockTransaction(115),
        mockTransaction(120),
      ];

      const { filtered, outliers } = removeOutliers(transactions);

      expect(filtered.length).toBe(5);
      expect(outliers.length).toBe(0);
    });

    it('should calculate correct IQR bounds', () => {
      const transactions = [
        mockTransaction(10),
        mockTransaction(20),
        mockTransaction(30),
        mockTransaction(40),
        mockTransaction(50),
        mockTransaction(60),
        mockTransaction(70),
        mockTransaction(80),
      ];

      const result = removeOutliers(transactions);

      // Q1 should be around 25, Q3 around 65
      expect(result.q1).toBeGreaterThan(20);
      expect(result.q1).toBeLessThan(30);
      expect(result.q3).toBeGreaterThan(60);
      expect(result.q3).toBeLessThan(70);
      expect(result.iqr).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle small sample size (<4 transactions)', () => {
      const transactions = [
        mockTransaction(50),
        mockTransaction(500), // Would be outlier with more data
      ];

      const { filtered, outliers } = removeOutliers(transactions);

      // Don't remove outliers with <4 samples
      expect(filtered.length).toBe(2);
      expect(outliers.length).toBe(0);
    });

    it('should handle exactly 4 transactions', () => {
      const transactions = [
        mockTransaction(50),
        mockTransaction(55),
        mockTransaction(60),
        mockTransaction(500), // Outlier
      ];

      const { filtered, outliers } = removeOutliers(transactions);

      // With 4+ samples, IQR kicks in
      expect(outliers.length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const { filtered, outliers } = removeOutliers([]);

      expect(filtered.length).toBe(0);
      expect(outliers.length).toBe(0);
    });

    it('should handle single transaction', () => {
      const transactions = [mockTransaction(100)];

      const { filtered, outliers } = removeOutliers(transactions);

      expect(filtered.length).toBe(1);
      expect(outliers.length).toBe(0);
    });

    it('should handle all same values', () => {
      const transactions = [
        mockTransaction(100),
        mockTransaction(100),
        mockTransaction(100),
        mockTransaction(100),
        mockTransaction(100),
      ];

      const { outliers } = removeOutliers(transactions);

      // All same values means IQR = 0, no outliers
      expect(outliers.length).toBe(0);
    });
  });
});
