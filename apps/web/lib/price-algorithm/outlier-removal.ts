/**
 * Outlier detection and removal using Interquartile Range (IQR) method
 */

import type { TransactionData, OutlierDetectionResult } from './types';
import { percentile } from './utils';

/**
 * Remove outliers using Interquartile Range (IQR) method
 * 
 * IQR Method:
 * - Q1 = 25th percentile
 * - Q3 = 75th percentile
 * - IQR = Q3 - Q1
 * - Lower bound = Q1 - 1.5 × IQR
 * - Upper bound = Q3 + 1.5 × IQR
 * - Outliers are values outside [lower bound, upper bound]
 * 
 * @param transactions - Array of transaction data
 * @returns Filtered transactions and outlier metadata
 */
export function removeOutliers(
  transactions: TransactionData[]
): OutlierDetectionResult {
  // Need at least 4 transactions for IQR to be meaningful
  if (transactions.length < 4) {
    return {
      filtered: transactions,
      outliers: [],
      bounds: { lower: 0, upper: Infinity },
      q1: 0,
      q3: 0,
      iqr: 0,
    };
  }

  // Extract and sort prices
  const prices = transactions.map((t) => t.price).sort((a, b) => a - b);

  // Calculate quartiles
  const q1 = percentile(prices, 25);
  const q3 = percentile(prices, 75);
  const iqr = q3 - q1;

  // Calculate outlier bounds (1.5 × IQR is standard)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Separate inliers from outliers
  const filtered: TransactionData[] = [];
  const outliers: TransactionData[] = [];

  transactions.forEach((t) => {
    if (t.price >= lowerBound && t.price <= upperBound) {
      filtered.push(t);
    } else {
      outliers.push(t);
    }
  });

  console.log(
    `[Outlier Removal] Removed ${outliers.length}/${transactions.length} outliers ` +
      `(bounds: ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`
  );

  if (outliers.length > 0) {
    console.log(
      `[Outlier Removal] Outlier prices: ${outliers.map((o) => o.price.toFixed(2)).join(', ')}`
    );
  }

  return {
    filtered,
    outliers,
    bounds: { lower: lowerBound, upper: upperBound },
    q1,
    q3,
    iqr,
  };
}
