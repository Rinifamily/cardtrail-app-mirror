/**
 * Unit tests for grading adjustments
 */

import { describe, it, expect } from 'vitest';
import { estimatePriceByGrade, getGradeMultiplier } from '../grading-adjustments';
import type { GradeType } from '../types';

describe('Grading Adjustments', () => {
  describe('estimatePriceByGrade', () => {
    it('should estimate PSA 9 from PSA 10', () => {
      const psa10Price = 100;
      const estimatedPsa9 = estimatePriceByGrade('psa10', psa10Price, 'psa9');

      // PSA 9 is 60% of PSA 10
      expect(estimatedPsa9).toBeCloseTo(60, 0);
    });

    it('should estimate PSA 8 from PSA 10', () => {
      const psa10Price = 100;
      const estimatedPsa8 = estimatePriceByGrade('psa10', psa10Price, 'psa8');

      // PSA 8 is 40% of PSA 10
      expect(estimatedPsa8).toBeCloseTo(40, 0);
    });

    it('should estimate raw from PSA 10', () => {
      const psa10Price = 100;
      const estimatedRaw = estimatePriceByGrade('psa10', psa10Price, 'raw');

      // Raw is 30% of PSA 10
      expect(estimatedRaw).toBeCloseTo(30, 0);
    });

    it('should estimate PSA 10 from PSA 9', () => {
      const psa9Price = 60;
      const estimatedPsa10 = estimatePriceByGrade('psa9', psa9Price, 'psa10');

      // PSA 10 is 1/0.6 of PSA 9
      expect(estimatedPsa10).toBeCloseTo(100, 0);
    });

    it('should handle BGS 10 premium', () => {
      const psa10Price = 100;
      const estimatedBgs10 = estimatePriceByGrade('psa10', psa10Price, 'bgs10');

      // BGS 10 Black Label is 120% of PSA 10
      expect(estimatedBgs10).toBeCloseTo(120, 0);
    });

    it('should handle CGC grades', () => {
      const psa10Price = 100;
      const estimatedCgc10 = estimatePriceByGrade('psa10', psa10Price, 'cgc10');

      // CGC 10 is 95% of PSA 10
      expect(estimatedCgc10).toBeCloseTo(95, 0);
    });

    it('should handle cross-grading company conversion', () => {
      const bgs9Price = 58;
      const estimatedPsa9 = estimatePriceByGrade('bgs9', bgs9Price, 'psa9');

      // BGS 9 is 0.58, PSA 9 is 0.60
      // 58 * (0.60/0.58) ≈ 60
      expect(estimatedPsa9).toBeCloseTo(60, 0);
    });

    it('should handle same grade (identity)', () => {
      const price = 100;
      const estimated = estimatePriceByGrade('psa10', price, 'psa10');

      expect(estimated).toBe(100);
    });
  });

  describe('getGradeMultiplier', () => {
    it('should return 1.0 for PSA 10 (baseline)', () => {
      expect(getGradeMultiplier('psa10')).toBe(1.0);
    });

    it('should return correct multipliers for PSA grades', () => {
      expect(getGradeMultiplier('psa9')).toBe(0.6);
      expect(getGradeMultiplier('psa8')).toBe(0.4);
      expect(getGradeMultiplier('psa7')).toBe(0.25);
    });

    it('should return correct multipliers for BGS grades', () => {
      expect(getGradeMultiplier('bgs10')).toBe(1.2);
      expect(getGradeMultiplier('bgs9_5')).toBe(0.9);
      expect(getGradeMultiplier('bgs9')).toBe(0.58);
    });

    it('should return correct multipliers for CGC grades', () => {
      expect(getGradeMultiplier('cgc10')).toBe(0.95);
      expect(getGradeMultiplier('cgc9_5')).toBe(0.85);
    });

    it('should return correct multiplier for raw', () => {
      expect(getGradeMultiplier('raw')).toBe(0.3);
    });
  });

  describe('Grade Relationships', () => {
    it('should maintain consistent relationships for PSA grades', () => {
      const psaGrades: GradeType[] = ['psa10', 'psa9', 'psa8', 'psa7'];

      // Each PSA grade should be worth less than the previous
      for (let i = 0; i < psaGrades.length - 1; i++) {
        const current = getGradeMultiplier(psaGrades[i]);
        const next = getGradeMultiplier(psaGrades[i + 1]);
        expect(current).toBeGreaterThan(next);
      }

      // Raw should be less than PSA 10 but might be greater than lower PSA grades
      expect(getGradeMultiplier('raw')).toBeLessThan(getGradeMultiplier('psa10'));
    });

    it('should show BGS 10 premium over PSA 10', () => {
      const psa10 = getGradeMultiplier('psa10');
      const bgs10 = getGradeMultiplier('bgs10');

      expect(bgs10).toBeGreaterThan(psa10);
    });

    it('should show PSA premium over CGC for same grade', () => {
      const psa10 = getGradeMultiplier('psa10');
      const cgc10 = getGradeMultiplier('cgc10');

      expect(psa10).toBeGreaterThan(cgc10);
    });
  });

  describe('Real-world Price Scenarios', () => {
    it('should estimate realistic PSA 9 from $1000 PSA 10', () => {
      const estimated = estimatePriceByGrade('psa10', 1000, 'psa9');
      expect(estimated).toBe(600);
    });

    it('should estimate realistic raw from $500 PSA 10', () => {
      const estimated = estimatePriceByGrade('psa10', 500, 'raw');
      expect(estimated).toBe(150);
    });

    it('should handle expensive cards', () => {
      const psa10Price = 10000;
      const estimatedPsa9 = estimatePriceByGrade('psa10', psa10Price, 'psa9');

      expect(estimatedPsa9).toBe(6000);
    });

    it('should handle cheap cards', () => {
      const psa10Price = 10;
      const estimatedRaw = estimatePriceByGrade('psa10', psa10Price, 'raw');

      expect(estimatedRaw).toBe(3);
    });
  });
});
