/**
 * Retry utility with exponential backoff
 * 
 * Implements automatic retry logic for transient errors with configurable backoff strategy.
 * Used by eBay API client to handle rate limits, network issues, and temporary service failures.
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;        // Maximum number of retry attempts
  initialDelay: number;       // Initial delay in milliseconds
  maxDelay: number;           // Maximum delay in milliseconds
  backoffMultiplier: number;  // Exponential backoff multiplier
  retryOn: (string | number)[]; // HTTP status codes or error codes to retry on
}

/**
 * Default retry configuration for eBay API
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,    // Double delay each time
  retryOn: [429, 500, 503, 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'],
};

/**
 * Check if an error is retryable based on configuration
 * 
 * @param error - Error to check
 * @param retryOn - List of retryable error codes
 * @returns true if error should trigger a retry
 */
export function isRetryableError(
  error: any,
  retryOn: (string | number)[]
): boolean {
  // Check HTTP status codes
  if (error?.response?.status) {
    const status = error.response.status;
    if (retryOn.includes(status)) {
      return true;
    }
  }

  // Check axios error codes (ETIMEDOUT, ECONNRESET, etc.)
  if (error?.code && typeof error.code === 'string') {
    if (retryOn.includes(error.code)) {
      return true;
    }
  }

  // Check for timeout errors
  if (error?.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Classify error type for better handling
 * 
 * @param error - Error to classify
 * @returns Error classification
 */
export function classifyError(error: any): 'retryable' | 'fatal' | 'skippable' {
  // Fatal errors (don't retry)
  const fatalStatuses = [400, 401, 403]; // Bad request, unauthorized, forbidden
  if (error?.response?.status && fatalStatuses.includes(error.response.status)) {
    return 'fatal';
  }

  // Skippable errors (log and continue)
  const skippableStatuses = [404]; // Not found
  if (error?.response?.status && skippableStatuses.includes(error.response.status)) {
    return 'skippable';
  }

  // Retryable errors
  if (isRetryableError(error, DEFAULT_RETRY_CONFIG.retryOn)) {
    return 'retryable';
  }

  // Default to fatal for unknown errors
  return 'fatal';
}

/**
 * Sleep utility for delays
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic and exponential backoff
 * 
 * Automatically retries transient errors (429, 500, 503, timeouts) with exponential backoff.
 * Fatal errors (401, 403) are thrown immediately without retry.
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration (optional, uses defaults)
 * @returns Promise with function result
 * @throws Last error if all retries exhausted
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => axios.get('https://api.ebay.com/...'),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let attemptNumber = 0;

  for (attemptNumber = 1; attemptNumber <= finalConfig.maxAttempts; attemptNumber++) {
    try {
      // Attempt to execute function
      const result = await fn();
      
      // Log successful retry if this wasn't the first attempt
      if (attemptNumber > 1) {
        console.log(`[Retry] Success on attempt ${attemptNumber}/${finalConfig.maxAttempts}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;

      // Classify error type
      const errorType = classifyError(error);

      // Fatal errors: throw immediately without retry
      if (errorType === 'fatal') {
        console.error(`[Retry] Fatal error, not retrying:`, error);
        throw error;
      }

      // Skippable errors: log and throw (caller can handle)
      if (errorType === 'skippable') {
        console.warn(`[Retry] Skippable error:`, error);
        throw error;
      }

      // Retryable errors: log and continue if attempts remain
      if (attemptNumber < finalConfig.maxAttempts) {
        // Calculate exponential backoff delay
        const delay = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attemptNumber - 1),
          finalConfig.maxDelay
        );

        const statusCode = (error as any)?.response?.status || 'unknown';
        console.warn(
          `[Retry] Attempt ${attemptNumber}/${finalConfig.maxAttempts} failed (status: ${statusCode}). ` +
          `Retrying in ${delay}ms... Error: ${(error as Error).message}`
        );

        await sleep(delay);
      } else {
        // All retries exhausted
        console.error(
          `[Retry] All ${finalConfig.maxAttempts} attempts failed. ` +
          `Last error: ${(error as Error).message}`
        );
      }
    }
  }

  // All retries exhausted, throw last error
  throw lastError;
}

/**
 * Create a retry wrapper with custom configuration
 * 
 * Useful for creating domain-specific retry functions with preset configurations.
 * 
 * @param config - Custom retry configuration
 * @returns Retry function with bound configuration
 * 
 * @example
 * ```typescript
 * const retryForEbay = createRetryWrapper({
 *   maxAttempts: 5,
 *   initialDelay: 2000
 * });
 * 
 * const result = await retryForEbay(() => ebayClient.search(...));
 * ```
 */
export function createRetryWrapper(
  config: Partial<RetryConfig>
): <T>(fn: () => Promise<T>) => Promise<T> {
  return <T>(fn: () => Promise<T>) => withRetry(fn, config);
}
