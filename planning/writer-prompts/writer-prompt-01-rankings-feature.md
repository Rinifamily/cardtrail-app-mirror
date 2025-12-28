# Writer Prompt: Rankings Feature Implementation

**Task ID:** `phase-04-task-01`  
**Feature:** Rankings System (榜单体系)  
**Priority:** High  
**Estimated Duration:** 12 hours  
**Target Path:** `/apps/web/app/(rankings)/`

---

## 🎯 Mission

Implement a comprehensive rankings page at `/rankings` featuring four distinct leaderboards (price gainers, price fallers, volume leaders, popularity) with timeframe filtering, comparison tools, and share functionality—all powered by server-side Supabase queries with no authentication required.

---

## 📖 Context

### Purpose
The rankings feature serves as a discovery tool for users to identify trending and actionable cards before building their collection. This is a read-only, anonymous experience that must be:
- Fully bilingual (EN/JA labels)
- Visually rich with badge styling for top 3 positions
- Performance-optimized with server-side data fetching
- Accessible and responsive across all devices

### Data Sources
- **Primary:** `price_history` table for price change calculations
- **Secondary:** `transactions` table for volume and popularity metrics
- **Fallback:** `price_raw` when structured price data unavailable

### Current State
- Phase 02 search UI components exist and can be referenced
- Phase 03 metrics infrastructure established
- Phase 01 data tables populated with sample data
- No authentication or user state management required yet

---

## 🔧 Functional Requirements

### Core Features
1. **Four Ranking Tabs**
   - 涨幅榜 (Top Gainers) - Cards with highest price increase %
   - 跌幅榜 (Top Fallers) - Cards with highest price decrease %
   - 成交量榜 (Volume Leaders) - Cards with highest transaction volume
   - 人气榜 (Popularity) - Cards with most transaction frequency

2. **Timeframe Filtering**
   - Pills: 24h (default), 7d, 30d
   - Updates data and URL query params
   - Persists selection across tab switches

3. **Additional Filters**
   - Rarity chips (Common, Uncommon, Rare, etc.)
   - Grade filters (PSA 10, PSA 9, etc.)
   - Language filters (EN, JA)
   - All filters serialize to URL query params

4. **Leaderboard Display**
   - Rank badge (special styling for positions 1-3)
   - Card thumbnail and bilingual name
   - Current price with currency formatting
   - Delta value and percentage with directional indicators
   - Share icon per row
   - Checkbox for comparison (max 3 selections)

5. **Comparison Drawer**
   - Triggered by selecting 2-3 cards via checkboxes
   - Slides from bottom (mobile) or right (desktop)
   - Shows mini card summaries
   - "Compare" button links to `/compare?ids=card1,card2,card3`
   - Enforces 3-card maximum with disabled state

6. **Share Functionality**
   - Per-row share icon
   - Attempts Web Share API first
   - Falls back to clipboard copy with toast notification
   - Format: Deep link with bilingual share message
   - Logs action for future Phase 10 analytics

---

## 🏗️ Technical Requirements

### Architecture
- **Server Components:** All data fetching at page/route level
- **Client Components:** Interactive filters, tabs, drawer, share buttons
- **Data Layer:** Supabase RPC functions or SQL views
- **Caching:** In-memory per-request Map (pending Redis in future phase)

### Data Fetching
- Create Supabase RPC: `get_rankings(range text, category text, rarity text, grade text, language text)`
- Returns max 100 rows per query
- Implements proper null handling and fallback logic
- Example calculation structure:

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

### UI Components Structure
```
app/(rankings)/
  rankings/
    page.tsx              // Server component (data fetching)
    RankingsContent.tsx   // Client wrapper
components/rankings/
  RankingsTabs.tsx        // Tab navigation
  FilterBar.tsx           // Timeframe + filter chips
  LeaderboardGrid.tsx     // Main table/grid layout
  RankBadge.tsx          // Position indicators
  ComparisonDrawer.tsx   // Selection drawer
  ShareButton.tsx        // Share functionality
```

