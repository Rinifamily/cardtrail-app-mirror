# Task: Rankings Feature (榜单体系)

**Task ID:** `phase-04-task-01`  
**Phase:** 04 – Rankings  
**Priority:** High  
**Estimated Time:** 12 hours  
**Dependencies:** Phase 02 search UI, Phase 03 metrics, Phase 01 data tables

---

## 🎯 Objective
Implement `/rankings` with tabs for price risers, price fallers, volume leaders, and popularity along with timeframe filters and quick comparison drawer—all powered by Supabase read-only data.

---

## 📋 Context
Rankings guide users to actionable cards before they build a collection. Since authentication is deferred, the experience must be entirely anonymous yet still rich: bilingual labels, badge styling for the top 3, and clear sharing hooks. Data comes from `price_history` and `transactions`; we massage it server-side into ranking datasets that the UI consumes.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Tabs: `涨幅榜`, `跌幅榜`, `成交量榜`, `人气榜`
- [ ] Timeframe pills: 24h, 7d, 30d (default 24h)
- [ ] Filter chips: rarity, grade, language
- [ ] Table layout: rank badge, card info, price/value, delta, share icon
- [ ] Comparison drawer triggered via checkbox selection (max 3 cards) linking to `/compare?ids=...` placeholder
- [ ] Share action copies deep link + indicates future social share (Phase 10)

### Technical Requirements
- [ ] Server component fetches ranking datasets via RPC or SQL view limited to 100 rows per tab
- [ ] All queries include `.limit()` and guard against null price data; fallback to `price_raw`
- [ ] Bilingual labels via `next-intl`/`react-intl` placeholders (`t('rankings.topGainers')`)
- [ ] Responsive design: 1-column stacked on mobile with horizontal scroll for additional metrics; sticky header for timeframe tabs
- [ ] Accessibility: Table rows keyboard focusable; share + compare buttons have aria-labels

---

## 📝 Implementation Details

### Data Layer
- Create SQL view or Supabase RPC `get_rankings(range text, category text, rarity text, grade text, language text)` to encapsulate heavy queries.
- Example percent-change calculation:
```sql
WITH latest AS (
  SELECT card_id, price_psa10, date
  FROM price_history
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  card_id,
  MAX(price_psa10) FILTER (WHERE date = CURRENT_DATE) AS latest_price,
  MAX(price_psa10) FILTER (WHERE date = CURRENT_DATE - INTERVAL '7 days') AS prior_price,
  ((latest_price - prior_price) / NULLIF(prior_price, 0)) * 100 AS pct_change
FROM latest
GROUP BY card_id
ORDER BY pct_change DESC
LIMIT 100;
```
- Cache results in-memory per request (Map keyed by tab+range) while awaiting dedicated cache layer.

### UI Structure
1. **Header tabs** – `Tabs` component with translation keys; sync selection to query params.
2. **Filter row** – horizontally scrollable pills; on mobile collapses into bottom sheet.
3. **Leaderboard table** – CSS grid for layout (avoids `<table>` overflow). Top 3 rows use gradient badges.
4. **Comparison drawer** – slides from bottom on mobile, right side on desktop; displays mini card summary.
5. **Share button** – uses Web Share API if available, falls back to clipboard copy.

### Placeholder Metrics
- Popularity ranking uses `transactions` count aggregated per card.
- If dataset < 5 entries, show helper text “数据不足，等待 Phase 07 eBay 接入”.

---

## 🧪 Testing Strategy

### Unit Tests
- Ranking helper ensures sort order, percentage calculations, and `.slice(0, 100)` limit
- Filter serialization functions to guarantee deduped query params

### E2E Tests
- Playwright: visit `/rankings`, switch to `跌幅榜`, select timeframe 7d, apply rarity filter, ensure rows update + share icon copies link
- Another test verifying comparison drawer opens with 2 cards and disables third selection until one removed

### Manual QA
- Check badge colors & typography against design.md (gold/silver/bronze)
- Validate horizontal scroll on mobile + sticky tab behavior
- Confirm share action respects browser permission prompts and falls back gracefully

---

## ✅ Acceptance Criteria
- [ ] All four ranking tabs display data with correct ordering, badges, and delta formatting
- [ ] Filters/timeframe update URL query params and persist on refresh
- [ ] Comparison drawer enforces max 3 cards and links to `/compare`
- [ ] Share button copies deep link or triggers Web Share API with bilingual message
- [ ] Tests (unit + e2e) implemented and passing in CI

---

## 📚 References
- `planning/design.md#rankings`
- `planning/ui-component-hierarchy.md` (Rankings module)
- `planning/feature-breakdown.md`

---

## 🚧 Known Limitations
- Popularity metric = transaction count placeholder; refined once telemetry + Phase 07 data pipelines exist
- Server caching limited; heavy load may increase response times until Redis introduced
- Comparison page itself lands in future phase; currently links to stub view

---

## 📊 Success Metrics
- Rankings API response < 200 ms (cached) for 95% of requests
- Time on page > 60 seconds (when analytics available)
- Share button usage baseline recorded (console log for now) to inform Phase 10 social features
