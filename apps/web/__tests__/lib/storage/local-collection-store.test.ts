import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalCollectionStore } from '@/lib/storage/local-collection-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      uuidCounter++;
      // Generate valid UUID v4 format
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`;
    },
  },
});

// Mock BroadcastChannel
class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(_name: string) {
    // Mock implementation
  }

  postMessage(_data: unknown) {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.onmessage = listener;
    }
  }

  removeEventListener() {
    // Mock implementation
  }
}

Object.defineProperty(global, 'BroadcastChannel', {
  value: MockBroadcastChannel,
});

describe('LocalCollectionStore', () => {
  let store: LocalCollectionStore;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalCollectionStore();
  });

  afterEach(() => {
    store.destroy();
  });

  describe('upsert', () => {
    it('should add a new item to collection', async () => {
      const item = {
        cardId: 123,
        quantity: 2,
        purchasePrice: 99.99,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
        grade: 'psa10' as const,
        gradingCompany: 'PSA' as const,
        notes: 'Test item',
      };

      const result = await store.upsert(item);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('addedAt');
      expect(result.cardId).toBe(123);
      expect(result.quantity).toBe(2);
    });

    it('should validate item before adding', async () => {
      const invalidItem = {
        cardId: -1, // Invalid
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      };

      await expect(store.upsert(invalidItem as any)).rejects.toThrow();
    });

    it('should enforce quantity max limit', async () => {
      const item = {
        cardId: 123,
        quantity: 1000, // Over limit
        purchasePrice: 10,
        purchaseCurrency: 'USD' as const,
        purchaseDate: new Date().toISOString(),
      };

      await expect(store.upsert(item as any)).rejects.toThrow();
    });

    it('should reject notes over 500 characters', async () => {
      const item = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
        notes: 'a'.repeat(501),
      };

      await expect(store.upsert(item as any)).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should return empty array when no items', async () => {
      const items = await store.list();
      expect(items).toEqual([]);
    });

    it('should return all items', async () => {
      const item1 = {
        cardId: 1,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      };

      const item2 = {
        cardId: 2,
        quantity: 2,
        purchasePrice: 20,
        purchaseCurrency: 'USD' as const,
        purchaseDate: new Date().toISOString(),
      };

      await store.upsert(item1);
      await store.upsert(item2);

      const items = await store.list();
      expect(items).toHaveLength(2);
      expect(items[0].cardId).toBe(1);
      expect(items[1].cardId).toBe(2);
    });
  });

  describe('get', () => {
    it('should return null for non-existent item', async () => {
      const item = await store.get('non-existent-id');
      expect(item).toBeNull();
    });

    it('should return item by id', async () => {
      const newItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'JPY' as const,
        purchaseDate: new Date().toISOString(),
      };

      const added = await store.upsert(newItem);
      const retrieved = await store.get(added.id!);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.cardId).toBe(123);
    });
  });

  describe('update', () => {
    it('should update existing item', async () => {
      const newItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      };

      const added = await store.upsert(newItem);
      const updated = await store.update(added.id!, { quantity: 5, notes: 'Updated note' });

      expect(updated.quantity).toBe(5);
      expect(updated.notes).toBe('Updated note');
      expect(updated.updatedAt).toBeDefined();
      expect(updated.addedAt).toBe(added.addedAt); // Should preserve addedAt
    });

    it('should throw error for non-existent item', async () => {
      await expect(store.update('non-existent-id', { quantity: 10 })).rejects.toThrow();
    });

    it('should validate updated data', async () => {
      const newItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      };

      const added = await store.upsert(newItem);

      await expect(store.update(added.id!, { quantity: 1000 } as any)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove item from collection', async () => {
      const newItem = {
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      };

      const added = await store.upsert(newItem);
      await store.remove(added.id!);

      const items = await store.list();
      expect(items).toHaveLength(0);
    });

    it('should handle removing non-existent item gracefully', async () => {
      await expect(store.remove('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all items', async () => {
      await store.upsert({
        cardId: 1,
        quantity: 1,
        purchasePrice: 10,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      });

      await store.upsert({
        cardId: 2,
        quantity: 2,
        purchasePrice: 20,
        purchaseCurrency: 'USD' as const,
        purchaseDate: new Date().toISOString(),
      });

      await store.clear();

      const items = await store.list();
      expect(items).toHaveLength(0);
    });
  });

  describe('export', () => {
    it('should export collection in correct format', async () => {
      await store.upsert({
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: new Date().toISOString(),
      });

      const exported = await store.export();

      expect(exported).toHaveProperty('schemaVersion', 1);
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('items');
      expect(exported.items).toHaveLength(1);
      expect(exported.items[0].cardId).toBe(123);
    });

    it('should export empty collection', async () => {
      const exported = await store.export();

      expect(exported.schemaVersion).toBe(1);
      expect(exported.items).toEqual([]);
    });
  });

  describe('import', () => {
    it('should import valid collection data', async () => {
      const importData = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        items: [
          {
            cardId: 100,
            quantity: 3,
            purchasePrice: 75,
            purchaseCurrency: 'USD' as const,
            purchaseDate: new Date().toISOString(),
            addedAt: new Date().toISOString(),
          },
        ],
      };

      const result = await store.import(importData);

      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);

      const items = await store.list();
      expect(items).toHaveLength(1);
      expect(items[0].cardId).toBe(100);
    });

    it('should reject invalid import data', async () => {
      const invalidData = {
        schemaVersion: 2, // Wrong version
        exportedAt: new Date().toISOString(),
        items: [],
      };

      await expect(store.import(invalidData)).rejects.toThrow();
    });

    it('should handle duplicate items correctly', async () => {
      const baseDate = new Date('2024-01-15T00:00:00.000Z');
      const olderDate = new Date('2024-01-10T00:00:00.000Z');

      // Add existing item
      await store.upsert({
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: baseDate.toISOString(),
        grade: 'psa10' as const,
      });

      // Import older version of same item
      const importData = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        items: [
          {
            cardId: 123,
            quantity: 2,
            purchasePrice: 60,
            purchaseCurrency: 'CNY' as const,
            purchaseDate: baseDate.toISOString(),
            grade: 'psa10' as const,
            addedAt: olderDate.toISOString(),
            updatedAt: olderDate.toISOString(),
          },
        ],
      };

      const result = await store.import(importData);

      expect(result.added).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1); // Should skip older item
    });

    it('should update with newer import data', async () => {
      const baseDate = new Date('2024-01-15T00:00:00.000Z');
      const olderDate = new Date('2024-01-10T00:00:00.000Z');
      const newerDate = new Date('2024-01-20T00:00:00.000Z');

      // Add existing item
      const existing = await store.upsert({
        cardId: 123,
        quantity: 1,
        purchasePrice: 50,
        purchaseCurrency: 'CNY' as const,
        purchaseDate: baseDate.toISOString(),
        grade: 'psa10' as const,
      });

      // Manually update the item's updatedAt to be older for this test
      await store.update(existing.id!, { 
        updatedAt: olderDate.toISOString() 
      });

      // Import newer version
      const importData = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        items: [
          {
            cardId: 123,
            quantity: 5,
            purchasePrice: 75,
            purchaseCurrency: 'CNY' as const,
            purchaseDate: baseDate.toISOString(),
            grade: 'psa10' as const,
            addedAt: existing.addedAt,
            updatedAt: newerDate.toISOString(),
          },
        ],
      };

      const result = await store.import(importData);

      expect(result.updated).toBe(1);

      const items = await store.list();
      expect(items[0].quantity).toBe(5);
    });
  });

  describe('getBackendInfo', () => {
    it('should return backend information', () => {
      const info = store.getBackendInfo();
      expect(info).toHaveProperty('backend');
      expect(info.backend).toBe('localStorage');
    });
  });
});
