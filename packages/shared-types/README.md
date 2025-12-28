# @cardtrail/shared-types

Shared TypeScript types and Zod schemas for CardTrail local storage.

## Overview

This package provides type-safe schemas and utilities for managing local collection and watchlist data. It's designed to mirror the future Supabase database schema, enabling seamless migration in Phase 09.

## Features

- ✅ Zod schemas for runtime validation
- ✅ TypeScript types with full inference
- ✅ Storage error types
- ✅ Export/import format schemas
- ✅ Helper utilities for deduplication
- ✅ Comprehensive test coverage

## Installation

```bash
pnpm add @cardtrail/shared-types
```

## Usage

### Collection Items

```typescript
import { 
  LocalCollectionItem, 
  localCollectionItemSchema,
  STORAGE_KEYS 
} from '@cardtrail/shared-types';

// Validate data
const item = {
  cardId: 123,
  quantity: 2,
  purchasePrice: 99.99,
  purchaseCurrency: 'CNY',
  purchaseDate: new Date().toISOString(),
  grade: 'psa10',
  gradingCompany: 'PSA',
  notes: 'Rare find!',
  addedAt: new Date().toISOString(),
};

const validated = localCollectionItemSchema.parse(item);
```

### Export/Import

```typescript
import { collectionExportSchema, CollectionExport } from '@cardtrail/shared-types';

// Create export
const exportData: CollectionExport = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  items: [/* ... */],
};

// Validate import
const imported = collectionExportSchema.parse(jsonData);
```

### Error Handling

```typescript
import { 
  StorageQuotaError,
  StorageValidationError,
  isQuotaError 
} from '@cardtrail/shared-types';

try {
  // Storage operation
} catch (error) {
  if (isQuotaError(error)) {
    throw new StorageQuotaError('Please export and clear data');
  }
}
```

## Storage Keys

Predefined keys for localStorage and IndexedDB:

```typescript
STORAGE_KEYS.COLLECTION        // 'cardtrail_collection_v1'
STORAGE_KEYS.WATCHLIST         // 'cardtrail_watchlist_v1'
STORAGE_KEYS.SETTINGS          // 'cardtrail_settings_v1'
STORAGE_KEYS.COLLECTION_BACKUP // 'cardtrail_collection_backup_v1'
STORAGE_KEYS.WATCHLIST_BACKUP  // 'cardtrail_watchlist_backup_v1'
```

## Thresholds

```typescript
STORAGE_THRESHOLDS.MAX_LOCALSTORAGE_ITEMS  // 100
STORAGE_THRESHOLDS.MAX_NOTES_LENGTH        // 500
STORAGE_THRESHOLDS.MAX_QUANTITY            // 999
```

## Testing

```bash
pnpm test
```

## Migration Notes

All schemas include `migrationStatus` field for Phase 09 cloud sync:

- `pending`: Not yet synced to cloud
- `synced`: Successfully migrated to Supabase

## License

MIT