### Internationalization
- Use `next-intl` or `react-intl` patterns already in codebase
- Translation keys required:
  - `rankings.topGainers`
  - `rankings.topFallers`
  - `rankings.volumeLeaders`
  - `rankings.popularity`
  - `rankings.timeframe.24h`
  - `rankings.timeframe.7d`
  - `rankings.timeframe.30d`
  - `rankings.share.message`
  - `rankings.comparison.title`
  - `rankings.noData`

### Responsive Design
- **Mobile (<768px):**
  - Stacked single-column layout
  - Horizontal scroll for additional metrics
  - Filters collapse into bottom sheet
  - Sticky tab navigation
  - Drawer slides from bottom
  
- **Desktop (≥768px):**
  - Multi-column grid layout
  - All metrics visible
  - Inline filter chips
  - Drawer slides from right

### Accessibility
- Table rows: `role="row"`, `tabIndex={0}`, keyboard navigation
- Share buttons: `aria-label` with translated text
- Comparison checkboxes: Associated labels
- Filter chips: `aria-pressed` state
- Drawer: Focus trap when open, ESC to close

---

## 📝 Implementation Steps

### Step 1: Database Layer (30 min)
1. Create migration file: `supabase/migrations/YYYYMMDD_rankings_rpc.sql`
2. Implement RPC functions for each ranking category:
   - `get_price_gainers(timeframe text, limit_count int)`
   - `get_price_fallers(timeframe text, limit_count int)`
   - `get_volume_leaders(timeframe text, limit_count int)`
   - `get_popularity_rankings(timeframe text, limit_count int)`
3. Add proper indexes on `price_history(date, card_id)` and `transactions(card_id, date)`
4. Test queries in Supabase SQL editor
5. Run migration: `pnpm run db:migrate`

### Step 2: Type Definitions (20 min)
1. Update `apps/web/lib/database.types.ts` with RPC return types
2. Create `apps/web/types/rankings.ts`:
```typescript
export type RankingCategory = 'gainers' | 'fallers' | 'volume' | 'popularity';
export type Timeframe = '24h' | '7d' | '30d';

export interface RankingCard {
  rank: number;
  cardId: string;
  cardName: string;
  cardNameJa: string;
  thumbnailUrl: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume?: number;
  transactionCount?: number;
  rarity: string;
  grade: string;
  language: string;
}

export interface RankingsFilters {
  category: RankingCategory;
  timeframe: Timeframe;
  rarity?: string;
  grade?: string;
  language?: string;
}
```

### Step 3: Data Access Layer (45 min)
1. Create `apps/web/lib/data/rankings.ts`:
```typescript
import { createClient } from '@/lib/supabase';
import type { RankingCard, RankingsFilters } from '@/types/rankings';

export async function getRankings(filters: RankingsFilters): Promise<RankingCard[]> {
  const supabase = createClient();
  
  // Implement RPC call based on category
  // Add error handling and fallbacks
  // Transform data to RankingCard format
  // Return sorted, limited results
}
```

2. Implement caching helper:
```typescript
const rankingsCache = new Map<string, { data: RankingCard[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(filters: RankingsFilters): string {
  return JSON.stringify(filters);
}
```

### Step 4: Server Page Component (30 min)
1. Create `apps/web/app/(rankings)/rankings/page.tsx`:
   - Parse URL search params for filters
   - Call `getRankings()` with parsed filters
   - Pass data to client component
   - Handle loading and error states

2. Implement proper metadata:
```typescript
export const metadata: Metadata = {
  title: 'Rankings | CardTrail',
  description: 'Discover trending Pokémon TCG cards...',
};
```

### Step 5: UI Components (3 hours)

#### RankingsTabs.tsx
- Controlled tab state
- Sync with URL params via `useRouter` and `usePathname`
- Translate tab labels
- Emit `onTabChange` event

#### FilterBar.tsx
- Timeframe pill group (radio behavior)
- Filter chip groups (multi-select)
- Sync selections to URL params
- Mobile: Collapse to bottom sheet
- Desktop: Horizontal layout with wrapping

#### LeaderboardGrid.tsx
- CSS Grid layout (not `<table>` for responsive control)
- Columns: Rank, Card, Price, Change, Volume, Actions
- Render 100 rows with virtualization consideration
- Handle empty state with translated message

