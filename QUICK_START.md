# Phase 05 Local Collection - Quick Start Guide

## 🚀 Getting Started

### Installation
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Testing
```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Type check
pnpm typecheck
```

---

## 📖 Using the Collection Feature

### Navigate to Collection Page
```
http://localhost:3000/collection
```

### Add an Item
1. Click "Add Item" button
2. Fill in required fields:
   - Card ID
   - Quantity
   - Purchase Price & Currency
   - Purchase Date
3. Optionally add:
   - Grade (raw, PSA 8/9/10)
   - Grading Company (PSA, BGS, CGC)
   - Notes (max 500 chars)
4. Click "Save"

### Edit an Item
1. Click the edit icon (pencil) on any item
2. Modify fields as needed
3. Click "Save"

### Delete an Item
1. Click the delete icon (trash) once
2. Click again within 3 seconds to confirm

### Filter & Search
- **Search:** Type card ID or notes in search box
- **Filter by Grade:** Select grade from dropdown

### Export Collection
1. Scroll to "Export & Import" section
2. Click "Export JSON"
3. File downloads automatically

### Import Collection
1. Scroll to "Export & Import" section
2. Click "Import JSON"
3. Select your JSON file
4. Review import results:
   - Added: New items
   - Updated: Items with newer data
   - Skipped: Duplicate/older items

---

## 🔧 Developer Guide

### Using the Storage Service

```typescript
import { getCollectionStore } from '@/lib/storage/local-collection-store';

const store = getCollectionStore();

// List all items
const items = await store.list();

// Add new item
await store.upsert({
  cardId: 123,
  quantity: 2,
  purchasePrice: 99.99,
  purchaseCurrency: 'CNY',
  purchaseDate: new Date().toISOString(),
  grade: 'psa10',
  gradingCompany: 'PSA',
  notes: 'Mint condition',
});

// Update item
await store.update(itemId, { quantity: 5 });

// Delete item
await store.remove(itemId);

// Export
const exportData = await store.export();

// Import
const result = await store.import(jsonData);
console.log(result); // { added: 1, updated: 0, skipped: 0 }
```

### Creating New Schemas

Add to `packages/shared-types/src/local-storage.ts`:

```typescript
// 1. Define interface
export interface LocalWatchlistItem {
  cardId: number;
  targetPrice?: number;
  alertEnabled: boolean;
  // ...
}

// 2. Create Zod schema
export const localWatchlistItemSchema = z.object({
  cardId: z.number().int().positive(),
  targetPrice: z.number().min(0).optional(),
  alertEnabled: z.boolean(),
  // ...
});

// 3. Export type
export type LocalWatchlistItem = z.infer<typeof localWatchlistItemSchema>;
```

### Adding New Storage Backends

Extend `LocalCollectionStore`:

```typescript
private async readFromBackend(): Promise<LocalCollectionItem[]> {
  if (this.backend === 'indexedDB') {
    return await getAllFromIDB();
  } else if (this.backend === 'customBackend') {
    // Implement custom backend
  } else {
    return this.readFromLocalStorage();
  }
}
```

### Cross-Tab Sync

Listen for changes in components:

```typescript
useEffect(() => {
  const handleChange = (event: CustomEvent) => {
    console.log('Collection changed:', event.detail);
    loadItems();
  };
  
  window.addEventListener('collection-changed', handleChange as EventListener);
  return () => {
    window.removeEventListener('collection-changed', handleChange as EventListener);
  };
}, []);
```

---

## 🐛 Troubleshooting

### Storage Quota Exceeded
**Symptoms:** Error when adding items after ~100 entries  
**Solution:** System automatically switches to IndexedDB

### Data Not Syncing Across Tabs
**Check:**
1. BroadcastChannel is supported (modern browsers)
2. Both tabs on same origin
3. Check browser console for errors

### Import Validation Fails
**Common Issues:**
- Wrong schema version (must be 1)
- Missing required fields (cardId, quantity, purchasePrice, etc.)
- Invalid date formats (must be ISO 8601)
- Currency not in [CNY, USD, JPY]

**Solution:**
```typescript
// Check exported format
{
  "schemaVersion": 1,
  "exportedAt": "2024-12-06T15:30:00.000Z",
  "items": [
    {
      "cardId": 123,
      "quantity": 1,
      "purchasePrice": 10,
      "purchaseCurrency": "CNY",
      "purchaseDate": "2024-12-06T00:00:00.000Z",
      "addedAt": "2024-12-06T15:30:00.000Z"
    }
  ]
}
```

### Tests Failing

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Run tests
pnpm test

# If IndexedDB errors in tests, check mocks in test files
```

---

## 📊 Monitoring

### Check Current Backend
```typescript
const store = getCollectionStore();
const info = store.getBackendInfo();
console.log(info.backend); // 'localStorage' or 'indexedDB'
```

### Storage Usage
```javascript
// Check localStorage usage
const used = new Blob([localStorage.getItem('cardtrail_collection_v1') || '']).size;
console.log(`Storage used: ${(used / 1024).toFixed(2)} KB`);
```

### Debug Mode
```typescript
// Enable in localStorage.ts
const DEBUG = true;

// Will log:
// - Backend switches
// - Quota errors
// - Import/export operations
```

---

## 🔗 Related Files

### Core Logic
- `apps/web/lib/storage/local-collection-store.ts` - Main repository
- `apps/web/lib/storage/indexeddb.ts` - IndexedDB adapter
- `packages/shared-types/src/local-storage.ts` - Schemas & types

### UI Components
- `apps/web/app/(collection)/collection/CollectionContent.tsx` - Main container
- `apps/web/components/collection/*` - Individual components

### Tests
- `packages/shared-types/__tests__/local-storage.test.ts` - Schema tests
- `apps/web/__tests__/lib/storage/local-collection-store.test.ts` - Storage tests
- `apps/web/e2e/collection.spec.ts` - E2E tests

---

## 📚 Additional Resources

- [Phase 05 Summary](./PHASE_05_SUMMARY.md)
- [Shared Types README](./packages/shared-types/README.md)
- [Implementation README](./implementation/phase-05-local-collection/README.md)
- [Task Specification](./implementation/phase-05-local-collection/tasks/01-local-collection.md)

---

## 🤝 Contributing

When extending this feature:

1. **Add tests first** - TDD approach
2. **Update schemas** - Keep types in sync
3. **Document changes** - Update relevant READMEs
4. **Run full suite** - `pnpm test && pnpm typecheck`
5. **Consider Phase 09** - Ensure compatibility with future cloud sync

---

## ❓ Need Help?

- Check [Planning Docs](./planning/)
- Review test files for usage examples
- Check browser DevTools console for errors
- Verify storage limits haven't been exceeded
