# Task: Card Detail Page & Price Surfaces

**Task ID:** `phase-02-task-02`  
**Phase:** 02 – Search & Card Display  
**Priority:** High  
**Estimated Time:** 10 hours  
**Dependencies:** Task 01 (Search API & UI), Phase 01 tables

---

## 🎯 Objective
Design and implement the card detail experience (卡片详情页) that highlights CT price snapshots, price history charts, grade toggles, and recent transactions while clearly signaling that collection/watchlist actions currently store data locally (Phase 05-06).

---

## 📋 Context
The detail page is the flagship view for CardTrail—users expect a polished, data-rich presentation even before authentication exists. We have price history + transaction data from Phase 01 and placeholder CT index metrics. This task transforms those tables into interactive UI elements that follow design.md (hero price, segmented controls, sticky bottom CTAs).

---

## 🔧 Requirements

### Functional Requirements
- [ ] Server component route at `/cards/[id]` fetching `card_jp`, `price_history`, and `transactions`
- [ ] Hero section with large image, giant price (32pt) formatted with locale-aware currency
- [ ] Segmented control for grades (`Raw`, `PSA 9`, `PSA 10`) updating displayed metrics + chart line
- [ ] Recharts line chart with time range pills (24h, 7d, 30d, 90d, ALL)
- [ ] Recent transactions list limited to 10 entries with grade badges and condition chips
- [ ] Sticky bottom bar (mobile) with `Add to Collection` + `Add to Watchlist` buttons that route to Phase 05/06 flows and warn “本地保存，Phase 09 同步云端”

### Technical Requirements
- [ ] Supabase queries limited (e.g., `.limit(1)` for card, `.limit(90)` for price history, `.limit(10)` for transactions)
- [ ] Use Suspense + streaming for chart + transactions sections to keep TTFB low
- [ ] All user-facing numbers run through helper `formatCurrency(value, currency)` defined per design guidelines
- [ ] Chart accessible (ARIA labels) and matches color tokens from design.md (`text-positive`/`text-negative`)
- [ ] Provide fallback UI when no price history exists (empty state card)

---

## 📝 Implementation Details

### Data Loader (Server Component)
```typescript
async function loadCardDetail(id: number) {
  const cardPromise = supabase
    .from('card_jp')
    .select('id, card_name, set_name, rarity, image_urls, card_index')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  const priceHistoryPromise = supabase
    .from('price_history')
    .select('date, price_raw, price_psa9, price_psa10, volume')
    .eq('card_id', id)
    .order('date', { ascending: true })
    .limit(180);

  const transactionsPromise = supabase
    .from('transactions')
    .select('sold_date, price, currency, grade, grading_company, condition, seller')
    .eq('card_id', id)
    .order('sold_date', { ascending: false })
    .limit(10);

  const [card, priceHistory, transactions] = await Promise.all([
    cardPromise,
    priceHistoryPromise,
    transactionsPromise
  ]);
  return { card: card.data, priceHistory: priceHistory.data ?? [], transactions: transactions.data ?? [] };
}
```

### UI Sections
1. **Hero** – responsive grid (image + metadata). Image uses Next `<Image>` with `shadow-[0_4px_12px_rgba(0,0,0,0.15)]` per design.md.
2. **Price Snapshot** – 32pt font for active grade, trend indicator using China market colors (red up, green down).
3. **Grade Segmented Control** – `@cardtrail/ui` segmented button, stores selection in local state and influences chart data.
4. **Price History Chart** – Recharts `<AreaChart>` with gradient fill, hidden grid lines, tooltip showing selected grade price.
5. **Recent Transactions** – list of cards with grade badge, seller, formatted price; fallback message if empty.
6. **Sticky CTA Bar** – `position: sticky; bottom: 0;` with two buttons hooking into local collection/watchlist modals (Phases 05-06). Include warning copy: “📦 数据暂存本地，Phase 09 将自动同步云端.”

### Local CTA Hooks
- `useLocalCollection()` + `useLocalWatchlist()` placeholder hooks simply open dialogs referencing later phases; ensures UI flow is ready.

---

## 🧪 Testing Strategy

### Unit Tests
- Format helpers (currency, grade label) via Vitest
- Hook controlling grade tabs + chart data ensures fallback to `price_raw` when selected grade missing

### E2E Tests
- Playwright scenario: visit `/cards/25`, verify hero image renders, change grade tab, confirm price + chart updates, open CTA to confirm warning text present

### Manual QA
- Verify design tokens (colors, spacing) align with design.md
- Test no-price-history path by fabricating card ID without data; ensure empty state card renders
- Check sticky CTA behavior on Safari iOS simulator (Viewport height adjustments)

---

## ✅ Acceptance Criteria
- [ ] `/cards/[id]` server route handles loading + error states gracefully
- [ ] Recharts component renders within 500 ms after data resolves
- [ ] Grade segmentation toggles both numbers and chart data without reloads
- [ ] Recent transactions list truncated to 10 entries and sorted descending
- [ ] Sticky CTA warns about local storage and routes to Phase 05/06 flows
- [ ] Unit + e2e tests added to repo and passing

---

## 📚 References
- `planning/design.md#card-detail`
- `planning/feature-breakdown.md` (Phase 02 requirements)
- `planning/ui-component-hierarchy.md` (Card Detail section)
- Recharts docs: https://recharts.org/en-US/examples

---

## 🚧 Known Limitations
- Price accuracy limited until Phase 07 populates data
- No SSR caching for detail pages yet; consider ISR in later phase when traffic data exists
- CTA actions currently open local modals; Supabase mutations arrive after Phase 09 cloud sync

---

## 📊 Success Metrics
- P75 TTFB for `/cards/[id]` < 500 ms
- Chart interaction (tooltip) stays > 55 FPS on low-end Android simulation
- Bounce rate from detail page < 40% once analytics enabled
