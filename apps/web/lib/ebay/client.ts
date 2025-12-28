import axios, { AxiosError } from 'axios';
import type {
  EbaySearchParams,
  NormalizedTransaction,
} from './types';
import {
  EbaySearchResponseSchema,
  EbayActiveSearchResponseSchema,
} from './types';
import { EbayAPIError, EbayRateLimitError, EbayConfigError } from './errors';
import { rateLimited } from './rate-limiter';
import { getCacheKey, getCachedResponse, setCachedResponse } from './cache';
import { parseEbayItems } from './parsers';
import { withRetry } from './retry';
import { ebayLogger } from './logger';

// eBay Finding API endpoints
const SANDBOX_ENDPOINT = 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1';
const PRODUCTION_ENDPOINT = 'https://svcs.ebay.com/services/search/FindingService/v1';

/**
 * eBay API Client
 * 
 * Features:
 * - Rate limiting via Bottleneck (5K/day sandbox, 5M/day production)
 * - Redis caching with 24hr TTL
 * - Automatic retries (3 attempts with exponential backoff)
 * - Response validation with Zod schemas
 * - Comprehensive error handling
 * - Support for completed and active listings
 */
export class EbayClient {
  private appId: string;
  private baseUrl: string;
  private environment: 'SANDBOX' | 'PRODUCTION';

  constructor() {
    // Validate environment variables
    this.appId = process.env.EBAY_APP_ID || '';
    const envMode = process.env.EBAY_ENVIRONMENT?.toUpperCase();
    
    if (!this.appId) {
      throw new EbayConfigError(
        'EBAY_APP_ID environment variable is required. Please set it in .env.local'
      );
    }

    // Set environment and endpoint
    this.environment = envMode === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
    this.baseUrl = this.environment === 'PRODUCTION' ? PRODUCTION_ENDPOINT : SANDBOX_ENDPOINT;

    ebayLogger.info('eBay Client initialized', {
      environment: this.environment,
      baseUrl: this.baseUrl
    });
  }

  /**
   * Search completed (sold) listings
   * 
   * @param params - Search parameters
   * @returns Array of normalized transactions
   */
  async findCompletedItems(
    params: EbaySearchParams
  ): Promise<NormalizedTransaction[]> {
    const searchParams: EbaySearchParams = {
      ...params,
      soldItemsOnly: true,
      entriesPerPage: params.entriesPerPage || 100, // Default to max
    };

    return this.search('findCompletedItems', searchParams, true);
  }

  /**
   * Search active listings
   * 
   * Used as fallback when sold data is sparse
   * 
   * @param params - Search parameters
   * @returns Array of normalized transactions (marked as not verified sales)
   */
  async findActiveItems(
    params: EbaySearchParams
  ): Promise<NormalizedTransaction[]> {
    const searchParams: EbaySearchParams = {
      ...params,
      entriesPerPage: params.entriesPerPage || 100,
    };

    return this.search('findItemsAdvanced', searchParams, false);
  }

