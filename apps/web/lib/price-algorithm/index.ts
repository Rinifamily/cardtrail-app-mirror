/**
 * CT Price Algorithm - Main exports
 * 
 * CardTrail's proprietary price calculation algorithm
 * that transforms raw eBay transaction data into reliable,
 * weighted market prices.
 */

// Main calculation function
export { calculateCTPrice } from './calculate-ct-price';

// Grading adjustments
export {
  calculatePriceWithFallback,
  estimatePriceByGrade,
  getGradeMultiplier,
  calculateAllGrades,
} from './grading-adjustments';

// Caching
export {
  getCachedPrice,
  cachePrice,
  invalidatePriceCache,
  invalidateGradeCache,
  getCacheStats,
} from './cache';

// Price history storage
export { storePriceHistory, getPriceHistory } from './store-price-history';

// Utility functions (for testing)
export {
  percentile,
  daysBetween,
  standardDeviation,
  isValidPrice,
  roundTo,
} from './utils';

// Component functions (for testing)
export { removeOutliers } from './outlier-removal';
export {
  calculateWeights,
  calculateRecencyWeight,
  calculateVolumeWeight,
  calculateQualityWeight,
} from './weight-calculation';
export { determineConfidence } from './confidence-determination';

// Types
export type {
  CTPriceParams,
  CTPriceResult,
  TransactionData,
  WeightedTransaction,
  GradeType,
  LanguageCode,
  ConfidenceLevel,
  OutlierDetectionResult,
} from './types';
