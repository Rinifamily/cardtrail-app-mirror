# Task: Search API & UI

**Task ID:** `phase-02-task-01`  
**Phase:** 02 – Search & Card Display  
**Priority:** High  
**Estimated Time:** 12 hours  
**Dependencies:** Phase 01 schema + types, `planning/api-design.md`

---

## 🎯 Objective
Build the end-to-end search funnel: validate inputs, query `card_jp` efficiently, hydrate autocomplete suggestions, and render a responsive search results grid with pill filters and infinite scroll—all without relying on authentication.

---

## 📋 Context
Search is the first touchpoint for most CardTrail users. Because authentication is deferred, the search experience must feel instant and self-contained. We already have 28K Japanese cards accessible through Supabase; this task exposes them via a typed API and polished UI that follow design.md (pill filters, rounded search bar, skeleton states). The same API powers future ranking/filtering flows, so correctness and pagination are critical.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Provide `/api/search/cards` (Next.js route handler) with query params: `q`, `rarity`, `set`, `year`, `sort`, `page`, `limit`
- [ ] Autocomplete dropdown (max 8 suggestions) that appears within 250ms and supports keyboard navigation
- [ ] Search results grid (2 columns on mobile, 4 on desktop) with lazy-loaded card images and skeleton placeholders
- [ ] Filter panel with pill chips for rarity + set + year toggle drawer on mobile
- [ ] Infinite scroll implemented via IntersectionObserver, fetching next page automatically
- [ ] Telemetry hook logging query + filter usage to console (placeholder until analytics stack is ready)

### Technical Requirements
- [ ] Use Zod to validate query params (string length, allowed sort keys, `.min(1)` when q provided)
- [ ] All Supabase queries must call `.limit(limit)` and `.range()` for pagination
- [ ] Apply `to_tsquery` + `ilike` fallback for search; ensure trigram extension is enabled per planning docs
- [ ] React Query for caching + deduplicating search requests; stale time 60s
- [ ] Debounce input at 300ms to reduce Supabase calls
- [ ] Loading states follow design.md (rounded skeleton cards, 12px radius)

---

## 📝 Implementation Details

### API Route (`apps/web/app/api/search/cards/route.ts`)
```typescript
const querySchema = z.object({
  q: z.string().min(1).max(80).optional(),
  rarity: z.string().optional(),
  set: z.string().optional(),
  year: z.coerce.number().min(1996).max(new Date().getFullYear()).optional(),
  sort: z.enum(['relevance','name_asc','name_desc','year_desc']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(40).default(20)
});

const { q, rarity, set, year, sort, page, limit } = querySchema.parse(parsed);
const from = (page - 1) * limit;
const to = from + limit - 1;

let query = supabase
  .from('card_jp')
  .select('id, card_name, rarity, set_name, set_slug, image_urls', { count: 'exact' })
  .range(from, to)
  .limit(limit);

if (q) {
  query = query.ilike('card_name', `%${q}%`);
}
if (rarity) query = query.eq('rarity', rarity);
if (set) query = query.eq('set_slug', set);
if (year) query = query.ilike('set_slug', `${year}%`);
```

### UI Flow
1. Landing page uses server component to preload top searches (from mock data)
2. Client search bar handles focus/blur, keyboard navigation, and debounced `useAutocomplete(q)` hook
3. Results grid uses `<Suspense>` + skeleton cards; each card uses Next Image with `sizes="(max-width:768px) 50vw, 25vw"`
4. Infinite scroll uses `useIntersectionObserver` hook tied to sentinel element; when visible, call `fetchNextPage`
5. Filter drawer (mobile) uses bottom sheet pattern from design.md; desktop keeps filters inline

### Analytics Placeholder
```typescript
useEffect(() => {
  if (!q && filtersEmpty) return;
  console.info('[search-metric]', { q, rarity, set, year, sort });
}, [q, rarity, set, year, sort]);
```

---

## 🧪 Testing Strategy

### Unit Tests
- Validate `querySchema` (Vitest) for various inputs, ensuring `.min(1)` enforcement and numeric coercion
- Test custom hooks: `useDebouncedValue`, `useIntersectionObserver` (mock `IntersectionObserver`)

### E2E Tests
- Playwright scenario: type "皮卡丘" → verify suggestions → press Enter → expect grid of cards with correct titles
- Scroll to sentinel and assert new batch appended; filters update query params and data

### Manual QA
- Test on 375px & 1280px ensuring pills remain scrollable and bottom sheet works
- Simulate offline mode (Chrome DevTools) to confirm graceful error banners + cached UI
- Profile network tab: verify requests capped at 20 results and include filter params

---

## ✅ Acceptance Criteria
- [ ] API validates inputs and returns `{ data, pagination }` payload with `total_pages`
- [ ] Search UI matches design.md specs (rounded search bar, pill filters, skeletons)
- [ ] Infinite scroll fetches next page only once per threshold and stops at last page
- [ ] Autocomplete accessible via keyboard (ArrowUp/Down + Enter)
- [ ] All Supabase queries use `.limit()` and `.range()`
- [ ] Tests (unit + e2e) pass in CI

---

## 📚 References
- `planning/api-design.md#card-search`
- `planning/design.md#search-results`
- `planning/ui-component-hierarchy.md` (Search module tree)
- Supabase docs on full-text search + pg_trgm

---

## 🚧 Known Limitations
- Autocomplete capped at 8 entries and limited to `card_name`
- No server-side caching yet; Vercel Edge cache rules handled in later phase
- Search filters limited to existing metadata in `card_jp`; additional facets require new extension tables

---

## 📊 Success Metrics
- P95 response time for `/api/search/cards` < 250 ms
- Autocomplete suggestion latency < 250 ms (median)
- Drop-off rate between search and card detail < 30% (measured once analytics exist)
