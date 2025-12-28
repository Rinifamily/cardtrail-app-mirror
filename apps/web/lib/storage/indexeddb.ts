import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { LocalCollectionItem, LocalWatchlistItem } from '@cardtrail/shared-types';
import { IDB_CONFIG } from '@cardtrail/shared-types';

type StoreSchema<TItem, StoreName extends string> = DBSchema & {
  [K in StoreName]: {
    key: string;
    value: TItem;
    indexes: {
      cardId: number;
      addedAt: string;
    };
  };
};

interface StoreConfig<StoreName extends string> {
  dbName: string;
  storeName: StoreName;
}

function createIDBHelpers<TItem extends { id?: string }, StoreName extends string>(
  config: StoreConfig<StoreName>
) {
  type Schema = StoreSchema<TItem, StoreName>;
  let dbInstance: IDBPDatabase<Schema> | null = null;

  async function initDB(): Promise<IDBPDatabase<Schema>> {
    if (dbInstance) {
      return dbInstance;
    }

    dbInstance = await openDB<Schema>(config.dbName, IDB_CONFIG.VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(config.storeName as any)) {
          const store = db.createObjectStore(config.storeName as any, {
            keyPath: 'id',
          });
          store.createIndex('cardId' as any, 'cardId' as any);
          store.createIndex('addedAt' as any, 'addedAt' as any);
        }
      },
    });

    return dbInstance;
  }

  return {
    async getAll(): Promise<TItem[]> {
      const db = await initDB();
      return db.getAll(config.storeName as any);
    },
    async get(id: string): Promise<TItem | undefined> {
      const db = await initDB();
      return db.get(config.storeName as any, id as any);
    },
    async put(item: TItem): Promise<string> {
      const db = await initDB();
      await db.put(config.storeName as any, item as any);
      return item.id as string;
    },
    async delete(id: string): Promise<void> {
      const db = await initDB();
      await db.delete(config.storeName as any, id as any);
    },
    async clear(): Promise<void> {
      const db = await initDB();
      await db.clear(config.storeName as any);
    },
    async getByCardId(cardId: number): Promise<TItem[]> {
      const db = await initDB();
      return db.getAllFromIndex(config.storeName as any, 'cardId' as any, cardId as any);
    },
  };
}

const collectionIDB = createIDBHelpers<LocalCollectionItem, typeof IDB_CONFIG.COLLECTION_STORE>({
  dbName: IDB_CONFIG.COLLECTION_DB,
  storeName: IDB_CONFIG.COLLECTION_STORE,
});

const watchlistIDB = createIDBHelpers<LocalWatchlistItem, typeof IDB_CONFIG.WATCHLIST_STORE>({
  dbName: IDB_CONFIG.WATCHLIST_DB,
  storeName: IDB_CONFIG.WATCHLIST_STORE,
});

export const {
  getAll: getAllCollectionFromIDB,
  get: getCollectionFromIDB,
  put: putCollectionInIDB,
  delete: deleteCollectionFromIDB,
  clear: clearCollectionIDB,
  getByCardId: getCollectionByCardIdFromIDB,
} = collectionIDB;

export const {
  getAll: getAllWatchlistFromIDB,
  get: getWatchlistFromIDB,
  put: putWatchlistInIDB,
  delete: deleteWatchlistFromIDB,
  clear: clearWatchlistIDB,
  getByCardId: getWatchlistByCardIdFromIDB,
} = watchlistIDB;

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
