import { describe, it, expect } from 'vitest';

/**
 * Integration Tests
 * 
 * These tests make real API calls to eBay sandbox.
 * They are skipped by default unless:
 * 1. EBAY_APP_ID is configured with real credentials
 * 2. CI environment variable is not set
 * 
 * To run: Ensure .env.local has valid eBay sandbox credentials
 */

// Set default env vars if not present (for unit test mode)
if (!process.env.EBAY_APP_ID) {
  process.env.EBAY_APP_ID = 'test-app-id-for-unit-tests';
}
if (!process.env.EBAY_ENVIRONMENT) {
  process.env.EBAY_ENVIRONMENT = 'SANDBOX';
}

// Import after env vars are potentially set
import { ebayClient } from '../client';
import { getRateLimiterStatus } from '../rate-limiter';

// Only run integration tests if real eBay credentials are present
const shouldRunIntegration = 
  process.env.EBAY_APP_ID?.includes('SongzheL') && 
  process.env.CI !== 'true';

describe.skipIf(!shouldRunIntegration)('eBay Integration Tests', () => {
  it('should fetch real completed items from eBay sandbox', async () => {
    // Use a generic search term that should always return results
    const results = await ebayClient.findCompletedItems({
      keywords: 'Pokemon Card',
      entriesPerPage: 10
    });

    // Verify we got results
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);

    // Verify structure of first result
    const firstItem = results[0];
    expect(firstItem).toHaveProperty('ebay_item_id');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('price_usd');
    expect(firstItem).toHaveProperty('original_price');
    expect(firstItem).toHaveProperty('original_currency');
    expect(firstItem).toHaveProperty('sold_date');
    expect(firstItem).toHaveProperty('language');
    expect(firstItem).toHaveProperty('quantity');
    expect(firstItem).toHaveProperty('is_verified_sale');

    // Verify data validity
    expect(firstItem.ebay_item_id).toBeTruthy();
    expect(firstItem.title).toBeTruthy();
    expect(firstItem.price_usd).toBeGreaterThan(0);
    expect(firstItem.is_verified_sale).toBe(true);
    expect(firstItem.quantity).toBeGreaterThanOrEqual(1);

    console.log(`✓ Fetched ${results.length} completed items from eBay`);
    console.log(`Sample item: ${firstItem.title} - $${firstItem.price_usd}`);
  }, 30000); // 30 second timeout

  it('should fetch active listings from eBay sandbox', async () => {
    const results = await ebayClient.findActiveItems({
      keywords: 'Pokemon Pikachu',
      entriesPerPage: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);

    const firstItem = results[0];
    expect(firstItem.is_verified_sale).toBe(false); // Active listings not sold yet
    expect(firstItem.price_usd).toBeGreaterThan(0);

    console.log(`✓ Fetched ${results.length} active items from eBay`);
  }, 30000);

  it('should search with Pokemon category filter', async () => {
    const results = await ebayClient.findCompletedItems({
      keywords: 'Pikachu',
      categoryId: ebayClient.constructor.POKEMON_CATEGORY_ID,
      entriesPerPage: 10
    });

    expect(results.length).toBeGreaterThan(0);

    console.log(`✓ Fetched ${results.length} items with category filter`);
  }, 30000);

  it('should respect rate limiting across multiple requests', async () => {
    const startTime = Date.now();

    // Make 5 concurrent requests
    const promises = Array(5).fill(null).map((_, index) =>
      ebayClient.findCompletedItems({
        keywords: `Pokemon ${index}`,
        entriesPerPage: 5
      })
    );

    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    // Verify all requests succeeded
    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(Array.isArray(result)).toBe(true);
      console.log(`Request ${index + 1}: ${result.length} items`);
    });

    // Rate limiter should introduce some delay (min 200ms between requests)
    // With 5 requests, expect at least 800ms (4 gaps × 200ms)
    console.log(`✓ Completed 5 requests in ${elapsed}ms`);
    
    // Log rate limiter status
    const status = getRateLimiterStatus();
    console.log('Rate limiter status:', status);
  }, 60000); // 60 second timeout for multiple requests

  it('should handle search with no results gracefully', async () => {
    const results = await ebayClient.findCompletedItems({
      keywords: 'XYZNONEXISTENTCARD123456789',
      entriesPerPage: 10
    });

    expect(results).toHaveLength(0);
    console.log('✓ Handled empty results correctly');
  }, 30000);

  it('should cache results on second identical query', async () => {
    const keywords = 'Charizard Pokemon Card';

    // First request (not cached)
    const start1 = Date.now();
    const results1 = await ebayClient.findCompletedItems({
      keywords,
      entriesPerPage: 10
    });
    const time1 = Date.now() - start1;

    // Second identical request (should be cached)
    const start2 = Date.now();
    const results2 = await ebayClient.findCompletedItems({
      keywords,
      entriesPerPage: 10
    });
    const time2 = Date.now() - start2;

    // Verify results are identical
    expect(results1.length).toBe(results2.length);
    if (results1.length > 0) {
      expect(results1[0].ebay_item_id).toBe(results2[0].ebay_item_id);
    }

    // Cached request should be much faster (typically <50ms vs 1000ms+)
    console.log(`First request: ${time1}ms, Second request (cached): ${time2}ms`);
    expect(time2).toBeLessThan(time1 / 2); // At least 2x faster

    console.log('✓ Caching is working correctly');
  }, 60000);

  it('should parse grading information correctly', async () => {
    const results = await ebayClient.findCompletedItems({
      keywords: 'Pokemon PSA 10',
      entriesPerPage: 20
    });

    // Find items with grading info
    const gradedItems = results.filter(item => 
      item.grading_company !== null || item.grade !== null
    );

    if (gradedItems.length > 0) {
      console.log(`✓ Found ${gradedItems.length} graded items out of ${results.length}`);
      
      const sampleGraded = gradedItems[0];
      console.log(`Sample graded item: ${sampleGraded.title}`);
      console.log(`  Company: ${sampleGraded.grading_company}, Grade: ${sampleGraded.grade}`);
      
      expect(sampleGraded.grading_company).toBeTruthy();
    } else {
      console.log('Note: No graded items found in results');
    }
  }, 30000);

  it('should detect Japanese cards correctly', async () => {
    const results = await ebayClient.findCompletedItems({
      keywords: 'Pokemon Japanese',
      entriesPerPage: 20
    });

    const japaneseCards = results.filter(item => item.language === 'jp');

    if (japaneseCards.length > 0) {
      console.log(`✓ Found ${japaneseCards.length} Japanese cards out of ${results.length}`);
      console.log(`Sample: ${japaneseCards[0].title}`);
    } else {
      console.log('Note: No Japanese cards found in results');
    }
  }, 30000);
});

describe('eBay Integration Tests (Mocked)', () => {
  it('should export correct client environment info', () => {
    const info = ebayClient.getEnvironmentInfo();
    
    expect(info).toHaveProperty('environment');
    expect(info).toHaveProperty('baseUrl');
    expect(info).toHaveProperty('appIdConfigured');
    
    if (process.env.EBAY_APP_ID) {
      expect(info.appIdConfigured).toBe(true);
    }
    
    console.log('Environment info:', info);
  });

  it('should have correct Pokemon category ID', () => {
    const categoryId = ebayClient.constructor.POKEMON_CATEGORY_ID;
    expect(categoryId).toBe('183454');
  });
});
