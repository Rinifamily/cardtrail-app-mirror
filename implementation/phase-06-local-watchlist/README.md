# Phase 06: Local Watchlist & Alerts (本地关注)

## 🎯 Overview
Phase 06 extends the local-first strategy to watchlists and lightweight alerts. Users can monitor desired cards, set price targets, and receive local notifications (app load checks + future PWA push) without authentication.

## ✅ Goals
- Maintain watchlist entries in `localStorage`/IndexedDB schemas aligned with future Supabase tables
- Provide UI for add/remove/reorder watchlist items and configure local alert thresholds
- Run local price checks on app load and surface alert banners/toasts when thresholds met
- Prepare PWA push notification hooks for later activation once service workers + auth exist

## 🔗 Prerequisites
- Phase 05 storage utilities (reuse repository + IndexedDB fallback)
- Price data available from Phase 01
- Planning docs: `planning/local-storage.md`, `planning/data-models.md`

## 📦 Deliverables
- [ ] Watchlist management UI (list, filters, drag-sort)
- [ ] Alert configuration drawer (target price + currency)
- [ ] Local alert engine executed on app load + manual refresh
- [ ] PWA push scaffolding (service worker registration + permission prompts deferred)
- [ ] README + task spec referencing migration + storage quotas

## 🧪 Testing Strategy
- Unit tests for watchlist storage + alert evaluation functions
- Playwright flow verifying watchlist add/remove and alert trigger
- Manual QA checking quota handling + warning banners

## ⚠️ Known Limitations
- Alerts evaluated only on app load or manual refresh (no true background service yet)
- Push notifications placeholder until service workers/auth available
- Data remains device-specific until Phase 09

## 📚 References
- `planning/local-storage.md`
- `planning/data-models.md`
- `planning/feature-breakdown.md`