#### RankBadge.tsx
```typescript
interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const badgeClasses = {
    1: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    2: 'bg-gradient-to-br from-gray-300 to-gray-500',
    3: 'bg-gradient-to-br from-amber-600 to-amber-800',
  };
  
  // Implementation
}
```

#### ComparisonDrawer.tsx
- State: Selected card IDs (max 3)
- Slide animation with Framer Motion or CSS transitions
- Display mini card previews
- "Compare" button -> `/compare?ids=...`
- Disable selections when limit reached

#### ShareButton.tsx
```typescript
async function handleShare(card: RankingCard) {
  const shareData = {
    title: `${card.cardName} - CardTrail Rankings`,
    text: `Check out this trending card!`,
    url: `${window.location.origin}/cards/${card.cardId}`,
  };
  
  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(shareData.url);
    // Show toast notification
  }
  
  // Log for Phase 10 analytics
  console.log('[Share Action]', card.cardId);
}
```

### Step 6: Main Client Wrapper (30 min)
1. Create `apps/web/app/(rankings)/rankings/RankingsContent.tsx`:
   - Receives initial data from server component
   - Manages client-side filter state
   - Handles comparison drawer state
   - Coordinates all child components

### Step 7: Styling (45 min)
1. Implement responsive grid layouts
2. Add gradient badges for top 3 ranks
3. Style filter chips and tabs
4. Drawer animations and transitions
5. Ensure dark mode compatibility
6. Match design system from `planning/design.md`

### Step 8: Internationalization (30 min)
1. Add translation keys to locale files
2. Wire up `useTranslations()` hook in all components
3. Test language switching
4. Verify bilingual card name display

---

## 🧪 Testing Requirements

### Unit Tests
Create `apps/web/__tests__/lib/rankings.test.ts`:
- Test `getRankings()` with various filter combinations
- Verify sorting logic for each category
- Test percentage calculation edge cases (null, zero division)
- Validate 100-row limit enforcement
- Test cache key generation and TTL behavior

Create `apps/web/__tests__/components/rankings/RankBadge.test.tsx`:
- Verify correct styling for ranks 1, 2, 3
- Test default styling for ranks > 3

Create `apps/web/__tests__/components/rankings/ComparisonDrawer.test.tsx`:
- Test max 3 card selection enforcement
- Verify URL generation with multiple IDs
- Test open/close behavior

### E2E Tests
Create `apps/web/e2e/rankings.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Rankings Page', () => {
  test('should display top gainers by default', async ({ page }) => {
    await page.goto('/rankings');
    await expect(page.getByRole('heading', { name: /rankings/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /gainers/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('should switch to fallers tab and update URL', async ({ page }) => {
    await page.goto('/rankings');
    await page.getByRole('tab', { name: /fallers/i }).click();
    await expect(page).toHaveURL(/category=fallers/);
  });

  test('should filter by timeframe', async ({ page }) => {
    await page.goto('/rankings');
    await page.getByRole('button', { name: '7d' }).click();
    await expect(page).toHaveURL(/timeframe=7d/);
  });

  test('should apply rarity filter', async ({ page }) => {
    await page.goto('/rankings');
    await page.getByRole('button', { name: /rare/i }).click();
    await expect(page).toHaveURL(/rarity=rare/);
  });

  test('should open comparison drawer with selected cards', async ({ page }) => {
    await page.goto('/rankings');
    await page.locator('[data-testid="card-checkbox"]').first().check();
    await page.locator('[data-testid="card-checkbox"]').nth(1).check();
    await expect(page.getByRole('dialog', { name: /compare/i })).toBeVisible();
  });

  test('should enforce 3-card comparison limit', async ({ page }) => {
    await page.goto('/rankings');
    await page.locator('[data-testid="card-checkbox"]').first().check();
    await page.locator('[data-testid="card-checkbox"]').nth(1).check();
    await page.locator('[data-testid="card-checkbox"]').nth(2).check();
    await expect(page.locator('[data-testid="card-checkbox"]').nth(3)).toBeDisabled();
  });

  test('should copy share link to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/rankings');
    await page.locator('[data-testid="share-button"]').first().click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('/cards/');
  });

  test('should persist filters on page refresh', async ({ page }) => {
    await page.goto('/rankings?category=volume&timeframe=30d&rarity=rare');
    await page.reload();
    await expect(page.getByRole('tab', { name: /volume/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('should display empty state when no data', async ({ page }) => {
    // Mock empty response
    await page.route('**/rest/v1/rpc/get_rankings*', route => 
      route.fulfill({ json: [] })
    );
    await page.goto('/rankings');
    await expect(page.getByText(/数据不足/i)).toBeVisible();
  });
});
```

