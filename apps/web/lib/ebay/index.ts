/**
 * eBay API Integration
 * 
 * Provides robust eBay Finding API client with:
 * - Rate limiting (5K/day sandbox, 5M/day production)
 * - Redis caching (24hr TTL)
 * - Automatic retries with exponential backoff
 * - Transaction data parsing and normalization
 * - Comprehensive error handling
 * - Robust currency validation and conversion
 * 
 * @module ebay
 */

// Main client
export { EbayClient, ebayClient } from './client';

// Types
export type {
  EbaySearchParams,
  NormalizedTransaction,
  EbayItem,
  EbaySearchResponse,
  EbayActiveSearchResponse,
} from './types';

// Error classes
export {
  EbayAPIError,
  EbayRateLimitError,
  EbayParseError,
  EbayConfigError,
} from './errors';

// Parser utilities (useful for custom parsing)
export {
  extractGradingCompany,
  extractGrade,
  detectLanguage,
  extractQuantity,
  parseEbayItem,
  parseEbayItems,
  validateTransaction,
} from './parsers';

// Rate limiter utilities
export {
  rateLimited,
  getRateLimiterStatus,
} from './rate-limiter';

// Cache utilities
export {
  getCacheKey,
  getCachedResponse,
  setCachedResponse,
  invalidateCache,
  invalidateAllCaches,
  getCacheStats,
} from './cache';

// Retry utilities
export {
  withRetry,
  createRetryWrapper,
  isRetryableError,
  classifyError,
  DEFAULT_RETRY_CONFIG,
} from './retry';
export type { RetryConfig } from './retry';

// Currency utilities
export {
  validateCurrency,
  convertToUSD,
  extractCurrency,
  parsePrice,
  needsConversion,
  SUPPORTED_CURRENCIES,
  CURRENCY_TO_USD_RATES,
} from './currency';
export type { SupportedCurrency } from './currency';

// Logger utilities
export { ebayLogger, getErrorContext } from './logger';
