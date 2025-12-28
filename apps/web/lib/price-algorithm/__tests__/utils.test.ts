/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  percentile,
  daysBetween,
  standardDeviation,
  isValidPrice,
  roundTo,
} from '../utils';

describe('Utils', () => {
  describe('percentile', () => {
    it('should calculate 25th percentile correctly', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8];
      expect(percentile(sorted, 25)).toBeCloseTo(2.75, 2);
    });

    it('should calculate 50th percentile (median) correctly', () => {
      const sorted = [1, 2, 3, 4, 5];
      expect(percentile(sorted, 50)).toBe(3);
    });

    it('should calculate 75th percentile correctly', () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8];
      expect(percentile(sorted, 75)).toBeCloseTo(6.25, 2);
    });

    it('should handle single element array', () => {
      expect(percentile([5], 50)).toBe(5);
    });

    it('should handle empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('should handle edge percentiles', () => {
      const sorted = [1, 2, 3, 4, 5];
      expect(percentile(sorted, 0)).toBe(1);
      expect(percentile(sorted, 100)).toBe(5);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-11');
      expect(daysBetween(date1, date2)).toBe(10);
    });

    it('should handle reverse order', () => {
      const date1 = new Date('2024-01-11');
      const date2 = new Date('2024-01-01');
      expect(daysBetween(date1, date2)).toBe(10);
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-01');
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should handle dates in different months', () => {
      const date1 = new Date('2024-01-31');
      const date2 = new Date('2024-02-01');
      expect(daysBetween(date1, date2)).toBe(1);
    });
  });

  describe('standardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const stdDev = standardDeviation(values);
      expect(stdDev).toBeCloseTo(2, 0);
    });

    it('should return 0 for single value', () => {
      expect(standardDeviation([5])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(standardDeviation([])).toBe(0);
    });

    it('should handle uniform values', () => {
      const values = [5, 5, 5, 5, 5];
      expect(standardDeviation(values)).toBe(0);
    });
  });

  describe('isValidPrice', () => {
    it('should accept valid prices', () => {
      expect(isValidPrice(1)).toBe(true);
      expect(isValidPrice(100)).toBe(true);
      expect(isValidPrice(50000)).toBe(true);
    });

    it('should reject zero', () => {
      expect(isValidPrice(0)).toBe(false);
    });

    it('should reject negative prices', () => {
      expect(isValidPrice(-10)).toBe(false);
    });

    it('should reject extremely high prices', () => {
      expect(isValidPrice(100001)).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(isValidPrice(0.01)).toBe(true);
      expect(isValidPrice(99999)).toBe(true);
    });
  });

  describe('roundTo', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundTo(3.14159)).toBe(3.14);
      expect(roundTo(2.999)).toBe(3.0);
    });

    it('should round to specified decimal places', () => {
      expect(roundTo(3.14159, 0)).toBe(3);
      expect(roundTo(3.14159, 1)).toBe(3.1);
      expect(roundTo(3.14159, 3)).toBe(3.142);
    });

    it('should handle negative numbers', () => {
      expect(roundTo(-3.14159, 2)).toBe(-3.14);
    });

    it('should handle whole numbers', () => {
      expect(roundTo(5, 2)).toBe(5);
    });
  });
});
