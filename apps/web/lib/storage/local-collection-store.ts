import {
  LocalCollectionItem,
  localCollectionItemSchema,
  STORAGE_KEYS,
  STORAGE_THRESHOLDS,
  StorageQuotaError,
  StorageValidationError,
  StorageNotAvailableError,
  isQuotaError,
  getCollectionItemKey,
  CollectionExport,
  collectionExportSchema,
} from '@cardtrail/shared-types';
import {
  getAllCollectionFromIDB,
  getCollectionFromIDB,
  putCollectionInIDB,
  deleteCollectionFromIDB,
  clearCollectionIDB,
  isIndexedDBAvailable,
} from './indexeddb';

type StorageBackend = 'localStorage' | 'indexedDB';

/**
 * LocalCollectionStore
 * Repository pattern for managing collection storage with localStorage + IndexedDB fallback
 */
export class LocalCollectionStore {
  private backend: StorageBackend = 'localStorage';
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for storage events from other tabs (localStorage only)
      window.addEventListener('storage', this.handleStorageEvent.bind(this));

      // Initialize BroadcastChannel for cross-tab sync
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('collection');
        this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
      }

      // Detect current backend
      this.detectBackend();
    }
  }

  /**
   * Detect which storage backend is currently in use
   */
  private detectBackend(): void {
    try {
      const pointer = localStorage.getItem(`${STORAGE_KEYS.COLLECTION}_pointer`);
      if (pointer === 'indexedDB') {
        this.backend = 'indexedDB';
      }
    } catch {
      // Fall back to indexedDB if localStorage not available
      if (isIndexedDBAvailable()) {
        this.backend = 'indexedDB';
      }
    }
  }

  /**
   * Switch to IndexedDB backend
   */
  private async switchToIndexedDB(): Promise<void> {
    if (this.backend === 'indexedDB') {
      return;
    }

    console.log('Switching to IndexedDB backend...');

    try {
      // Migrate existing data from localStorage to IndexedDB
      const existingData = this.readFromLocalStorage();
      for (const item of existingData) {
        await putCollectionInIDB(item);
      }

      // Set pointer in localStorage
      localStorage.setItem(`${STORAGE_KEYS.COLLECTION}_pointer`, 'indexedDB');

      // Clear localStorage data to free space
      localStorage.removeItem(STORAGE_KEYS.COLLECTION);

      this.backend = 'indexedDB';
      console.log('Successfully switched to IndexedDB');
    } catch (error) {
      console.error('Failed to switch to IndexedDB:', error);
      throw new StorageNotAvailableError('Failed to migrate to IndexedDB');
    }
  }

  /**
   * Read from localStorage
   */
  private readFromLocalStorage(): LocalCollectionItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COLLECTION);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return [];
    }
  }

  /**
   * Write to localStorage
   */
  private writeToLocalStorage(items: LocalCollectionItem[]): void {
    try {
      // Create backup before writing
      const existing = localStorage.getItem(STORAGE_KEYS.COLLECTION);
      if (existing) {
        localStorage.setItem(STORAGE_KEYS.COLLECTION_BACKUP, existing);
      }

      localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(items));
    } catch (error) {
      if (isQuotaError(error)) {
        throw new StorageQuotaError('localStorage quota exceeded');
      }
      throw error;
    }
  }

  /**
   * List all collection items
   */
  async list(): Promise<LocalCollectionItem[]> {
    try {
      if (this.backend === 'indexedDB') {
        return await getAllCollectionFromIDB();
      } else {
        return this.readFromLocalStorage();
      }
    } catch (error) {
      console.error('Failed to list collection:', error);
      return [];
    }
  }

  /**
   * Get a single item by ID
   */
  async get(id: string): Promise<LocalCollectionItem | null> {
    try {
      if (this.backend === 'indexedDB') {
        const item = await getCollectionFromIDB(id);
        return item || null;
      } else {
        const items = this.readFromLocalStorage();
        return items.find((item) => item.id === id) || null;
      }
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  }

  /**
   * Add or update a collection item
   */
  async upsert(item: Omit<LocalCollectionItem, 'id' | 'addedAt'>): Promise<LocalCollectionItem> {
    try {
      // Validate input
      const now = new Date().toISOString();
      const newItem: LocalCollectionItem = {
        ...item,
        id: crypto.randomUUID(),
        addedAt: now,
        updatedAt: now,
      };

      const validated = localCollectionItemSchema.parse(newItem);

      if (this.backend === 'indexedDB') {
        await putCollectionInIDB(validated);
      } else {
        const items = this.readFromLocalStorage();

        // Check if we need to switch to IndexedDB
        if (items.length >= STORAGE_THRESHOLDS.MAX_LOCALSTORAGE_ITEMS) {
          await this.switchToIndexedDB();
          await putCollectionInIDB(validated);
        } else {
          try {
            items.push(validated);
            this.writeToLocalStorage(items);
          } catch (error) {
            if (isQuotaError(error)) {
              // Quota exceeded, switch to IndexedDB
              await this.switchToIndexedDB();
              await putCollectionInIDB(validated);
            } else {
              throw error;
            }
          }
        }
      }

      // Notify other tabs
      this.notifyChange('upsert', validated);

      return validated;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw new StorageValidationError('Invalid collection item data', error);
      }
      throw error;
    }
  }

  /**
   * Update an existing item
   */
  async update(id: string, updates: Partial<LocalCollectionItem>): Promise<LocalCollectionItem> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Item with id ${id} not found`);
    }

    const updated: LocalCollectionItem = {
      ...existing,
      ...updates,
      id: existing.id,
      addedAt: existing.addedAt,
      updatedAt: updates.updatedAt || new Date().toISOString(),
    };

    const validated = localCollectionItemSchema.parse(updated);

    if (this.backend === 'indexedDB') {
      await putCollectionInIDB(validated);
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

  /**
   * Remove an item
   */
  async remove(id: string): Promise<void> {
    if (this.backend === 'indexedDB') {
      await deleteCollectionFromIDB(id);
    } else {
      const items = this.readFromLocalStorage();
      const filtered = items.filter((item) => item.id !== id);
      this.writeToLocalStorage(filtered);
    }

    this.notifyChange('remove', { id });
  }

  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    if (this.backend === 'indexedDB') {
      await clearCollectionIDB();
    } else {
      localStorage.removeItem(STORAGE_KEYS.COLLECTION);
    }

    this.notifyChange('clear', null);
  }

  /**
   * Export collection to JSON
   */
  async export(): Promise<CollectionExport> {
    const items = await this.list();
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * Import collection from JSON
   */
  async import(data: unknown): Promise<{ added: number; updated: number; skipped: number }> {
    // Validate import data
    const validated = collectionExportSchema.parse(data);

    const existing = await this.list();
    const existingKeys = new Map(existing.map((item) => [getCollectionItemKey(item), item]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of validated.items) {
      const key = getCollectionItemKey(item);
      const existingItem = existingKeys.get(key);

      if (!existingItem) {
        // New item - remove id if present to let upsert generate new one
        const { id, ...itemWithoutId } = item as any;
        await this.upsert(itemWithoutId);
        added++;
      } else {
        // Check if import is newer
        const importDate = new Date(item.updatedAt || item.addedAt);
        const existingDate = new Date(existingItem.updatedAt || existingItem.addedAt);

        if (importDate > existingDate) {
          // Update with imported data, excluding id and addedAt
          const { id, addedAt, ...updates } = item as any;
          await this.update(existingItem.id!, updates);
          updated++;
        } else {
          skipped++;
        }
      }
    }

    return { added, updated, skipped };
  }

  /**
   * Get storage backend info
   */
  getBackendInfo(): { backend: StorageBackend; itemCount: number } {
    return {
      backend: this.backend,
      itemCount: 0, // Will be populated by async call
    };
  }

  /**
   * Notify other tabs about changes
   */
  private notifyChange(action: string, data: unknown): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ action, data, timestamp: Date.now() });
    }
  }

  /**
   * Handle storage events from other tabs (localStorage)
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === STORAGE_KEYS.COLLECTION) {
      // Storage changed in another tab, trigger a refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('collection-changed', { detail: { source: 'storage' } }));
      }
    }
  }

  /**
   * Handle BroadcastChannel messages
   */
  private handleBroadcastMessage(event: MessageEvent): void {
    // Trigger refresh for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('collection-changed', {
          detail: { source: 'broadcast', action: event.data.action },
        })
      );
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

// Singleton instance
let storeInstance: LocalCollectionStore | null = null;

export function getCollectionStore(): LocalCollectionStore {
  if (!storeInstance) {
    storeInstance = new LocalCollectionStore();
  }
  return storeInstance;
}
