import { describe, it, expect, vi } from 'vitest';
import {
  validateCurrency,
  convertToUSD,
  extractCurrency,
  parsePrice,
  needsConversion,
  SUPPORTED_CURRENCIES,
  CURRENCY_TO_USD_RATES,
} from '../currency';

describe('Currency Utilities', () => {
  describe('validateCurrency', () => {
    it('should return normalized currency for supported codes', () => {
      expect(validateCurrency('USD')).toBe('USD');
      expect(validateCurrency('usd')).toBe('USD');
      expect(validateCurrency('  EUR  ')).toBe('EUR');
      expect(validateCurrency('JPY')).toBe('JPY');
    });

    it('should default to USD for missing currency', () => {
      expect(validateCurrency(undefined)).toBe('USD');
      expect(validateCurrency(null)).toBe('USD');
      expect(validateCurrency('')).toBe('USD');
    });

    it('should default to USD for unknown currency', () => {
      expect(validateCurrency('XXX')).toBe('USD');
      expect(validateCurrency('INVALID')).toBe('USD');
      expect(validateCurrency('123')).toBe('USD');
    });

    it('should log warnings for edge cases', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      validateCurrency(undefined);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing currency')
      );

      validateCurrency('XXX');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown currency code')
      );

      consoleSpy.mockRestore();
    });

    it('should include context in warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      validateCurrency(undefined, 'item-123');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('for item-123')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('convertToUSD', () => {
    it('should return amount unchanged for USD', () => {
      expect(convertToUSD(100, 'USD')).toBe(100);
      expect(convertToUSD(50.5, 'usd')).toBe(50.5);
    });

    it('should convert EUR to USD', () => {
      const result = convertToUSD(100, 'EUR');
      expect(result).toBe(100 * CURRENCY_TO_USD_RATES.EUR);
    });

    it('should convert JPY to USD', () => {
      const result = convertToUSD(10000, 'JPY');
      expect(result).toBe(10000 * CURRENCY_TO_USD_RATES.JPY);
    });

    it('should convert GBP to USD', () => {
      const result = convertToUSD(100, 'GBP');
      expect(result).toBe(100 * CURRENCY_TO_USD_RATES.GBP);
    });

    it('should handle all supported currencies', () => {
      SUPPORTED_CURRENCIES.forEach(currency => {
        const result = convertToUSD(100, currency);
        expect(result).toBeGreaterThan(0);
        expect(typeof result).toBe('number');
      });
    });

    it('should return 0 for invalid amounts', () => {
      expect(convertToUSD(NaN, 'USD')).toBe(0);
      expect(convertToUSD(-100, 'USD')).toBe(0);
      expect(convertToUSD(Infinity, 'USD')).toBe(0);
    });

    it('should treat unknown currency as USD', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = convertToUSD(100, 'UNKNOWN');
      expect(result).toBe(100); // Treated as 1:1 (USD)

      consoleSpy.mockRestore();
    });

    it('should log conversion in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      convertToUSD(100, 'EUR', 'item-123');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Converted 100 EUR')
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('extractCurrency', () => {
    it('should extract currency from currentPrice', () => {
      const item = {
        itemId: ['123'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '100.00',
            '@currencyId': 'USD'
          }]
        }]
      };

      expect(extractCurrency(item)).toBe('USD');
    });

    it('should fallback to convertedCurrentPrice', () => {
      const item = {
        itemId: ['123'],
        sellingStatus: [{
          convertedCurrentPrice: [{
            __value__: '100.00',
            '@currencyId': 'EUR'
          }]
        }]
      };

      expect(extractCurrency(item)).toBe('EUR');
    });

    it('should default to USD for missing currency', () => {
      const item = {
        itemId: ['123'],
        sellingStatus: [{}]
      };

      expect(extractCurrency(item)).toBe('USD');
    });
  });

  describe('parsePrice', () => {
    it('should parse valid price with USD', () => {
      const item = {
        itemId: ['123456'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '150.00',
            '@currencyId': 'USD'
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(150);
      expect(result.currency).toBe('USD');
      expect(result.priceUsd).toBe(150);
    });

    it('should parse and convert EUR price', () => {
      const item = {
        itemId: ['789'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '100.00',
            '@currencyId': 'EUR'
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(100);
      expect(result.currency).toBe('EUR');
      expect(result.priceUsd).toBe(100 * CURRENCY_TO_USD_RATES.EUR);
    });

    it('should parse and convert JPY price', () => {
      const item = {
        itemId: ['456'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '10000',
            '@currencyId': 'JPY'
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(10000);
      expect(result.currency).toBe('JPY');
      expect(result.priceUsd).toBe(10000 * CURRENCY_TO_USD_RATES.JPY);
    });

    it('should return 0 for missing price', () => {
      const item = {
        itemId: ['999'],
        sellingStatus: [{}]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(0);
      expect(result.currency).toBe('USD');
      expect(result.priceUsd).toBe(0);
    });

    it('should return 0 for invalid price string', () => {
      const item = {
        itemId: ['888'],
        sellingStatus: [{
          currentPrice: [{
            __value__: 'invalid',
            '@currencyId': 'USD'
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(0);
      expect(result.priceUsd).toBe(0);
    });

    it('should handle missing currency gracefully', () => {
      const item = {
        itemId: ['777'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '50.00'
            // Missing @currencyId
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(50);
      expect(result.currency).toBe('USD'); // Defaults to USD
      expect(result.priceUsd).toBe(50);
    });

    it('should log errors for problematic items', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      parsePrice({ itemId: ['error-item'], sellingStatus: [{}] });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing price')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('needsConversion', () => {
    it('should return false for USD', () => {
      expect(needsConversion('USD')).toBe(false);
      expect(needsConversion('usd')).toBe(false);
    });

    it('should return true for non-USD currencies', () => {
      expect(needsConversion('EUR')).toBe(true);
      expect(needsConversion('JPY')).toBe(true);
      expect(needsConversion('GBP')).toBe(true);
    });

    it('should return false for unknown currencies (defaults to USD)', () => {
      expect(needsConversion('UNKNOWN')).toBe(false);
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('should include common currencies', () => {
      expect(SUPPORTED_CURRENCIES).toContain('USD');
      expect(SUPPORTED_CURRENCIES).toContain('EUR');
      expect(SUPPORTED_CURRENCIES).toContain('GBP');
      expect(SUPPORTED_CURRENCIES).toContain('JPY');
    });

    it('should have corresponding conversion rates', () => {
      SUPPORTED_CURRENCIES.forEach(currency => {
        expect(CURRENCY_TO_USD_RATES).toHaveProperty(currency);
        expect(CURRENCY_TO_USD_RATES[currency]).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases and integration', () => {
    it('should handle multiple currency formats in same response', () => {
      const items = [
        {
          itemId: ['1'],
          sellingStatus: [{
            currentPrice: [{ __value__: '100', '@currencyId': 'USD' }]
          }]
        },
        {
          itemId: ['2'],
          sellingStatus: [{
            currentPrice: [{ __value__: '100', '@currencyId': 'EUR' }]
          }]
        },
        {
          itemId: ['3'],
          sellingStatus: [{
            currentPrice: [{ __value__: '10000', '@currencyId': 'JPY' }]
          }]
        },
      ];

      const results = items.map(parsePrice);

      expect(results[0].currency).toBe('USD');
      expect(results[1].currency).toBe('EUR');
      expect(results[2].currency).toBe('JPY');

      expect(results[0].priceUsd).toBe(100);
      expect(results[1].priceUsd).toBeGreaterThan(100); // EUR > USD
      expect(results[2].priceUsd).toBeLessThan(100); // JPY << USD
    });

    it('should handle decimal prices correctly', () => {
      const item = {
        itemId: ['decimal'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '99.99',
            '@currencyId': 'USD'
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(99.99);
      expect(result.priceUsd).toBe(99.99);
    });

    it('should handle very large JPY amounts', () => {
      const item = {
        itemId: ['large-jpy'],
        sellingStatus: [{
          currentPrice: [{
            __value__: '1000000', // 1M JPY
            '@currencyId': 'JPY'
          }]
        }]
      };

      const result = parsePrice(item);

      expect(result.originalPrice).toBe(1000000);
      expect(result.priceUsd).toBe(1000000 * CURRENCY_TO_USD_RATES.JPY);
      expect(result.priceUsd).toBeGreaterThan(0);
      expect(result.priceUsd).toBeLessThan(20000); // Sanity check
    });
  });
});
