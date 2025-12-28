# Task: Local Collection Storage & UI

**Task ID:** `phase-05-task-01`  
**Phase:** 05 – Local Collection  
**Priority:** High  
**Estimated Time:** 14 hours  
**Dependencies:** Phases 01-04 data availability, `planning/local-storage.md`

---

## 🎯 Objective
Implement local-first collection management using `localStorage` + IndexedDB fallback so users can build a portfolio before authentication exists. Provide CRUD UI, portfolio analytics, export/import, and clear migration messaging toward Phase 09 cloud sync.

---

## 📋 Context
External auth credentials are delayed, but users still need to track holdings. This task creates deterministic local schemas that mirror the future Supabase `collections` table. By enforcing Zod validation today, Phase 09 can safely migrate data to the cloud with minimal transformation.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Add/edit/remove collection items stored under `STORAGE_KEYS.COLLECTION`
- [ ] Portfolio summary card showing invested amount, estimated value (using Phase 01 prices), and paper P&L
- [ ] Filters by grade, set, and acquisition year; search by card name
- [ ] Export (JSON file) + import (JSON upload) with validation feedback
- [ ] Warning banner (“⚠️ 本地数据，Phase 09 将同步云端”) displayed persistently
- [ ] IndexedDB fallback when collection length > 100 or quota error occurs

### Technical Requirements
- [ ] Define schemas in `packages/shared-types/local-storage.ts` using Zod (no `any`)
- [ ] All operations run through a repository (`localCollectionStore`) that abstracts storage backend (localStorage or IndexedDB)
- [ ] Use BroadcastChannel or `storage` event to sync changes across tabs
- [ ] Handle quota errors gracefully with toast + instructions to export/delete data
- [ ] Export format versioned (`schemaVersion: 1`) to ease migration

---

## 📝 Implementation Details

### Schema Definitions
```typescript
export interface LocalCollectionItem {
  cardId: number;
  quantity: number;
  purchasePrice: number;
  purchaseCurrency: 'CNY' | 'USD' | 'JPY';
  purchaseDate: string; // ISO 8601
  grade?: 'raw' | 'psa8' | 'psa9' | 'psa10';
  gradingCompany?: 'PSA' | 'BGS' | 'CGC';
  notes?: string;
  addedAt: string; // ISO 8601
}

export const STORAGE_KEYS = {
  COLLECTION: 'cardtrail_collection_v1',
  WATCHLIST: 'cardtrail_watchlist_v1',
  SETTINGS: 'cardtrail_settings_v1'
} as const;
```
Use matching Zod schema:
```typescript
export const localCollectionSchema = z.object({
  cardId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
  purchasePrice: z.number().min(0),
  purchaseCurrency: z.enum(['CNY','USD','JPY']),
  purchaseDate: z.string().datetime(),
  grade: z.enum(['raw','psa8','psa9','psa10']).optional(),
  gradingCompany: z.enum(['PSA','BGS','CGC']).optional(),
  notes: z.string().max(500).optional(),
  addedAt: z.string().datetime()
});
```

### Storage Service
- `localCollectionStore` exposes `list`, `upsert`, `remove`, `clear`, `export`, `import`.
- Detect quota errors (`DOMException.code === 22` or message includes "quota"); when triggered, switch to IndexedDB using `idb` package (already allowed in planning) and store pointer in `localStorage`.
- Use `BroadcastChannel('collection')` to notify other tabs on changes.

### IndexedDB Fallback
- Database name: `cardtrail_collection`
- Object store: `items`, keyPath `id` (generated via `crypto.randomUUID()`)
- Mirror same schema; ensure syncing between stores by writing through repository abstraction.

### Portfolio Analytics
- Combine local holdings with price data via helper `getLatestPrice(cardId, grade)` which queries Supabase (read-only, `.limit(1)`). Cache results in memory for session.
- Display metrics: total invested, estimated value, paper P&L (color-coded), holdings count.

### Export / Import
- Export writes JSON `{ schemaVersion: 1, exportedAt: ISO, items: [...] }` and triggers file download.
- Import validates JSON via Zod; show diff summary (added/updated/skipped) and handle duplicates by merging on `(cardId, grade, purchaseDate)`.

### Migration Notes (Phase 09)
- Tag each item with `migrationStatus?: 'pending' | 'synced'` once Phase 09 runs.
- Keep `addedAt` + `updatedAt` timestamps accurate for conflict resolution later.

---

## 🧪 Testing Strategy

### Unit Tests
- Repository operations mocked with `fakeLocalStorage` to ensure CRUD + quota handling logic
- Export/import validator verifying invalid JSON shows descriptive errors

### E2E Tests
- Playwright: add card from detail page CTA, verify list entry, edit quantity, export JSON, clear store, import same file, confirm data restored

### Manual QA
- Fill >100 entries using script; confirm automatically switches to IndexedDB and surfaces toast explaining why
- Open two tabs, edit in one, ensure other updates via BroadcastChannel
- Trigger quota error via DevTools (Application → Clear storage) to confirm messaging

---

## ✅ Acceptance Criteria
- [ ] Collection data persists across reloads and between tabs
- [ ] UI surfaces P&L metrics derived from public price tables with `.limit()` queries
- [ ] Export/import works with schema validation + descriptive error states
- [ ] IndexedDB fallback engages automatically when exceeding 100 items or encountering quota error
- [ ] Warning banner references forthcoming Phase 09 migration with bilingual text
- [ ] Unit + e2e tests pass in CI

---

## 📚 References
- `planning/local-storage.md`
- `planning/data-models.md#local-storage`
- `planning/design.md#portfolio`
- MDN storage quota guide: https://developer.mozilla.org/docs/Web/API/IndexedDB_API/Using_IndexedDB

---

## 🚧 Known Limitations
- No multi-device sync until Phase 09; emphasize export reminder
- IndexedDB fallback still subject to browser limits (~50MB)
- Currency conversion relies on static rates (update once FX service integrated)

---

## 📊 Success Metrics
- Conversion rate from “Add to Collection” CTA > 25%
- Export feature used by at least 10% of collection users weekly (tracked via console log placeholder)
- Error rate for import < 2% after validation improvements
