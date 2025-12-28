import Bottleneck from 'bottleneck';
import { ebayLogger } from './logger';

// Determine environment
const isSandbox = process.env.EBAY_ENVIRONMENT === 'SANDBOX' || !process.env.EBAY_ENVIRONMENT;

// Rate limits based on eBay documentation
const SANDBOX_DAILY_LIMIT = 5000;
const PRODUCTION_DAILY_LIMIT = 5_000_000;
const dailyLimit = isSandbox ? SANDBOX_DAILY_LIMIT : PRODUCTION_DAILY_LIMIT;

// Calculate calls per minute (leave 10% buffer for safety)
const callsPerMinute = Math.floor((dailyLimit / 1440) * 0.9);

/**
 * eBay API Rate Limiter
 * 
 * Uses Bottleneck library to enforce rate limits:
 * - Sandbox:    5,000 calls/day  (~3 calls/min)
 * - Production: 5M calls/day     (~3,500 calls/min)
 * 
 * Strategy:
 * - Reservoir pattern: Daily quota refresh at midnight UTC
 * - Max 5 concurrent requests to prevent overwhelming eBay
 * - Min 200ms spacing between requests to prevent burst
 * - Automatic retry on 429 (rate limit) and 503 (service unavailable)
 */
export const ebayRateLimiter = new Bottleneck({
  // Reservoir: Total tokens available for the day
  reservoir: dailyLimit,
  
  // Refresh reservoir daily (24 hours in milliseconds)
  reservoirRefreshAmount: dailyLimit,
  reservoirRefreshInterval: 24 * 60 * 60 * 1000,
  
  // Max concurrent requests
  maxConcurrent: 5,
  
  // Min time between requests (prevent burst)
  // 200ms = max 5 req/sec
  minTime: 200,
  
  // Enable automatic retries
  // The `failed` event handler will determine if/when to retry
  retryAttempts: 3,
  
  // Tracking
  trackDoneStatus: true,
});

/**
 * Event listener for failed jobs
 * Implements exponential backoff retry logic
 * 
 * CRITICAL: Handles both Axios errors and custom error classes
 */
ebayRateLimiter.on('failed', async (error: any, jobInfo: any) => {
  const retryCount = jobInfo.retryCount || 0;
  const maxRetries = 3;

  // Stop retrying after max attempts
  if (retryCount >= maxRetries) {
    ebayLogger.error('Max retries exceeded', { 
      maxRetries, 
      error: error.message,
      statusCode: error?.statusCode || error?.response?.status
    });
    return undefined;
  }

  // Extract status code from either custom errors or Axios errors
  // Custom errors (EbayRateLimitError, EbayAPIError) have statusCode property
  // Axios errors have response.status property
  const statusCode = error?.statusCode || error?.response?.status;
  
  // Retry on rate limit (429) or server error (503)
  const retryableStatuses = [429, 503];
  if (statusCode && retryableStatuses.includes(statusCode)) {
    // Exponential backoff: 1s, 2s, 4s (capped at 10s)
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    ebayLogger.warn('Rate limiter retrying request', {
      statusCode,
      retryCount: retryCount + 1,
      maxRetries,
      retryDelay,
      error: error.message || 'Unknown error'
    });
    return retryDelay;
  }
  
  // Don't retry other errors (400, 401, 404, etc.)
  ebayLogger.debug('Non-retryable error detected', {
    statusCode: statusCode || 'unknown',
    error: error.message
  });
  return undefined;
});

/**
 * Event listener for quota depletion
 */
ebayRateLimiter.on('depleted', () => {
  ebayLogger.error('Daily quota depleted', {
    environment: isSandbox ? 'SANDBOX' : 'PRODUCTION',
    dailyLimit,
    message: 'No more requests until reset'
  });
  // TODO: Send alert to monitoring service (Sentry, etc.)
});

/**
 * Event listener for general errors
 */
ebayRateLimiter.on('error', (error: Error) => {
  ebayLogger.error('Rate limiter error', {
    error: error.message,
    stack: error.stack
  });
});

/**
 * Event listener for successful jobs (optional monitoring)
 */
ebayRateLimiter.on('done', (info: any) => {
  if (info.retryCount > 0) {
    ebayLogger.info('Job succeeded after retries', {
      retryCount: info.retryCount
    });
  }
});

/**
 * Wrap async function with rate limiting
 * 
 * @param fn - Async function to rate limit
 * @returns Promise with function result
 */
export async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  return ebayRateLimiter.schedule(fn);
}

/**
 * Get current rate limiter status
 * Useful for monitoring and debugging
 */
export function getRateLimiterStatus() {
  const counts = ebayRateLimiter.counts();
  return {
    running: counts.RUNNING,
    queued: counts.QUEUED,
    environment: isSandbox ? 'SANDBOX' : 'PRODUCTION',
    dailyLimit,
    callsPerMinute,
  };
}