  /**
   * Generic search method
   * 
   * Handles caching, rate limiting, and response parsing
   * 
   * @param operation - eBay API operation name
   * @param params - Search parameters
   * @param isSoldListing - Whether searching for sold items
   * @returns Array of normalized transactions
   */
  private async search(
    operation: 'findCompletedItems' | 'findItemsAdvanced',
    params: EbaySearchParams,
    isSoldListing: boolean
  ): Promise<NormalizedTransaction[]> {
    // Generate cache key
    const cacheKey = getCacheKey({ operation, ...params });

    // Check cache first
    const cached = await getCachedResponse<NormalizedTransaction[]>(cacheKey);
    if (cached) {
      ebayLogger.info('Returning cached results', {
        keywords: params.keywords,
        resultCount: cached.length,
        cacheKey
      });
      return cached;
    }

    // Build query params for eBay API
    const queryParams = this.buildQueryParams(operation, params);

    // Fetch from eBay with rate limiting AND retry logic
    const transactions = await rateLimited(async () => {
      // Wrap API call with retry logic for transient errors
      return withRetry(async () => {
        try {
          ebayLogger.info('Fetching from eBay API', {
            operation,
            keywords: params.keywords,
            entriesPerPage: params.entriesPerPage
          });
          
          const response = await axios.get(this.baseUrl, {
            params: queryParams,
            timeout: 15000, // 15 second timeout
            headers: {
              'Content-Type': 'application/json',
            },
          });

          // Validate response structure based on operation
          let validatedResponse;
          let items;

          if (operation === 'findCompletedItems') {
            validatedResponse = EbaySearchResponseSchema.parse(response.data);
            items = validatedResponse.findCompletedItemsResponse[0]?.searchResult[0]?.item || [];
          } else {
            validatedResponse = EbayActiveSearchResponseSchema.parse(response.data);
            items = validatedResponse.findItemsAdvancedResponse[0]?.searchResult[0]?.item || [];
          }

          // Parse items into normalized transactions
          const parsedTransactions = parseEbayItems(items, isSoldListing);

          ebayLogger.info('eBay API request successful', {
            operation,
            keywords: params.keywords,
            transactionCount: parsedTransactions.length,
            itemsReturned: items.length
          });

          return parsedTransactions;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            const status = axiosError.response?.status;

            // Handle rate limit (will be retried by withRetry)
            if (status === 429) {
              throw new EbayRateLimitError(
                'eBay API rate limit exceeded. Please try again later.'
              );
            }

            // Handle service unavailable (will be retried by withRetry)
            if (status === 503) {
              throw new EbayAPIError(
                'eBay API is temporarily unavailable',
                status,
                axiosError.response?.data
              );
            }

            // Handle other HTTP errors
            throw new EbayAPIError(
              `eBay API request failed: ${axiosError.message}`,
              status,
              axiosError.response?.data
            );
          }

          // Re-throw if not an Axios error
          throw error;
        }
      });
    });

    // Cache successful results
    if (transactions.length > 0) {
      await setCachedResponse(cacheKey, transactions);
    }

    return transactions;
  }

  /**
   * Build eBay API query parameters
   * 
   * Converts our params format to eBay's verbose format
   * 
   * @param operation - eBay operation name
   * @param params - Search parameters
   * @returns Query params object for axios
   */
  private buildQueryParams(
    operation: string,
    params: EbaySearchParams
  ): Record<string, string> {
    const queryParams: Record<string, string> = {
      'OPERATION-NAME': operation,
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      keywords: params.keywords,
    };

    // Add optional params
    if (params.categoryId) {
      queryParams.categoryId = params.categoryId;
    }

    if (params.entriesPerPage) {
      queryParams['paginationInput.entriesPerPage'] = String(params.entriesPerPage);
    }

    if (params.pageNumber) {
      queryParams['paginationInput.pageNumber'] = String(params.pageNumber);
    }

    if (params.sortOrder) {
      queryParams.sortOrder = params.sortOrder;
    }

    // Add soldItemsOnly filter
    if (params.soldItemsOnly !== undefined) {
      queryParams['itemFilter(0).name'] = 'SoldItemsOnly';
      queryParams['itemFilter(0).value'] = String(params.soldItemsOnly);
    }

    // Add custom item filters
    if (params.itemFilter && params.itemFilter.length > 0) {
      const baseIndex = params.soldItemsOnly !== undefined ? 1 : 0;
      
      params.itemFilter.forEach((filter, index) => {
        const filterIndex = baseIndex + index;
        queryParams[`itemFilter(${filterIndex}).name`] = filter.name;
        
        if (Array.isArray(filter.value)) {
          filter.value.forEach((val, valIndex) => {
            queryParams[`itemFilter(${filterIndex}).value(${valIndex})`] = val;
          });
        } else {
          queryParams[`itemFilter(${filterIndex}).value`] = filter.value;
        }
      });
    }

    return queryParams;
  }

  /**
   * Get Pokemon TCG category ID
   */
  static get POKEMON_CATEGORY_ID(): string {
    return '183454'; // Trading Card Singles > Pokemon
  }

  /**
   * Get client environment info
   */
  getEnvironmentInfo() {
    return {
      environment: this.environment,
      baseUrl: this.baseUrl,
      appIdConfigured: !!this.appId,
    };
  }
}

/**
 * Singleton instance
 * 
 * Use this for most operations to share rate limiter and cache
 */
export const ebayClient = new EbayClient();
