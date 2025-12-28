# Local Storage Strategy (Phases 05-06)

_Last updated: 2025-12-05_

## 🎯 Purpose
Document how CardTrail stores user portfolio and watchlist data locally while authentication is deferred. Defines schemas, fallbacks, validation, and migration guardrails for Phase 05 (Local Collection) and Phase 06 (Local Watchlist) so Phase 09 can lift data into Supabase without loss.

## 📦 Storage Overview
- Primary storage: `localStorage` (synchronous, 5 MB limit per origin)
- Fallback: IndexedDB (`cardtrail_collection`, `cardtrail_watchlist`) automatically engaged after 100 items or quota errors
- Sync: BroadcastChannel + `storage` events keep multiple tabs in sync
- Versioning: `schemaVersion` stored alongside payload; bump when breaking changes occur

## 🔑 Storage Keys
```typescript
export const STORAGE_KEYS = {
  COLLECTION: 'cardtrail_collection_v1',
  WATCHLIST: 'cardtrail_watchlist_v1',
  SETTINGS: 'cardtrail_settings_v1'
} as const;
```

## 🧱 Schemas
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
  updatedAt?: string;
  migrationStatus?: 'pending' | 'synced';
}

export interface LocalWatchlistItem {
  cardId: number;
  targetPrice?: number;
  targetCurrency?: 'CNY' | 'USD' | 'JPY';
  alertEnabled: boolean;
  addedAt: string; // ISO 8601
  updatedAt?: string;
  migrationStatus?: 'pending' | 'synced';
}
```
- Zod schemas mirror these interfaces (no `any`).
- `migrationStatus` reserved for Phase 09 tracking.

## 🧰 Storage Services
Each store (collection/watchlist/settings) uses the same repository pattern:
1. Attempt `localStorage` read/write.
2. On quota error or >100 items, persist to IndexedDB via `idb` package (object stores `collection_items`, `watchlist_items`).
3. Write-through strategy ensures both stores stay in sync until migration clears local copies.
4. BroadcastChannel notifies other tabs about updates.

## 📤 Export / 📥 Import
- Export JSON format: `{ schemaVersion: 1, exportedAt: ISO, items: [...] }`
- Import pipeline:
  1. Parse JSON & validate with Zod.
  2. Deduplicate by `(cardId, grade, purchaseDate)`.
  3. Merge notes/quantities; keep latest `updatedAt`.
  4. Record audit log (console for now, Sentry later).
- UI must display warnings + success counts; encourage exporting before migration.

## 🛡️ Validation & Error Handling
- All mutations pass through Zod schemas (client + server for future APIs).
- Quota handling: catch `DOMException` code `22` or message containing `quota` and show actionable toast ("导出并清理数据以释放空间")
- Data corruption fallback: maintain backup keys (`*_backup_v1`) before destructive operations.

## 📲 IndexedDB Details
- DB names: `cardtrail_collection`, `cardtrail_watchlist`
- Object store keyPath: `id` (uuid)
- Secondary indexes: `cardId`, `addedAt`
- Version upgrades used to align schema with Supabase when necessary
- Automatic migration: repository moves existing localStorage items into IndexedDB when threshold reached

## 🔁 Migration Hooks (Phase 09)
- Keep `addedAt`/`updatedAt` precise to support "latest wins" conflict resolution.
- Store `migrationStatus` so Phase 09 knows which entries already synced.
- After successful cloud migration, clear local storage and remove IndexedDB stores. Provide explicit user confirmation.

## ⚠️ Constraints & Warnings
- Never store secrets or auth tokens locally.
- Display persistent banner: "数据暂存本地，登录后将同步到云端 (Phase 09)."
- Limit notes field to 500 chars to avoid exceeding quotas.
- Use `Intl.NumberFormat` for currency display even with local data.

## 🧪 Testing Checklist
- Unit tests mocking localStorage + IndexedDB shim for CRUD, export/import, quota fallback.
- Playwright flows covering add/edit/delete/export/import + multi-tab sync.
- Manual QA: exceed 5 MB limit via script, verify fallback + messaging.

## 📚 References
- `implementation/phase-05-local-collection/tasks/01-local-collection.md`
- `implementation/phase-06-local-watchlist/tasks/01-local-watchlist.md`
- `planning/data-migration.md`
- MDN: [IndexedDB](https://developer.mozilla.org/docs/Web/API/IndexedDB_API)
