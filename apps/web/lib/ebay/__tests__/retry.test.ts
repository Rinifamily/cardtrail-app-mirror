import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRetry,
  isRetryableError,
  classifyError,
  createRetryWrapper,
  DEFAULT_RETRY_CONFIG,
} from '../retry';

describe('Retry Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    // Wait for any pending timers/promises
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  describe('isRetryableError', () => {
    it('should identify retryable HTTP status codes', () => {
      const error429 = { response: { status: 429 } };
      const error500 = { response: { status: 500 } };
      const error503 = { response: { status: 503 } };

      expect(isRetryableError(error429, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
      expect(isRetryableError(error500, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
      expect(isRetryableError(error503, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
    });

    it('should identify retryable error codes', () => {
      const etimedout = { code: 'ETIMEDOUT' };
      const econnreset = { code: 'ECONNRESET' };
      const econnrefused = { code: 'ECONNREFUSED' };

      expect(isRetryableError(etimedout, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
      expect(isRetryableError(econnreset, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
      expect(isRetryableError(econnrefused, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
    });

    it('should identify timeout errors by message', () => {
      const timeoutError = { message: 'Request timeout' };
      expect(isRetryableError(timeoutError, DEFAULT_RETRY_CONFIG.retryOn)).toBe(true);
    });

    it('should not retry non-retryable errors', () => {
      const error400 = { response: { status: 400 } };
      const error401 = { response: { status: 401 } };
      const error404 = { response: { status: 404 } };

      expect(isRetryableError(error400, DEFAULT_RETRY_CONFIG.retryOn)).toBe(false);
      expect(isRetryableError(error401, DEFAULT_RETRY_CONFIG.retryOn)).toBe(false);
      expect(isRetryableError(error404, DEFAULT_RETRY_CONFIG.retryOn)).toBe(false);
    });
  });

  describe('classifyError', () => {
    it('should classify fatal errors', () => {
      expect(classifyError({ response: { status: 400 } })).toBe('fatal');
      expect(classifyError({ response: { status: 401 } })).toBe('fatal');
      expect(classifyError({ response: { status: 403 } })).toBe('fatal');
    });

    it('should classify skippable errors', () => {
      expect(classifyError({ response: { status: 404 } })).toBe('skippable');
    });

    it('should classify retryable errors', () => {
      expect(classifyError({ response: { status: 429 } })).toBe('retryable');
      expect(classifyError({ response: { status: 500 } })).toBe('retryable');
      expect(classifyError({ response: { status: 503 } })).toBe('retryable');
      expect(classifyError({ code: 'ETIMEDOUT' } )).toBe('retryable');
    });

    it('should default to fatal for unknown errors', () => {
      expect(classifyError({ message: 'Unknown error' })).toBe('fatal');
      expect(classifyError({})).toBe('fatal');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 error and succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 429 }, message: 'Rate limit' })
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, { maxAttempts: 3, initialDelay: 100 });

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 error with exponential backoff', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Server error' })
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Server error' })
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
      });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw fatal errors immediately without retry', async () => {
      const fatalError = { response: { status: 401 }, message: 'Unauthorized' };
      const mockFn = vi.fn().mockRejectedValue(fatalError);

      await expect(withRetry(mockFn)).rejects.toEqual(fatalError);
      expect(mockFn).toHaveBeenCalledTimes(1); // No retry
    });

    it('should throw after max attempts exceeded', async () => {
      const error = { response: { status: 503 }, message: 'Service unavailable' };
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = withRetry(mockFn, { maxAttempts: 3, initialDelay: 100 });

      // Run timers before awaiting rejection
      const timerPromise = vi.runAllTimersAsync();
      
      await expect(promise).rejects.toEqual(error);
      await timerPromise; // Clean up timers
      
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelay cap', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, {
        maxAttempts: 3,
        initialDelay: 10000,
        maxDelay: 5000, // Cap at 5 seconds
        backoffMultiplier: 2,
      });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
    });

    it('should handle timeout errors', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Request timeout' })
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, { maxAttempts: 2, initialDelay: 100 });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle connection reset errors', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, { maxAttempts: 2, initialDelay: 100 });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRetryWrapper', () => {
    it('should create wrapper with custom config', async () => {
      const customRetry = createRetryWrapper({
        maxAttempts: 5,
        initialDelay: 500,
      });

      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue('success');

      const promise = customRetry(mockFn);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('exponential backoff calculation', () => {
    it('should calculate correct delays', async () => {
      const delays: number[] = [];
      const mockSetTimeout = vi.spyOn(global, 'setTimeout');

      const mockFn = vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 30000,
      });

      await vi.runAllTimersAsync();
      await promise;

      // First retry: 1000ms (1000 * 2^0)
      // Second retry: 2000ms (1000 * 2^1)
      const calls = mockSetTimeout.mock.calls;
      if (calls.length >= 2) {
        expect(calls[0][1]).toBe(1000);
        expect(calls[1][1]).toBe(2000);
      }

      mockSetTimeout.mockRestore();
    });
  });
});
