/**
 * Weight calculation for transaction data
 * 
 * Combines three weight components:
 * 1. Recency weight: Recent sales weighted higher (exponential decay)
 * 2. Volume weight: Single-card sales weighted higher than bulk
 * 3. Quality weight: Verified sales weighted higher than active listings
 */

import type { TransactionData, WeightedTransaction } from './types';
import { daysBetween } from './utils';

/**
 * Calculate weights for each transaction
 * 
 * Combined weight = recency_weight × volume_weight × quality_weight
 * 
 * @param transactions - Array of transaction data
 * @param referenceDate - Date to calculate recency from (default: now)
 * @returns Transactions with weight metadata
 */
export function calculateWeights(
  transactions: TransactionData[],
  referenceDate: Date = new Date()
): WeightedTransaction[] {
  return transactions.map((t) => {
    // 1. Recency weight (exponential decay, 30-day half-life)
    const daysAgo = daysBetween(t.sold_date, referenceDate);
    const recencyWeight = Math.exp(-daysAgo / 30);

    // 2. Volume weight (prefer single-card sales)
    // Use exponential decay: single card = 1.0, bulk sales weighted down
    const volumeWeight = Math.exp(-0.1 * (t.quantity - 1));

    // 3. Quality weight
    const sourceWeight = t.is_verified_sale ? 1.0 : 0.3;
    
    // Check if listing has grading info
    const hasGradingInfo = t.grading_company && t.grade;
    const gradingWeight = hasGradingInfo ? 1.0 : 0.7;
    
    const qualityWeight = sourceWeight * gradingWeight;

    // Combined weight
    const weight = recencyWeight * volumeWeight * qualityWeight;

    return {
      ...t,
      weight,
      recency_weight: recencyWeight,
      volume_weight: volumeWeight,
      quality_weight: qualityWeight,
    };
  });
}

/**
 * Calculate recency weight for a single transaction
 * 
 * Uses exponential decay with 30-day half-life:
 * - Today: 1.00
 * - 30 days ago: 0.37
 * - 60 days ago: 0.14
 * - 90 days ago: 0.05
 * 
 * @param soldDate - Transaction date
 * @param referenceDate - Reference date (default: now)
 * @returns Recency weight (0-1)
 */
export function calculateRecencyWeight(
  soldDate: Date,
  referenceDate: Date = new Date()
): number {
  const daysAgo = daysBetween(soldDate, referenceDate);
  return Math.exp(-daysAgo / 30); // 30-day half-life
}

/**
 * Calculate volume weight for a single transaction
 * 
 * Single-card sales have weight 1.0
 * Bulk sales (quantity > 1) have weight < 1.0
 * Uses exponential decay to heavily downweight large bulk sales
 * 
 * Examples:
 * - quantity=1: weight=1.0 (100%)
 * - quantity=5: weight=0.67 (67%)
 * - quantity=10: weight=0.41 (41%)
 * - quantity=50: weight=0.007 (0.7%)
 * 
 * @param quantity - Number of cards in transaction
 * @returns Volume weight (0-1)
 */
export function calculateVolumeWeight(quantity: number): number {
  // Exponential decay formula: e^(-0.1 * (quantity - 1))
  return Math.exp(-0.1 * (quantity - 1));
}

/**
 * Calculate quality weight for a single transaction
 * 
 * Factors:
 * - Source: Sold (1.0) vs Active (0.3)
 * - Grading info: Has grading (1.0) vs No grading (0.7)
 * 
 * @param isVerifiedSale - True if sold listing
 * @param hasGradingInfo - True if listing has clear grading info
 * @returns Quality weight (0-1)
 */
export function calculateQualityWeight(
  isVerifiedSale: boolean,
  hasGradingInfo: boolean
): number {
  const sourceWeight = isVerifiedSale ? 1.0 : 0.3;
  const gradingWeight = hasGradingInfo ? 1.0 : 0.7;
  return sourceWeight * gradingWeight;
}