### Manual QA Checklist
- [ ] Badge colors match design spec (gold/silver/bronze)
- [ ] Horizontal scroll works on mobile without breaking layout
- [ ] Tab navigation is sticky on scroll
- [ ] Share button respects browser permissions
- [ ] Comparison drawer closes on ESC key
- [ ] Filter chips show active state correctly
- [ ] Dark mode renders properly
- [ ] Bilingual labels display correctly
- [ ] Loading states appear during data fetches
- [ ] Error boundaries catch and display failures gracefully

---

## ⚠️ Constraints & Anti-Patterns

### Constraints
1. **No Authentication:** All data must be publicly accessible
2. **100-Row Limit:** Hard cap per query to manage load
3. **Placeholder Metrics:** Popularity = transaction count (refined in Phase 07)
4. **No Real-time Updates:** Server-rendered data only, no WebSocket
5. **Cache Limitations:** In-memory only until Redis available
6. **Comparison Stub:** `/compare` page doesn't exist yet, just link to it

### Anti-Patterns to AVOID

❌ **DON'T use client-side data fetching**
```typescript
// BAD
'use client';
export default function Page() {
  const { data } = useSWR('/api/rankings');
}
```

✅ **DO use server components**
```typescript
// GOOD
export default async function Page({ searchParams }) {
  const data = await getRankings(searchParams);
  return <RankingsContent data={data} />;
}
```

---

❌ **DON'T fetch data without limits**
```sql
-- BAD
SELECT * FROM price_history ORDER BY date DESC;
```

✅ **DO enforce row limits**
```sql
-- GOOD
SELECT * FROM price_history 
ORDER BY date DESC 
LIMIT 100;
```

---

❌ **DON'T ignore null handling**
```typescript
// BAD
const percentChange = (current - prior) / prior * 100;
```

✅ **DO use NULLIF and fallbacks**
```sql
-- GOOD
((current_price - prior_price) / NULLIF(prior_price, 0)) * 100
```

---

❌ **DON'T hardcode strings**
```typescript
// BAD
<h1>Top Gainers</h1>
```

✅ **DO use translation keys**
```typescript
// GOOD
<h1>{t('rankings.topGainers')}</h1>
```

---

❌ **DON'T use HTML tables for responsive layouts**
```html
<!-- BAD: Hard to make responsive -->
<table>
  <tr><td>...</td></tr>
</table>
```

✅ **DO use CSS Grid**
```tsx
// GOOD
<div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4">
  <div>Rank</div>
  <div>Card</div>
  <div>Price</div>
</div>
```

---

❌ **DON'T block the main thread with heavy calculations**
```typescript
// BAD: Sorting 10k items client-side
const sorted = allCards.sort(...);
```

✅ **DO calculate on server or use SQL**
```sql
-- GOOD
ORDER BY price_change DESC LIMIT 100;
```

---

## ✅ Success Criteria

### Functional Completeness
- [ ] All four ranking tabs display correctly sorted data
- [ ] Timeframe filters update data and persist in URL
- [ ] Additional filters (rarity/grade/language) work independently and in combination
- [ ] Top 3 ranks have distinct badge styling
- [ ] Comparison drawer opens with 2+ cards selected
- [ ] Comparison drawer enforces 3-card maximum
- [ ] Share button copies link or triggers Web Share API
- [ ] Empty state displays when data unavailable
- [ ] Loading states appear during server fetches
- [ ] Error boundaries catch failures

### Technical Quality
- [ ] All data fetched server-side via Supabase RPC
- [ ] Queries limited to 100 rows with proper indexing
- [ ] Cache implementation reduces redundant queries
- [ ] TypeScript types fully defined with no `any`
- [ ] All components have proper prop types
- [ ] Null/undefined handling throughout
- [ ] No console errors or warnings in browser

