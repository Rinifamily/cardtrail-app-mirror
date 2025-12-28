import { z } from 'zod';

/**
 * Storage Keys
 * Version-controlled keys for localStorage and IndexedDB
 */
export const STORAGE_KEYS = {
  COLLECTION: 'cardtrail_collection_v1',
  WATCHLIST: 'cardtrail_watchlist_v1',
  SETTINGS: 'cardtrail_settings_v1',
  COLLECTION_BACKUP: 'cardtrail_collection_backup_v1',
  WATCHLIST_BACKUP: 'cardtrail_watchlist_backup_v1',
} as const;

/**
 * IndexedDB Configuration
 */
export const IDB_CONFIG = {
  COLLECTION_DB: 'cardtrail_collection',
  WATCHLIST_DB: 'cardtrail_watchlist',
  COLLECTION_STORE: 'collection_items',
  WATCHLIST_STORE: 'watchlist_items',
  VERSION: 1,
} as const;

/**
 * Storage Thresholds
 */
export const STORAGE_THRESHOLDS = {
  MAX_LOCALSTORAGE_ITEMS: 100,
  MAX_NOTES_LENGTH: 500,
  MAX_QUANTITY: 999,
} as const;

/**
 * LocalCollectionItem Schema
 * Mirrors future Supabase collections table
 */
export const localCollectionItemSchema = z.object({
  id: z.string().uuid().optional(), // Client-generated UUID for IndexedDB
  cardId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(STORAGE_THRESHOLDS.MAX_QUANTITY),
  purchasePrice: z.number().min(0),
  purchaseCurrency: z.enum(['CNY', 'USD', 'JPY']),
  purchaseDate: z.string().datetime(),
  grade: z.enum(['raw', 'psa8', 'psa9', 'psa10']).optional(),
  gradingCompany: z.enum(['PSA', 'BGS', 'CGC']).optional(),
  notes: z.string().max(STORAGE_THRESHOLDS.MAX_NOTES_LENGTH).optional(),
  addedAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  migrationStatus: z.enum(['pending', 'synced']).optional(),
});

export type LocalCollectionItem = z.infer<typeof localCollectionItemSchema>;

/**
 * LocalWatchlistItem Schema
 * Mirrors future Supabase watchlists table
 */
export const localWatchlistItemSchema = z.object({
  id: z.string().uuid().optional(),
  cardId: z.number().int().positive(),
  targetPrice: z.number().min(0).optional(),
  targetCurrency: z.enum(['CNY', 'USD', 'JPY']).optional(),
  alertEnabled: z.boolean(),
  notes: z.string().max(STORAGE_THRESHOLDS.MAX_NOTES_LENGTH).optional(),
  addedAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  migrationStatus: z.enum(['pending', 'synced']).optional(),
});

export type LocalWatchlistItem = z.infer<typeof localWatchlistItemSchema>;

/**
 * Export Format Schema
 * Versioned export format for data portability
 */
export const collectionExportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  items: z.array(localCollectionItemSchema),
});

export type CollectionExport = z.infer<typeof collectionExportSchema>;

export const watchlistExportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  items: z.array(localWatchlistItemSchema),
});

export type WatchlistExport = z.infer<typeof watchlistExportSchema>;

/**
 * Storage Error Types
 */
export class StorageQuotaError extends Error {
  constructor(message = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class StorageValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'StorageValidationError';
  }
}

export class StorageNotAvailableError extends Error {
  constructor(message = 'Storage not available') {
    super(message);
    this.name = 'StorageNotAvailableError';
  }
}

/**
 * Helper function to check if error is quota-related
 */
export function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return (
      error.code === 22 ||
      error.name === 'QuotaExceededError' ||
      error.message.toLowerCase().includes('quota')
    );
  }
  return false;
}

/**
 * Helper to generate unique composite key for deduplication
 */
export function getCollectionItemKey(item: LocalCollectionItem): string {
  return `${item.cardId}_${item.grade || 'raw'}_${item.purchaseDate}`;
}

/**
 * Helper to deduplicate watchlist entries (one per card)
 */
export function getWatchlistItemKey(item: Pick<LocalWatchlistItem, 'cardId'>): string {
  return `${item.cardId}`;
}
