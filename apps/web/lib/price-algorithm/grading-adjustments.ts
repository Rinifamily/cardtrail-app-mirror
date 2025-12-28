/**
 * Grading adjustments and price estimation
 * 
 * When a card has insufficient data for a specific grade,
 * estimate price based on other grades using multipliers.
 */

import type { GradeType, CTPriceResult } from './types';
import { calculateCTPrice } from './calculate-ct-price';

/**
 * Grade multipliers (relative to PSA 10)
 * 
 * These multipliers are based on historical market data
 * and should be updated quarterly.
 */
const GRADE_MULTIPLIERS: Record<GradeType, number> = {
  // PSA grades
  psa10: 1.0, // Baseline
  psa9: 0.6, // 60% of PSA 10
  psa8: 0.4, // 40% of PSA 10
  psa7: 0.25,
  
  // BGS grades
  bgs10: 1.2, // BGS 10 Black Label premium
  bgs9_5: 0.9,
  bgs9: 0.58,
  
  // CGC grades
  cgc10: 0.95,
  cgc9_5: 0.85,
  
  // SGC grades (slightly lower premiums than PSA)
  sgc10: 0.92, // 92% of PSA 10
  sgc9_5: 0.75, // 75% of PSA 10
  sgc9: 0.55, // 55% of PSA 10
  sgc8_5: 0.42, // 42% of PSA 10
  sgc8: 0.35, // 35% of PSA 10
  
  // Raw/Ungraded
  raw: 0.3, // 30% of PSA 10 (ungraded)
};

/**
 * Estimate price for target grade based on known grade
 * 
 * @param basePriceGrade - Grade with known price
 * @param basePrice - Known price
 * @param targetGrade - Grade to estimate
 * @returns Estimated price
 */
export function estimatePriceByGrade(
  basePriceGrade: GradeType,
  basePrice: number,
  targetGrade: GradeType
): number {
  const baseMultiplier = GRADE_MULTIPLIERS[basePriceGrade] || 1.0;
  const targetMultiplier = GRADE_MULTIPLIERS[targetGrade] || 1.0;

  return basePrice * (targetMultiplier / baseMultiplier);
}

/**
 * Calculate price with fallback to estimated price
 * 
 * If no data for target grade, estimate from PSA 10/9/8 in that order.
 * 
 * @param card_id - Card ID
 * @param targetGrade - Target grade
 * @returns CT Price result (may be estimated)
 */
export async function calculatePriceWithFallback(
  card_id: number,
  targetGrade: GradeType
): Promise<CTPriceResult> {
  // Try to calculate for target grade
  const result = await calculateCTPrice({ card_id, grade: targetGrade });

  // If sufficient data, return it
  if (result.price !== null && result.sample_size >= 5) {
    return result;
  }

  console.log(
    `[Grading Adjustment] Insufficient data for ${targetGrade}, trying fallback`
  );

  // Fallback order: PSA 10 → PSA 9 → PSA 8 → SGC 10
  const fallbackGrades: GradeType[] = ['psa10', 'psa9', 'psa8', 'sgc10'];

  for (const fallbackGrade of fallbackGrades) {
    if (fallbackGrade === targetGrade) continue;

    const fallbackResult = await calculateCTPrice({
      card_id,
      grade: fallbackGrade,
    });

    if (fallbackResult.price !== null && fallbackResult.sample_size >= 5) {
      const estimatedPrice = estimatePriceByGrade(
        fallbackGrade,
        fallbackResult.price,
        targetGrade
      );

      console.log(
        `[Grading Adjustment] Estimated ${targetGrade} price from ${fallbackGrade}: ${estimatedPrice.toFixed(2)}`
      );

      return {
        ...fallbackResult,
        price: Math.round(estimatedPrice * 100) / 100,
        is_estimated: true,
        estimated_from: fallbackGrade,
        confidence: 'low', // Always low confidence for estimates
        message: `Estimated from ${fallbackGrade.toUpperCase()} price`,
      };
    }
  }

  // No fallback found
  return result;
}

/**
 * Get grade multiplier for a specific grade
 * 
 * @param grade - Grade type
 * @returns Multiplier relative to PSA 10
 */
export function getGradeMultiplier(grade: GradeType): number {
  return GRADE_MULTIPLIERS[grade] || 1.0;
}

/**
 * Calculate price for all common grades
 * 
 * @param card_id - Card ID
 * @returns Map of grade to price result
 */
export async function calculateAllGrades(
  card_id: number
): Promise<Record<string, CTPriceResult>> {
  const grades: GradeType[] = ['raw', 'psa8', 'psa9', 'psa10', 'sgc9', 'sgc10'];
  const results: Record<string, CTPriceResult> = {};

  for (const grade of grades) {
    results[grade] = await calculatePriceWithFallback(card_id, grade);
  }

  return results;
}
