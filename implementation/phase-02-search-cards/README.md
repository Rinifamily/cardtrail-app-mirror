# Phase 02: Search & Card Display

## 🎯 Overview
Deliver a blazing-fast search experience for the 28,154-card `card_jp` dataset plus high-fidelity card detail pages powered by the Phase 01 public tables. Results must be mobile-first, leverage design.md specifications (pill filters, two-column grid), and stay fully functional without authentication.

## ✅ Goals
- Ship debounced full-text search (SQL trigram + prefix matching) with filters for set, rarity, year, and sort controls
- Build responsive card grids with infinite scroll (React Query + IntersectionObserver) and skeleton loading states
- Implement card detail pages that include price snapshots, history charts (Recharts), and recent transactions
- Ensure every Supabase query uses `.limit()` and proper error handling

## 🔗 Prerequisites
- Phase 01 migrations deployed so `price_history`, `market_indices`, and `transactions` exist
- Design tokens + component guidance from `planning/design.md`
- Read `planning/api-design.md` (search endpoints) and `planning/ui-component-hierarchy.md`

## 📦 Deliverables
- [ ] README + task files aligned with auth-deferred strategy
- [ ] Search API (Next.js route) with validation + pagination
- [ ] Search UI with filters, autocomplete, infinite scroll, and analytics logging
- [ ] Card detail route/page with price history chart, grade tabs, and recent transactions list
- [ ] Unit + e2e test plan documented in tasks

## 🧪 Testing Strategy
- Vitest coverage for search hooks (debounce, filter serialization)
- Playwright flow: landing page → query → scroll → open detail → chart rendering
- Manual QA on 375px + 1280px viewports verifying pill filters and sticky CTA row

## ⚠️ Known Limitations
- Price data uses placeholder values until Phase 07 ingestion
- Without auth, “Add to Collection/Watchlist” CTAs must route users to Phase 05/06 local flows rather than Supabase writes
- Search relevance weights will be tuned further once telemetry exists

## 📚 References
- `planning/design.md`
- `planning/feature-breakdown.md`
- `planning/frontend-architecture.md`
- `planning/api-design.md`
