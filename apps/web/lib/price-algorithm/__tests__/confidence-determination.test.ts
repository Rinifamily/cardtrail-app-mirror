/**
 * Unit tests for confidence level determination
 */

import { describe, it, expect } from 'vitest';
import { determineConfidence } from '../confidence-determination';

describe('Confidence Determination', () => {
  describe('High Confidence', () => {
    it('should return high for ideal conditions', () => {
      const confidence = determineConfidence(15, 8, 10);
      expect(confidence).toBe('high');
    });

    it('should require ≥10 samples', () => {
      const confidence = determineConfidence(9, 8, 10);
      expect(confidence).not.toBe('high');
    });

    it('should require ≥5 weighted sample size', () => {
      const confidence = determineConfidence(15, 4.5, 10);
      expect(confidence).not.toBe('high');
    });

    it('should require ≤30 days since last sale', () => {
      const confidence = determineConfidence(15, 8, 31);
      expect(confidence).not.toBe('high');
    });

    it('should handle boundary values', () => {
      expect(determineConfidence(10, 5, 30)).toBe('high');
      expect(determineConfidence(9, 5, 30)).not.toBe('high');
      expect(determineConfidence(10, 4.9, 30)).not.toBe('high');
      expect(determineConfidence(10, 5, 31)).not.toBe('high');
    });
  });

  describe('Medium Confidence', () => {
    it('should return medium for moderate conditions', () => {
      const confidence = determineConfidence(7, 3, 45);
      expect(confidence).toBe('medium');
    });

    it('should require ≥5 samples', () => {
      const confidence = determineConfidence(4, 3, 45);
      expect(confidence).not.toBe('medium');
    });

    it('should require ≥2 weighted sample size', () => {
      const confidence = determineConfidence(7, 1.5, 45);
      expect(confidence).not.toBe('medium');
    });

    it('should require ≤60 days since last sale', () => {
      const confidence = determineConfidence(7, 3, 61);
      expect(confidence).not.toBe('medium');
    });

    it('should handle boundary values', () => {
      expect(determineConfidence(5, 2, 60)).toBe('medium');
      expect(determineConfidence(4, 2, 60)).not.toBe('medium');
      expect(determineConfidence(5, 1.9, 60)).not.toBe('medium');
      expect(determineConfidence(5, 2, 61)).not.toBe('medium');
    });
  });

  describe('Low Confidence', () => {
    it('should return low for insufficient samples', () => {
      const confidence = determineConfidence(2, 1, 80);
      expect(confidence).toBe('low');
    });

    it('should return low for low weighted sample size', () => {
      const confidence = determineConfidence(10, 1, 10);
      expect(confidence).toBe('low');
    });

    it('should return low for stale data', () => {
      const confidence = determineConfidence(10, 5, 70);
      expect(confidence).toBe('low');
    });

    it('should return low for edge cases', () => {
      expect(determineConfidence(0, 0, 100)).toBe('low');
      expect(determineConfidence(1, 0.5, 90)).toBe('low');
    });
  });

  describe('Priority Order', () => {
    it('should prioritize high over medium', () => {
      // Meets high confidence criteria
      expect(determineConfidence(10, 5, 30)).toBe('high');
    });

    it('should return medium if high criteria not met', () => {
      // Meets medium but not high
      expect(determineConfidence(8, 3, 45)).toBe('medium');
    });

    it('should return low if neither high nor medium met', () => {
      // Meets neither
      expect(determineConfidence(3, 1, 70)).toBe('low');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle popular card (lots of recent sales)', () => {
      const confidence = determineConfidence(50, 25, 5);
      expect(confidence).toBe('high');
    });

    it('should handle moderately popular card', () => {
      const confidence = determineConfidence(8, 4, 20);
      expect(confidence).toBe('medium'); // 8 samples < 10, so not high
    });

    it('should handle less popular card', () => {
      const confidence = determineConfidence(5, 2.5, 40);
      expect(confidence).toBe('medium');
    });

    it('should handle rare card with few sales', () => {
      const confidence = determineConfidence(3, 1.2, 50);
      expect(confidence).toBe('low');
    });

    it('should handle old data', () => {
      const confidence = determineConfidence(10, 3, 90);
      expect(confidence).toBe('low');
    });
  });
});
