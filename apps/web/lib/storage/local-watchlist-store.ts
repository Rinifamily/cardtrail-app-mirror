import {
  LocalWatchlistItem,
  localWatchlistItemSchema,
  STORAGE_KEYS,
  STORAGE_THRESHOLDS,
  StorageQuotaError,
  StorageValidationError,
  StorageNotAvailableError,
  isQuotaError,
  WatchlistExport,
  watchlistExportSchema,
  getWatchlistItemKey,
} from '@cardtrail/shared-types';
import {
  clearWatchlistIDB,
  deleteWatchlistFromIDB,
  getAllWatchlistFromIDB,
  getWatchlistByCardIdFromIDB,
  getWatchlistFromIDB,
  isIndexedDBAvailable,
  putWatchlistInIDB,
} from './indexeddb';

type StorageBackend = 'localStorage' | 'indexedDB';

type WatchlistUpsertInput = Omit<LocalWatchlistItem, 'id' | 'addedAt' | 'updatedAt'> & {
  id?: string;
};

export class LocalWatchlistStore {
  private backend: StorageBackend = 'localStorage';
  private broadcastChannel: BroadcastChannel | null = null;
  private storageHandler = this.handleStorageEvent.bind(this);
  private broadcastHandler = this.handleBroadcastMessage.bind(this);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageHandler);

      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('watchlist');
        this.broadcastChannel.addEventListener('message', this.broadcastHandler);
      }

      this.detectBackend();
    }
  }

  private detectBackend(): void {
    try {
      const pointer = localStorage.getItem(`${STORAGE_KEYS.WATCHLIST}_pointer`);
      if (pointer === 'indexedDB') {
        this.backend = 'indexedDB';
      }
    } catch {
      if (isIndexedDBAvailable()) {
        this.backend = 'indexedDB';
      }
    }
  }

  private async switchToIndexedDB(): Promise<void> {
    if (this.backend === 'indexedDB') {
      return;
    }

    try {
      const existingData = this.readFromLocalStorage();
      for (const item of existingData) {
        await putWatchlistInIDB(item);
      }

      localStorage.setItem(`${STORAGE_KEYS.WATCHLIST}_pointer`, 'indexedDB');
      localStorage.removeItem(STORAGE_KEYS.WATCHLIST);

      this.backend = 'indexedDB';
    } catch (error) {
      console.error('Failed to switch watchlist store to IndexedDB', error);
      throw new StorageNotAvailableError('Failed to migrate watchlist to IndexedDB');
    }
  }

  private readFromLocalStorage(): LocalWatchlistItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read watchlist from localStorage', error);
      return [];
    }
  }

  private writeToLocalStorage(items: LocalWatchlistItem[]): void {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (existing) {
        localStorage.setItem(STORAGE_KEYS.WATCHLIST_BACKUP, existing);
      }

      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
    } catch (error) {
      if (isQuotaError(error)) {
        throw new StorageQuotaError('localStorage quota exceeded');
      }
      throw error;
    }
  }

  private cleanNotes(notes?: string | null): string | undefined {
    if (!notes) {
      return undefined;
    }
    const trimmed = notes.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.slice(0, STORAGE_THRESHOLDS.MAX_NOTES_LENGTH);
  }

  private async findExistingItem(cardId: number, id?: string): Promise<LocalWatchlistItem | null> {
    if (this.backend === 'indexedDB') {
      if (id) {
        const existing = await getWatchlistFromIDB(id);
        if (existing) {
          return existing;
        }
      }
      const match = await getWatchlistByCardIdFromIDB(cardId);
      return match[0] ?? null;
    }

    const items = this.readFromLocalStorage();
    if (id) {
      const existing = items.find((item) => item.id === id);
      if (existing) {
        return existing;
      }
    }
    return items.find((item) => item.cardId === cardId) ?? null;
  }

  async list(): Promise<LocalWatchlistItem[]> {
    try {
      if (this.backend === 'indexedDB') {
        return await getAllWatchlistFromIDB();
      }
      return this.readFromLocalStorage();
    } catch (error) {
      console.error('Failed to list watchlist items', error);
      return [];
    }
  }

  async get(id: string): Promise<LocalWatchlistItem | null> {
    try {
      if (this.backend === 'indexedDB') {
        const item = await getWatchlistFromIDB(id);
        return item ?? null;
      }

      const items = this.readFromLocalStorage();
      return items.find((item) => item.id === id) ?? null;
    } catch (error) {
      console.error('Failed to get watchlist item', error);
      return null;
    }
  }

  async getByCardId(cardId: number): Promise<LocalWatchlistItem | null> {
    if (this.backend === 'indexedDB') {
      const [match] = await getWatchlistByCardIdFromIDB(cardId);
      return match ?? null;
    }
    const items = this.readFromLocalStorage();
    return items.find((item) => item.cardId === cardId) ?? null;
  }

  async upsert(item: WatchlistUpsertInput): Promise<LocalWatchlistItem> {
    try {
      const now = new Date().toISOString();
      const existing = await this.findExistingItem(item.cardId, item.id);
      const normalizedNotes = this.cleanNotes(item.notes ?? existing?.notes);

      const candidate: LocalWatchlistItem = {
        cardId: item.cardId,
        targetPrice: item.targetPrice ?? existing?.targetPrice,
        targetCurrency: item.targetCurrency ?? existing?.targetCurrency ?? 'CNY',
        alertEnabled: item.alertEnabled ?? existing?.alertEnabled ?? true,
        notes: normalizedNotes,
        id: existing?.id ?? item.id ?? crypto.randomUUID(),
        addedAt: existing?.addedAt ?? now,
        updatedAt: now,
        migrationStatus: existing?.migrationStatus ?? 'pending',
      };

      const validated = localWatchlistItemSchema.parse(candidate);

      if (this.backend === 'indexedDB') {
        await putWatchlistInIDB(validated);
      } else {
        const items = this.readFromLocalStorage();

        if (items.length >= STORAGE_THRESHOLDS.MAX_LOCALSTORAGE_ITEMS) {
          await this.switchToIndexedDB();
          await putWatchlistInIDB(validated);
        } else {
          const nextItems = [...items];
          const idIndex = nextItems.findIndex((entry) => entry.id === validated.id);
          if (idIndex >= 0) {
            nextItems[idIndex] = validated;
          } else {
            const duplicateIndex = nextItems.findIndex((entry) => entry.cardId === validated.cardId);
            if (duplicateIndex >= 0) {
              nextItems[duplicateIndex] = validated;
            } else {
              nextItems.push(validated);
            }
          }

          try {
            this.writeToLocalStorage(nextItems);
          } catch (error) {
            if (isQuotaError(error)) {
              await this.switchToIndexedDB();
              await putWatchlistInIDB(validated);
            } else {
              throw error;
            }
          }
        }
      }

      this.notifyChange('upsert', validated);
      return validated;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw new StorageValidationError('Invalid watchlist item data', error);
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<LocalWatchlistItem>): Promise<LocalWatchlistItem> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Watchlist item ${id} not found`);
    }

    const now = new Date().toISOString();
    const normalizedNotes = this.cleanNotes(updates.notes ?? existing.notes);

    const updated: LocalWatchlistItem = {
      ...existing,
      ...updates,
      notes: normalizedNotes,
      id: existing.id,
      addedAt: existing.addedAt,
      updatedAt: now,
    };

    const validated = localWatchlistItemSchema.parse(updated);

    if (this.backend === 'indexedDB') {
      await putWatchlistInIDB(validated);
    } else {
      const items = this.readFromLocalStorage();
      const index = items.findIndex((item) => item.id === id);
      if (index !== -1) {
        items[index] = validated;
        this.writeToLocalStorage(items);
      }
    }

    this.notifyChange('update', validated);
    return validated;
  }

  async remove(id: string): Promise<void> {
    if (this.backend === 'indexedDB') {
      await deleteWatchlistFromIDB(id);
    } else {
      const items = this.readFromLocalStorage();
      const filtered = items.filter((item) => item.id !== id);
      this.writeToLocalStorage(filtered);
    }

    this.notifyChange('remove', { id });
  }

  async clear(): Promise<void> {
    if (this.backend === 'indexedDB') {
      await clearWatchlistIDB();
    } else {
      localStorage.removeItem(STORAGE_KEYS.WATCHLIST);
    }
    this.notifyChange('clear', null);
  }

  async export(): Promise<WatchlistExport> {
    const items = await this.list();
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      items,
    };
  }

  async import(data: unknown): Promise<{ added: number; updated: number; skipped: number }> {
    const validated = watchlistExportSchema.parse(data);
    const existing = await this.list();
    const existingMap = new Map(existing.map((item) => [getWatchlistItemKey(item), item]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of validated.items) {
      const key = getWatchlistItemKey(item);
      const current = existingMap.get(key);

      if (!current) {
        const { id, ...rest } = item as any;
        await this.upsert(rest);
        added++;
        continue;
      }

      const importDate = new Date(item.updatedAt || item.addedAt);
      const existingDate = new Date(current.updatedAt || current.addedAt);

      if (importDate > existingDate) {
        const { id, addedAt, ...rest } = item as any;
        await this.update(current.id!, { ...rest });
        updated++;
      } else {
        skipped++;
      }
    }

    return { added, updated, skipped };
  }

  getBackendInfo(): { backend: StorageBackend; itemCount: number } {
    return {
      backend: this.backend,
      itemCount: 0,
    };
  }

  private notifyChange(action: string, data: unknown): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ action, data, timestamp: Date.now() });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('watchlist-changed', {
          detail: { source: 'local', action },
        })
      );
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === STORAGE_KEYS.WATCHLIST && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('watchlist-changed', {
          detail: { source: 'storage' },
        })
      );
    }
  }

  private handleBroadcastMessage(event: MessageEvent): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('watchlist-changed', {
          detail: { source: 'broadcast', action: event.data?.action },
        })
      );
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.removeEventListener('message', this.broadcastHandler);
      this.broadcastChannel.close();
    }
  }
}

let storeInstance: LocalWatchlistStore | null = null;

export function getWatchlistStore(): LocalWatchlistStore {
  if (!storeInstance) {
    storeInstance = new LocalWatchlistStore();
  }
  return storeInstance;
}
