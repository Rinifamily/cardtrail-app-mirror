# Task: Build Market Dashboard (CTI + 大盘)

**Task ID:** `phase-03-task-01`  
**Phase:** 03 – Market Dashboard  
**Priority:** High  
**Estimated Time:** 14 hours  
**Dependencies:** Phase 01 tables, Phase 02 chart components

---

## 🎯 Objective
Ship the `/market` route showcasing CTI, sub-index cards, candlestick chart, gainers/losers, and volume stats with a “near real-time” feel even though live ingestion (Phase 07) is not ready.

---

## 📋 Context
Users need a sense of market movement before auth or cloud data exists. We already have schema support (`market_indices`, `price_history`, `transactions`) plus placeholder data. This task turns that data into a narrative dashboard following design.md Section 4 (CTI hero, sparklines, horizontal scrolling cards). The implementation must emphasize clarity in Chinese/English and mimic the dynamism of a trading terminal without actual streaming yet.

---

## 🔧 Requirements

### Functional Requirements
- [ ] `/market` page with sections: CTI hero, candlestick chart, sub-index carousel, top gainers, top losers, volume stats
- [ ] Timeframe pills (24h, 7d, 30d, YTD) that update chart + summary metrics
- [ ] “Live” indicator that pulses every 5 seconds (client-only) to imply freshness
- [ ] Localization-ready copy (use `t('market.cti.title')` etc.)
- [ ] Empty states when `market_indices` lacks data; show CTA pointing to Phase 07 ingestion

### Technical Requirements
- [ ] Server component prefetching `market_indices` (limit 120 rows) and `price_history` aggregated for CTI cards
- [ ] Derived metrics performed server-side (percentage change, volume sums) to keep client lean
- [ ] Charts built with Recharts candlestick or area; hide grid lines per design.md
- [ ] Animations use Tailwind utilities + `prefers-reduced-motion` guard
- [ ] Data adapter toggles between Supabase results and JSON fixtures (for local dev without data)

---

## 📝 Implementation Details

### Data Fetcher
```typescript
export async function loadMarketDashboard(range: RangeKey = '7d') {
  const { data: indices } = await supabase
    .from('market_indices')
    .select('*')
    .order('date', { ascending: true })
    .limit(120);

  if (!indices?.length) {
    return { mode: 'placeholder', data: await import('./fixtures/market-week.json') };
  }

  return {
    mode: 'live',
    data: adaptIndices(indices, range)
  };
}
```

### Layout Sections
1. **CTI Hero** – 48pt number, delta badges (red up, green down) with bilingual labels.
2. **Candlestick Chart** – dynamic import of heavy chart component; timeframe pills update data set via `useTransition`.
3. **Sub-Index Carousel** – horizontally scrollable cards (`snap-x`) showing CTI sub-indices (Vintage, Modern, Japanese, Overall) with sparklines.
4. **Top Gainers/Losers** – derived from `price_history` (difference between last two entries) limited to 5 each, display percent change and price.
5. **Volume Stats** – bars showing last 3 days total transaction volume; includes placeholder message referencing Phase 07 for real data.

### Skeletons + Live Indicator
- Use `animate-pulse` skeleton blocks while data loads.
- `LiveChip` component toggles `.opacity-0`/`.opacity-100` every 5s via `setInterval`, respecting `prefers-reduced-motion`.

---

## 🧪 Testing Strategy

### Unit Tests
- `adaptIndices` helper (calculating deltas + timeframe slicing)
- `rankGainers` sorting logic to ensure `.limit(5)` and correct ordering

### E2E Tests
- Playwright: load `/market`, verify CTI hero value, switch timeframe to 30d, ensure chart updates (data attribute change), scroll carousel to confirm snap behaviour

### Manual QA
- Check bilingual copy toggles (if i18n stub exists) or at least placeholders for translation keys
- Validate reduced-motion setting disables pulsing animation
- Inspect on 320px width to confirm horizontal scrolling works without clipping

---

## ✅ Acceptance Criteria
- [ ] `/market` layout matches design.md spacing, color, and typography guidelines
- [ ] Chart + cards update when timeframe pill changes without full page reload
- [ ] Gainers/losers lists never exceed 5 entries and show proper colors (red up, green down per China convention)
- [ ] Placeholder mode displays warning card linking to Phase 07 tasks
- [ ] Tests (unit + e2e) implemented and passing

---

## 📚 References
- `planning/design.md#market-dashboard`
- `planning/price-algorithm.md`
- `planning/feature-breakdown.md`
- Recharts candlestick example: https://recharts.org/en-US/examples/SimpleCandlestickChart

---

## 🚧 Known Limitations
- Real-time sockets not available yet; data refresh simulated via polling timer
- Market news/sentiment deferred to later phases
- Volume aggregation relies on limited transactions dataset; accuracy improves when Phase 07 ingestion runs hourly

---

## 📊 Success Metrics
- CTI hero renders within 400 ms on mobile (TTI)
- Chart interaction stays above 55 FPS in Chrome performance tab
- User scroll depth to gainers/losers > 70% (tracked once analytics exist)
