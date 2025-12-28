# Phase 04: Rankings (榜单)

## 🎯 Overview
Phase 04 delivers opinionated leaderboards—涨幅榜, 跌幅榜, 成交量榜, and 热门榜—built entirely on public market data so users can discover trends before authentication exists. The UX follows design.md: badge styling for top 3, borderless tables, pill filters, and mobile-friendly horizontal scrolling.

## ✅ Goals
- Calculate and display ranking lists for multiple timeframes (24h/7d/30d)
- Support quick filtering by rarity, grade, and language without server mutation
- Provide side-by-side comparison CTA that links into Phase 02 card detail pages
- Highlight sharing affordances (copy link, soon-to-be social share in Phase 10)

## 🔗 Prerequisites
- Phase 01 price history + transaction tables populated
- Phase 02 Search components (card pills, typography) and Phase 03 metric components available for reuse
- `planning/design.md#rankings` reviewed for layout rules

## 📦 Deliverables
- [ ] Rankings API/query helpers with timeframe + filter inputs
- [ ] `/rankings` route featuring tabs for price change, volume, and popularity
- [ ] Comparison drawer pattern that reuses card detail summary component
- [ ] Testing plan capturing sorting, filtering, and accessibility behaviors

## 🧪 Testing Strategy
- Vitest suites for helper functions ranking by percent change/volume
- Playwright scenario verifying tab switch + filter interactions + navigation to card detail
- Manual QA on 360px width to ensure horizontal scroll + sticky rank badges behave per spec

## ⚠️ Known Limitations
- Popularity ranking uses placeholder metric (Phase 07 refines once telemetry available)
- Comparison drawer only surfaces summary stats; advanced compare waits for later release
- Rankings cached client-side for session; server caching arrives once analytics stack ready

## 📚 References
- `planning/design.md#rankings`
- `planning/feature-breakdown.md`
- `planning/ui-component-hierarchy.md`
