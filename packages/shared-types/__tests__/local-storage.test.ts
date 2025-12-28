import { describe, it, expect } from 'vitest';
import {
  localCollectionItemSchema,
  localWatchlistItemSchema,
  collectionExportSchema,
  watchlistExportSchema,
  isQuotaError,
  getCollectionItemKey,
  StorageQuotaError,
  StorageValidationError,
  StorageNotAvailableError,
  getWatchlistItemKey,
} from '../src/local-storage';

describe('Local Storage Schemas', () => {
  describe('localCollectionItemSchema', () => {
    it('should validate a valid collection item', () => {
      const validItem = {
        id: crypto.randomUUID(),
        cardId: 123,
        quantity: 2,
        purchasePrice: 99.99,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
        grade: 'psa10' as const,
        gradingCompany: 'PSA' as const,
        notes: 'Test note',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        migrationStatus: 'pending' as const,
      };

      expect(() => localCollectionItemSchema.parse(validItem)).not.toThrow();
    });

    it('should reject invalid cardId', () => {
      const invalidItem = {
        cardId: -1,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY',
        purchaseDate: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      };

      expect(() => localCollectionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should reject quantity over max threshold', () => {
      const invalidItem = {
        cardId: 123,
        quantity: 1000,
        purchasePrice: 10,
        purchaseCurrency: 'CNY',
        purchaseDate: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      };

      expect(() => localCollectionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should reject negative purchase price', () => {
      const invalidItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: -10,
        purchaseCurrency: 'CNY',
        purchaseDate: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      };

      expect(() => localCollectionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should reject invalid currency', () => {
      const invalidItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'EUR',
        purchaseDate: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      };

      expect(() => localCollectionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should accept optional fields as undefined', () => {
      const minimalItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY',
        purchaseDate: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      };

      expect(() => localCollectionItemSchema.parse(minimalItem)).not.toThrow();
    });

    it('should reject notes over 500 characters', () => {
      const invalidItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY',
        purchaseDate: new Date().toISOString(),
        addedAt: new Date().toISOString(),
        notes: 'a'.repeat(501),
      };

      expect(() => localCollectionItemSchema.parse(invalidItem)).toThrow();
    });
  });

  describe('localWatchlistItemSchema', () => {
    it('should validate a valid watchlist item', () => {
      const validItem = {
        id: crypto.randomUUID(),
        cardId: 456,
        targetPrice: 150.0,
        targetCurrency: 'USD' as const,
        alertEnabled: true,
        notes: 'Monitor breakout level',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => localWatchlistItemSchema.parse(validItem)).not.toThrow();
    });

    it('should accept minimal watchlist item', () => {
      const minimalItem = {
        cardId: 456,
        alertEnabled: false,
        addedAt: new Date().toISOString(),
      };

      expect(() => localWatchlistItemSchema.parse(minimalItem)).not.toThrow();
    });

    it('should reject negative target price', () => {
      const invalidItem = {
        cardId: 456,
        targetPrice: -10,
        alertEnabled: true,
        addedAt: new Date().toISOString(),
      };

      expect(() => localWatchlistItemSchema.parse(invalidItem)).toThrow();
    });

    it('should reject notes exceeding 500 characters', () => {
      const invalidItem = {
        cardId: 777,
        alertEnabled: true,
        addedAt: new Date().toISOString(),
        notes: 'a'.repeat(501),
      };

      expect(() => localWatchlistItemSchema.parse(invalidItem)).toThrow();
    });
  });

  describe('collectionExportSchema', () => {
    it('should validate a valid export format', () => {
      const validExport = {
        schemaVersion: 1 as const,
        exportedAt: new Date().toISOString(),
        items: [
          {
            cardId: 123,
            quantity: 1,
            purchasePrice: 10,
            purchaseCurrency: 'CNY' as const,
            purchaseDate: new Date().toISOString(),
            addedAt: new Date().toISOString(),
          },
        ],
      };

      expect(() => collectionExportSchema.parse(validExport)).not.toThrow();
    });

    it('should reject wrong schema version', () => {
      const invalidExport = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        items: [],
      };

      expect(() => collectionExportSchema.parse(invalidExport)).toThrow();
    });

    it('should accept empty items array', () => {
      const validExport = {
        schemaVersion: 1 as const,
        exportedAt: new Date().toISOString(),
        items: [],
      };

      expect(() => collectionExportSchema.parse(validExport)).not.toThrow();
    });
  });

  describe('Error Types', () => {
    it('should create StorageQuotaError', () => {
      const error = new StorageQuotaError('Test message');
      expect(error.name).toBe('StorageQuotaError');
      expect(error.message).toBe('Test message');
    });

    it('should create StorageValidationError with details', () => {
      const details = { field: 'cardId', issue: 'invalid' };
      const error = new StorageValidationError('Validation failed', details);
      expect(error.name).toBe('StorageValidationError');
      expect(error.details).toEqual(details);
    });

    it('should create StorageNotAvailableError', () => {
      const error = new StorageNotAvailableError();
      expect(error.name).toBe('StorageNotAvailableError');
    });
  });

  describe('isQuotaError', () => {
    it('should detect quota error by code', () => {
      const error = new DOMException('Quota exceeded', 'QuotaExceededError');
      Object.defineProperty(error, 'code', { value: 22 });
      expect(isQuotaError(error)).toBe(true);
    });

    it('should detect quota error by name', () => {
      const error = new DOMException('Quota exceeded', 'QuotaExceededError');
      expect(isQuotaError(error)).toBe(true);
    });

    it('should detect quota error by message', () => {
      const error = new Error('Storage quota exceeded');
      expect(isQuotaError(error)).toBe(false);
      
      const domError = new DOMException('quota exceeded');
      expect(isQuotaError(domError)).toBe(true);
    });

    it('should return false for non-quota errors', () => {
      const error = new Error('Some other error');
      expect(isQuotaError(error)).toBe(false);
    });
  });

  describe('getCollectionItemKey', () => {
    it('should generate unique key from item properties', () => {
      const item = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: '2024-01-15T00:00:00.000Z',
        grade: 'psa10' as const,
        addedAt: new Date().toISOString(),
      };

      const key = getCollectionItemKey(item);
      expect(key).toBe('123_psa10_2024-01-15T00:00:00.000Z');
    });

    it('should use "raw" for items without grade', () => {
      const item = {
        cardId: 456,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'USD' as const,
        purchaseDate: '2024-02-20T00:00:00.000Z',
        addedAt: new Date().toISOString(),
      };

      const key = getCollectionItemKey(item);
      expect(key).toBe('456_raw_2024-02-20T00:00:00.000Z');
    });

    it('should generate same key for duplicate items', () => {
      const item1 = {
        cardId: 789,
        quantity: 1,
        purchasePrice: 100,
        purchaseCurrency: 'JPY' as const,
        purchaseDate: '2024-03-10T00:00:00.000Z',
        grade: 'psa9' as const,
        addedAt: '2024-03-10T10:00:00.000Z',
      };

      const item2 = {
        cardId: 789,
        quantity: 2,
        purchasePrice: 150,
        purchaseCurrency: 'JPY' as const,
        purchaseDate: '2024-03-10T00:00:00.000Z',
        grade: 'psa9' as const,
        addedAt: '2024-03-10T11:00:00.000Z',
      };

      expect(getCollectionItemKey(item1)).toBe(getCollectionItemKey(item2));
    });
  });

  describe('getWatchlistItemKey', () => {
    it('should generate key based on cardId', () => {
      const item = {
        cardId: 432,
      };

      expect(getWatchlistItemKey(item as any)).toBe('432');
    });
  });
});
