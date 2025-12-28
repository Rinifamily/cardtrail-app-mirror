# Task: Local Watchlist & Price Alerts

**Task ID:** `phase-06-task-01`  
**Phase:** 06 – Local Watchlist & Alerts  
**Priority:** High  
**Estimated Time:** 12 hours  
**Dependencies:** Phase 05 storage utilities, Phase 01 price tables

---

## 🎯 Objective
Implement watchlist CRUD + alert evaluations stored locally with IndexedDB fallback, ensuring schemas align with future Supabase `watchlists` and `price_alerts` tables so Phase 09 can migrate data seamlessly.

---

## 📋 Context
With auth deferred, alerting must be entirely client-side. We still want users to rely on CardTrail for monitoring price targets, so we build a polished watchlist UI (mobile-first) and a lightweight alert engine that runs on app load. Every data shape mirrors the local schema defined below and documented in `planning/local-storage.md`.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Add cards to watchlist from card detail and search screens (reuse CTAs)
- [ ] Watchlist page with sections for active alerts and general monitoring
- [ ] Allow target price + currency + optional notes per watch entry
- [ ] Toggle `alertEnabled` and show status chips (Active, Snoozed)
- [ ] Alert engine runs on app load + manual refresh, comparing latest price vs target
- [ ] Notifications: in-app toast + optional PWA push placeholder (button disabled until Phase 10)
- [ ] Export/import shared with Phase 05 (same JSON payload, distinct key)

### Technical Requirements
- [ ] Storage schema:
```typescript
interface LocalWatchlistItem {
  cardId: number;
  targetPrice?: number;
  targetCurrency?: 'CNY' | 'USD' | 'JPY';
  alertEnabled: boolean;
  addedAt: string; // ISO 8601
}
```
- [ ] Use `STORAGE_KEYS.WATCHLIST = 'cardtrail_watchlist_v1'`
- [ ] Encapsulate logic in `localWatchlistStore` with same interface as collection store (list/upsert/remove/export/import)
- [ ] Alert evaluation obtains price from Phase 01 tables (limit 1) and calculates delta vs target
- [ ] Quota + IndexedDB fallback identical to Phase 05 approach
- [ ] All UI copy bilingual-ready and includes warning about future cloud sync

---

## 📝 Implementation Details

### Storage Module
- Reuse repository pattern: `createLocalStore<T>(key, schema)` returning methods + fallback support.
- Broadcast watchlist changes via `BroadcastChannel('watchlist')` for cross-tab sync.

### Alert Engine
```typescript
export async function evaluateAlerts(now = new Date()) {
  const items = await localWatchlistStore.list();
  const alerts = await Promise.all(items.filter(i => i.alertEnabled).map(async item => {
    const latestPrice = await getLatestPrice(item.cardId, item.targetCurrency ?? 'CNY');
    if (!latestPrice || !item.targetPrice) return null;
    if (latestPrice <= item.targetPrice) {
      return { cardId: item.cardId, latestPrice, target: item.targetPrice };
    }
    return null;
  }));
  return alerts.filter(Boolean);
}
```
- Trigger on app load and via “Check Alerts” button; throttle to once every 10 minutes.

### UI Components
1. **Watchlist Cards** – list with thumbnail, current price, target chip, toggle switch.
2. **Alert Drawer** – bottom sheet for editing target price/currency, includes Zod validation + slider.
3. **Notification Surface** – if alerts fired, show stacked toasts + optional modal summarizing triggered cards.
4. **PWA Prep** – show disabled button “开启推送通知 (Phase 10)” referencing upcoming feature.

### Migration Notes
- Store `migrationStatus?: 'pending' | 'synced'` placeholder for Phase 09.
- Keep `addedAt` to preserve ordering; include optional `updatedAt` for conflict resolution.

---

## 🧪 Testing Strategy

### Unit Tests
- Repository operations (add/remove/toggle) using mocked storage
- `evaluateAlerts` logic with mocked price helper and various target currencies

### E2E Tests
- Playwright: add card to watchlist, set target price below current, trigger evaluation, expect toast + visual indicator
- Verify export/import parity with Phase 05 format

### Manual QA
- Exceed 100 watchlist entries to ensure IndexedDB fallback 
- Toggle airplane mode to confirm alert evaluation handles network failures gracefully
- Confirm bilingual warning copy displays on watchlist page

---

## ✅ Acceptance Criteria
- [ ] Watchlist UI supports CRUD, filters, and sorting without auth
- [ ] Alert evaluation runs on load + manual trigger, showing toasts for matches
- [ ] Export/import works and shares schemaVersion metadata with collections
- [ ] IndexedDB fallback + quota errors handled identically to Phase 05
- [ ] Warning banner references Phase 09 migration
- [ ] Tests (unit + e2e) added and passing

---

## 📚 References
- `planning/local-storage.md`
- `planning/data-models.md`
- `planning/design.md#watchlist`
- MDN BroadcastChannel API

---

## 🚧 Known Limitations
- Alerts only evaluate when app open; no background worker until PWA service worker + push implemented
- Price fetch limited by Supabase rate limits; consider caching results per session
- No SMS/email notifications until Phase 09 cloud sync + Phase 08 auth

---

## 📊 Success Metrics
- Watchlist adoption rate > 30% of collection users
- Alert acknowledgement rate > 60% (user taps toast or opens modal)
- False-positive alerts < 1% (tracked once analytics available)
