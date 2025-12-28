/**
 * Confidence level determination based on data quality
 */

import type { ConfidenceLevel } from './types';

/**
 * Determine confidence level based on data quality
 * 
 * Confidence Levels:
 * - High: ≥10 samples, ≥5 weighted sum, ≤30 days since last sale
 * - Medium: ≥5 samples, ≥2 weighted sum, ≤60 days since last sale
 * - Low: Insufficient data or stale data
 * 
 * @param sampleSize - Number of transactions
 * @param weightedSampleSize - Sum of all weights
 * @param daysSinceLastSale - Days since most recent transaction
 * @returns Confidence level
 */
export function determineConfidence(
  sampleSize: number,
  weightedSampleSize: number,
  daysSinceLastSale: number
): ConfidenceLevel {
  // High confidence: lots of recent data
  if (
    sampleSize >= 10 &&
    weightedSampleSize >= 5 &&
    daysSinceLastSale <= 30
  ) {
    return 'high';
  }

  // Medium confidence: moderate data
  if (
    sampleSize >= 5 &&
    weightedSampleSize >= 2 &&
    daysSinceLastSale <= 60
  ) {
    return 'medium';
  }

  // Low confidence: sparse or stale data
  return 'low';
}
