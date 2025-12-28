# Task: Core Database Schema (Public Tables)

**Task ID:** `phase-01-task-01`  
**Phase:** 01 – Database Core  
**Priority:** High  
**Estimated Time:** 10 hours  
**Dependencies:** Phase 00 scaffold, Supabase project access

---

## 🎯 Objective
Create production-ready SQL migrations for `price_history`, `market_indices`, and `transactions`, wire up read-only RLS policies, and generate Supabase TypeScript types so Phases 02-04 can consume market data without waiting for authentication.

---

## 📋 Context
CardTrail must surface price history, CTI indices, and recent eBay transactions immediately, yet auth credentials are delayed. These tables are global, non-user-specific datasets that can safely be public as long as RLS ensures read-only access. Completing this task unblocks Search, Market Dashboard, Rankings, and Local Collection phases by providing dependable data sources backed by indexes and strict constraints.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Create `price_history`, `market_indices`, and `transactions` tables without modifying `card_jp`
- [ ] Reference `card_jp.id` via foreign keys for any card-specific column
- [ ] Enforce uniqueness constraints (`card_id + date + data_source`, `index_type + date`, `ebay_item_id`)
- [ ] Enable RLS and add read-only policies for anonymous clients
- [ ] Document how TypeScript types are generated and consumed by packages/apps

### Technical Requirements
- [ ] SQL migrations stored under `supabase/migrations/*`
- [ ] All indexes defined in migrations (composite indexes for date + card lookups)
- [ ] Supabase CLI command (`task db:types`) run after migrations
- [ ] No `any` or `@ts-ignore` in documentation snippets; use generated `Database` type
- [ ] `.limit()` enforced in any example query code
- [ ] Testing notes cover RLS verification via anon vs service role keys

---

## 📝 Implementation Details

### SQL Migrations (single file or split per table)
```sql
-- Price history (no user dependency)
CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES card_jp(id),
  date DATE NOT NULL,
  price_raw DECIMAL(10,2),
  price_psa9 DECIMAL(10,2),
  price_psa10 DECIMAL(10,2),
  volume INTEGER DEFAULT 0,
  data_source TEXT DEFAULT 'ebay',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(card_id, date, data_source)
);

CREATE INDEX idx_price_history_card_date
  ON price_history(card_id, date DESC);

-- Market indices (no user dependency)
CREATE TABLE market_indices (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  index_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  change_24h DECIMAL(5,2),
  change_7d DECIMAL(5,2),
  volume BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, index_type)
);

CREATE INDEX idx_market_indices_type_date
  ON market_indices(index_type, date DESC);

-- eBay transactions cache (no user dependency)
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT REFERENCES card_jp(id),
  ebay_item_id TEXT UNIQUE,
  title TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  sold_date TIMESTAMP,
  condition TEXT,
  grade TEXT,
  grading_company TEXT,
  seller TEXT,
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_card_date
  ON transactions(card_id, sold_date DESC);

-- RLS Policies (public read-only)
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read price_history"
  ON price_history FOR SELECT USING (true);

CREATE POLICY "Public read market_indices"
  ON market_indices FOR SELECT USING (true);

CREATE POLICY "Public read transactions"
  ON transactions FOR SELECT USING (true);
```

### Type Generation
```bash
# Run after migrations
task db:types
```
This updates `packages/shared-types/src/database.ts`. Consumer packages should import the generated type:
```typescript
import type { Database } from '@cardtrail/shared-types/database';
const supabase = createClient<Database>(url, anonKey);
``` 

### Sample Query Pattern (limit enforced)
```typescript
const { data, error } = await supabase
  .from('price_history')
  .select('card_id,date,price_psa10')
  .eq('card_id', cardId)
  .order('date', { ascending: false })
  .limit(90);
```

### Testing Notes (SQL)
- Use `select * from pg_indexes where tablename = 'price_history';` to confirm indexes
- `select has_table_privilege('anon', 'price_history', 'insert');` should return `false`

---

## 🧪 Testing Strategy

### Unit Tests
- Add Vitest unit covering helper that builds Supabase queries to ensure `.limit()` is always applied
- Verify TypeScript `Database['public']['Tables']['price_history']['Row']` shape via type-level tests (e.g., `expectTypeOf`)

### E2E / Integration
- Playwright smoke test hitting `/api/price-history?cardId=25` that asserts 200 response and <= 90 rows
- Supabase integration test using anon key to ensure INSERT fails with `42501` while SELECT succeeds

### Manual QA
- Run `supabase db remote commit --dry-run` to confirm migration order
- In Supabase SQL editor, attempt `insert into price_history ...` with anon key—expect RLS rejection
- Validate TypeScript generation by running `pnpm tsc --noEmit`

---

## ✅ Acceptance Criteria
- [ ] Migrations apply cleanly on local Supabase instance
- [ ] All tables expose primary keys, foreign keys, and documented indexes
- [ ] RLS policies exist and block non-SELECT operations for anon role
- [ ] `task db:types` output committed and referenced in documentation
- [ ] Testing evidence recorded (screenshots or test run logs)
- [ ] No references to auth tables or user-specific schemas

---

## 📚 References
- `planning/database-architecture.md`
- `planning/data-models.md`
- `planning/agents.md`
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security

---

## 🚧 Known Limitations
- Tables contain no seed data yet; placeholder content will follow in Phase 07 when real ingestion arrives
- Outlier detection fields (`is_outlier`) only reflect boolean flag; scoring logic lives in Phase 07 tasks
- Timezone normalization for `sold_date` depends on eBay ingestion; currently assumed UTC

---

## 📊 Success Metrics
- Schema migration pipeline completes in < 2 minutes locally
- Supabase types compile with zero `tsc` errors
- Read queries against new tables return in < 100 ms with indexes applied
