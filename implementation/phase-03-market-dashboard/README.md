# Phase 03: Market Dashboard (大盘)

## 🎯 Overview
Phase 03 transforms the Phase 01 market tables into a CTI dashboard that feels real-time even before live data exists. We ship a hero CTI card, K-line (candlestick) chart, gainers/losers list, and market overview modules using placeholder/seed data that can later be swapped out by Phase 07 ingestion.

## ✅ Goals
- Present CTI + sub-index cards with animated delta indicators and localized copy (中/英)
- Render candlestick charts + sparklines that adapt to mobile/desktop layouts
- Surface top gainers/losers and volume stats fed by `price_history` + `transactions`
- Provide scaffolding for “real-time” feel (optimistic updates + faux streaming indicators)

## 🔗 Prerequisites
- Phase 01 tables populated (or seeded) for price history + market indices
- Phase 02 card detail components (charts, pills) available for reuse
- Read `planning/price-algorithm.md` for CTI math + weighting

## 📦 Deliverables
- [ ] README + Phase task covering dashboard composition
- [ ] `/market` route with CTI hero, candlestick chart, sub-index carousel, gainers/losers list, volume stats
- [ ] Placeholder data adapter (JSON fixtures) until Phase 07 wires real ingestion
- [ ] Animation + loading states that mimic live data (pulse, shimmer)
- [ ] Testing notes for layout + chart accuracy

## 🧪 Testing Strategy
- Snapshot tests for CTI hero + gainers list to catch copy regressions
- Playwright flow verifying timeframe pills update chart + cards
- Manual QA on low-end Android emulator for chart performance

## ⚠️ Known Limitations
- Data freshness simulated via timers; replaced in Phase 07
- Sentiment/news widgets out of scope until actual integrations exist
- Accessibility for charts limited to descriptive text + summary callouts (full ARIA planned later)

## 📚 References
- `planning/price-algorithm.md`
- `planning/design.md#market-dashboard`
- `planning/feature-breakdown.md` (Phase 03 scope)
