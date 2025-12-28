import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Set env vars BEFORE importing client
process.env.EBAY_APP_ID = 'test-app-id';
process.env.EBAY_ENVIRONMENT = 'SANDBOX';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock axios.isAxiosError to return true for our test errors
mockedAxios.isAxiosError = vi.fn((error: any) => {
  return error && error.isAxiosError === true;
});

// Mock cache module
vi.mock('../cache', () => ({
  getCachedResponse: vi.fn(() => Promise.resolve(null)),
  setCachedResponse: vi.fn(() => Promise.resolve()),
  getCacheKey: vi.fn((params) => `test-cache-key-${JSON.stringify(params)}`),
}));

// Mock rate limiter to execute immediately
vi.mock('../rate-limiter', () => ({
  rateLimited: vi.fn((fn) => fn()),
  getRateLimiterStatus: vi.fn(() => ({
    running: 0,
    queued: 0,
    reservoir: 5000,
    environment: 'SANDBOX',
    dailyLimit: 5000,
    callsPerMinute: 3,
  })),
}));

// Import after mocks and env vars are set
import { EbayClient } from '../client';
import { EbayAPIError, EbayRateLimitError } from '../errors';

describe('EbayClient', () => {
  let client: EbayClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EBAY_APP_ID = 'test-app-id';
    process.env.EBAY_ENVIRONMENT = 'SANDBOX';
    client = new EbayClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct environment', () => {
      const info = client.getEnvironmentInfo();
      expect(info.environment).toBe('SANDBOX');
      expect(info.appIdConfigured).toBe(true);
    });

    it('should throw error if EBAY_APP_ID is missing', () => {
      const originalAppId = process.env.EBAY_APP_ID;
      delete process.env.EBAY_APP_ID;
      
      expect(() => new EbayClient()).toThrow('EBAY_APP_ID environment variable is required');
      
      process.env.EBAY_APP_ID = originalAppId;
    });

    it('should default to SANDBOX if environment not specified', () => {
      const originalEnv = process.env.EBAY_ENVIRONMENT;
      delete process.env.EBAY_ENVIRONMENT;
      
      const sandboxClient = new EbayClient();
      const info = sandboxClient.getEnvironmentInfo();
      expect(info.environment).toBe('SANDBOX');
      
      process.env.EBAY_ENVIRONMENT = originalEnv;
    });

    it('should use PRODUCTION when specified', () => {
      const originalEnv = process.env.EBAY_ENVIRONMENT;
      process.env.EBAY_ENVIRONMENT = 'PRODUCTION';
      
      const prodClient = new EbayClient();
      const info = prodClient.getEnvironmentInfo();
      expect(info.environment).toBe('PRODUCTION');
      
      process.env.EBAY_ENVIRONMENT = originalEnv;
    });
  });

  describe('findCompletedItems', () => {
    it('should fetch sold listings successfully', async () => {
      const mockResponse = {
        data: {
          findCompletedItemsResponse: [{
            searchResult: [{
              '@count': '1',
              item: [{
                itemId: ['123456789'],
                title: ['Pikachu PSA 10 Pokemon Card'],
                sellingStatus: [{
                  currentPrice: [{
                    __value__: '150.00',
                    '@currencyId': 'USD'
                  }],
                  sellingState: ['EndedWithSales']
                }],
                listingInfo: [{
                  endTime: ['2024-12-01T12:00:00.000Z']
                }],
                galleryURL: ['https://example.com/image.jpg']
              }]
            }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const results = await client.findCompletedItems({
        keywords: 'Pikachu PSA 10'
      });

      expect(results).toHaveLength(1);
      expect(results[0].ebay_item_id).toBe('123456789');
      expect(results[0].title).toBe('Pikachu PSA 10 Pokemon Card');
      expect(results[0].price_usd).toBe(150);
      expect(results[0].grading_company).toBe('PSA');
      expect(results[0].grade).toBe(10);
      expect(results[0].is_verified_sale).toBe(true);
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          findCompletedItemsResponse: [{
            searchResult: [{
              '@count': '0'
            }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const results = await client.findCompletedItems({
        keywords: 'NonexistentCard'
      });

      expect(results).toHaveLength(0);
    });

    it('should handle multiple results', async () => {
      const mockResponse = {
        data: {
          findCompletedItemsResponse: [{
            searchResult: [{
              '@count': '3',
              item: [
                {
                  itemId: ['111'],
                  title: ['Pikachu PSA 10'],
                  sellingStatus: [{
                    currentPrice: [{ __value__: '150.00', '@currencyId': 'USD' }],
                    sellingState: ['EndedWithSales']
                  }],
                  listingInfo: [{ endTime: ['2024-12-01T12:00:00.000Z'] }]
                },
                {
                  itemId: ['222'],
                  title: ['Charizard BGS 9.5'],
                  sellingStatus: [{
                    currentPrice: [{ __value__: '500.00', '@currencyId': 'USD' }],
                    sellingState: ['EndedWithSales']
                  }],
                  listingInfo: [{ endTime: ['2024-12-02T12:00:00.000Z'] }]
                },
                {
                  itemId: ['333'],
                  title: ['Mew PSA 9'],
                  sellingStatus: [{
                    currentPrice: [{ __value__: '75.00', '@currencyId': 'USD' }],
                    sellingState: ['EndedWithSales']
                  }],
                  listingInfo: [{ endTime: ['2024-12-03T12:00:00.000Z'] }]
                }
              ]
            }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const results = await client.findCompletedItems({
        keywords: 'Pokemon PSA'
      });

      expect(results).toHaveLength(3);
      expect(results[0].ebay_item_id).toBe('111');
      expect(results[1].ebay_item_id).toBe('222');
      expect(results[2].ebay_item_id).toBe('333');
    });

    it('should throw EbayRateLimitError on 429 response', async () => {
      const error = new Error('Request failed with status code 429');
      Object.assign(error, {
        isAxiosError: true,
        response: { status: 429, data: { error: 'Rate limit exceeded' } },
      });
      mockedAxios.get.mockRejectedValue(error);

      await expect(
        client.findCompletedItems({ keywords: 'Pikachu' })
      ).rejects.toThrow(EbayRateLimitError);
    });

    it('should throw EbayAPIError on 503 response', async () => {
      const error = new Error('Request failed with status code 503');
      Object.assign(error, {
        isAxiosError: true,
        response: { status: 503, data: { error: 'Service unavailable' } },
      });
      mockedAxios.get.mockRejectedValue(error);

      await expect(
        client.findCompletedItems({ keywords: 'Pikachu' })
      ).rejects.toThrow(EbayAPIError);
    });

    it('should throw EbayAPIError on other HTTP errors', async () => {
      const error = new Error('Request failed with status code 500');
      Object.assign(error, {
        isAxiosError: true,
        response: { status: 500, data: { error: 'Internal server error' } },
      });
      mockedAxios.get.mockRejectedValue(error);

      await expect(
        client.findCompletedItems({ keywords: 'Pikachu' })
      ).rejects.toThrow(EbayAPIError);
    });
  });

  describe('findActiveItems', () => {
    it('should fetch active listings successfully', async () => {
      const mockResponse = {
        data: {
          findItemsAdvancedResponse: [{
            searchResult: [{
              '@count': '2',
              item: [
                {
                  itemId: ['555'],
                  title: ['Pikachu PSA 10 For Sale'],
                  sellingStatus: [{
                    currentPrice: [{ __value__: '200.00', '@currencyId': 'USD' }],
                    sellingState: ['Active']
                  }],
                  listingInfo: [{ endTime: ['2024-12-31T12:00:00.000Z'] }]
                },
                {
                  itemId: ['666'],
                  title: ['Charizard BGS 9'],
                  sellingStatus: [{
                    currentPrice: [{ __value__: '450.00', '@currencyId': 'USD' }],
                    sellingState: ['Active']
                  }],
                  listingInfo: [{ endTime: ['2024-12-30T12:00:00.000Z'] }]
                }
              ]
            }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const results = await client.findActiveItems({
        keywords: 'Pikachu'
      });

      expect(results).toHaveLength(2);
      expect(results[0].is_verified_sale).toBe(false);
      expect(results[1].is_verified_sale).toBe(false);
    });
  });

  describe('POKEMON_CATEGORY_ID', () => {
    it('should return correct Pokemon category ID', () => {
      expect(EbayClient.POKEMON_CATEGORY_ID).toBe('183454');
    });
  });

  describe('query parameter building', () => {
    it('should include all provided parameters', async () => {
      const mockResponse = {
        data: {
          findCompletedItemsResponse: [{
            searchResult: [{ '@count': '0' }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await client.findCompletedItems({
        keywords: 'Pikachu',
        categoryId: '183454',
        entriesPerPage: 50,
        pageNumber: 2,
        sortOrder: 'PricePlusShippingLowest',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: 'Pikachu',
            categoryId: '183454',
            'paginationInput.entriesPerPage': '50',
            'paginationInput.pageNumber': '2',
            sortOrder: 'PricePlusShippingLowest',
          })
        })
      );
    });

    it('should handle custom item filters', async () => {
      const mockResponse = {
        data: {
          findCompletedItemsResponse: [{
            searchResult: [{ '@count': '0' }]
          }]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await client.findCompletedItems({
        keywords: 'Pikachu',
        itemFilter: [
          { name: 'MinPrice', value: '100' },
          { name: 'MaxPrice', value: '500' }
        ]
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            'itemFilter(0).name': 'SoldItemsOnly',
            'itemFilter(1).name': 'MinPrice',
            'itemFilter(1).value': '100',
            'itemFilter(2).name': 'MaxPrice',
            'itemFilter(2).value': '500',
          })
        })
      );
    });
  });
});
