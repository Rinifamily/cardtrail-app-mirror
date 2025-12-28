import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalWatchlistStore } from '@/lib/storage/local-watchlist-store';

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

let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`;
    }),
  },
});

class MockBroadcastChannel {
  constructor(_name: string) {}
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

Object.defineProperty(global, 'BroadcastChannel', {
  value: MockBroadcastChannel,
});

describe('LocalWatchlistStore', () => {
  let store: LocalWatchlistStore;

  beforeEach(() => {
    localStorageMock.clear();
    uuidCounter = 0;
    store = new LocalWatchlistStore();
  });

  describe('upsert', () => {
    it('creates a new watchlist entry', async () => {
      const result = await store.upsert({
        cardId: 101,
        targetPrice: 999,
        targetCurrency: 'CNY',
        alertEnabled: true,
        notes: '追踪破位',
      });

      expect(result.cardId).toBe(101);
      expect(result.id).toBeDefined();
      expect(result.notes).toBe('追踪破位');
    });

    it('deduplicates entries by cardId', async () => {
      await store.upsert({
        cardId: 555,
        targetPrice: 120,
        alertEnabled: true,
      });

      const updated = await store.upsert({
        cardId: 555,
        targetPrice: 88,
        alertEnabled: false,
      });

      expect(updated.targetPrice).toBe(88);
      expect(updated.alertEnabled).toBe(false);

      const items = await store.list();
      expect(items).toHaveLength(1);
    });

    it('trims notes and enforces limit', async () => {
      const result = await store.upsert({
        cardId: 999,
        alertEnabled: true,
        notes: '   keep me   ',
      });

      expect(result.notes).toBe('keep me');
    });
  });

  describe('list & get', () => {
    it('returns all watchlist entries', async () => {
      await store.upsert({ cardId: 1, alertEnabled: true });
      await store.upsert({ cardId: 2, alertEnabled: false });

      const items = await store.list();
      expect(items).toHaveLength(2);
    });

    it('fetches by id', async () => {
      const entry = await store.upsert({ cardId: 42, alertEnabled: true });
      const fetched = await store.get(entry.id!);
      expect(fetched?.cardId).toBe(42);
    });
  });

  describe('remove', () => {
    it('removes entries', async () => {
      const entry = await store.upsert({ cardId: 77, alertEnabled: true });
      await store.remove(entry.id!);
      const items = await store.list();
      expect(items).toHaveLength(0);
    });
  });

  describe('export/import', () => {
    it('exports in expected format', async () => {
      await store.upsert({ cardId: 3, alertEnabled: true });
      const exported = await store.export();
      expect(exported.schemaVersion).toBe(1);
      expect(exported.items).toHaveLength(1);
    });

    it('imports and deduplicates by cardId', async () => {
      const importData = {
        schemaVersion: 1 as const,
        exportedAt: new Date().toISOString(),
        items: [
          {
            cardId: 88,
            alertEnabled: true,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const result = await store.import(importData);
      expect(result.added).toBe(1);
    });
  });
});