### Testing Coverage
- [ ] Unit tests cover ranking logic (≥80% coverage)
- [ ] E2E tests verify all user flows
- [ ] Tests pass in CI pipeline
- [ ] Manual QA checklist completed

### Design & UX
- [ ] Responsive on mobile (320px) and desktop (1920px+)
- [ ] Sticky navigation works correctly
- [ ] Animations smooth and performant (60fps)
- [ ] Dark mode fully supported
- [ ] Badge colors match design spec
- [ ] Typography and spacing consistent with design system
- [ ] Keyboard navigation works throughout
- [ ] Screen reader friendly (tested with NVDA/VoiceOver)

### Performance
- [ ] Cached rankings API response < 200ms (P95)
- [ ] Uncached response < 800ms (P95)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Lighthouse Performance score ≥ 90

### Documentation
- [ ] Code comments explain complex logic
- [ ] README updated with rankings feature info
- [ ] Migration scripts documented
- [ ] Known limitations listed in comments

---

## 📚 Reference Materials

### Existing Codebase
- Search UI patterns: `apps/web/app/(search)/search/`
- Card components: `apps/web/components/cards/`
- Filter implementations: `apps/web/components/search/FilterPanel.tsx`
- Supabase client: `apps/web/lib/supabase.ts`
- Type definitions: `apps/web/lib/database.types.ts`

### Planning Documents
- Design specs: `planning/design.md#rankings`
- Component hierarchy: `planning/ui-component-hierarchy.md`
- Feature breakdown: `planning/feature-breakdown.md`
- Database schema: `planning/database-architecture.md`

### External Resources
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Run full test suite: `pnpm test`
- [ ] Run E2E tests: `pnpm test:e2e`
- [ ] Run type check: `pnpm type-check`
- [ ] Run linter: `pnpm lint`
- [ ] Build succeeds: `pnpm build`
- [ ] Verify migrations applied: `pnpm db:status`

### Code Review
- [ ] Self-review all changes
- [ ] Check for sensitive data or hardcoded values
- [ ] Verify all TODOs addressed or documented
- [ ] Ensure commit messages follow convention
- [ ] Update CHANGELOG if exists

### Git Operations
1. Stage all changes:
```bash
git add .
```

2. Commit with descriptive message:
```bash
git commit -m "feat(rankings): implement rankings feature with tabs, filters, and comparison

- Add Supabase RPC functions for four ranking categories
- Implement server-side data fetching with caching
- Create responsive UI with CSS Grid layout
- Add comparison drawer with 3-card limit
- Implement Web Share API with clipboard fallback
- Add comprehensive E2E and unit tests
- Support bilingual labels and dark mode

Closes #phase-04-task-01"
```

3. Push to remote:
```bash
git push origin main
```

### Post-Deployment Verification
- [ ] Visit `/rankings` on deployed URL
- [ ] Test all tabs switch correctly
- [ ] Verify filters update data
- [ ] Test share functionality
- [ ] Check mobile responsive behavior
- [ ] Verify analytics logging (console)
- [ ] Monitor error tracking dashboard

---

## 📞 Support & Questions

If you encounter blockers or ambiguities:

1. **Database Issues:** Check `supabase/README.md` for connection troubleshooting
2. **Type Errors:** Regenerate types with `pnpm db:types`
3. **Build Failures:** Clear cache with `pnpm clean` and rebuild
4. **Test Failures:** Check Playwright trace: `pnpm test:e2e:debug`
5. **Design Questions:** Reference `planning/design.md` or use best judgment consistent with existing patterns

---

## 🎯 Final Reminder

**CRITICAL: At the end of implementation, you MUST:**

1. ✅ Run all tests and ensure they pass
2. ✅ Stage all changes with `git add .`
3. ✅ Commit with a descriptive message following conventional commits
4. ✅ Push to remote repository with `git push origin main`
5. ✅ Verify deployment succeeded

**DO NOT consider the task complete until code is pushed to the remote repository!**

---

## 📈 Success Metrics Baseline

After deployment, establish baselines for:
- API response times (P50, P95, P99)
- Page load metrics (FCP, LCP, TTI)
- Share button click-through rate
- Comparison drawer usage rate
- Filter engagement frequency

These metrics inform Phase 10 optimization and social features.

---

**Good luck! Build something awesome! 🚀**
