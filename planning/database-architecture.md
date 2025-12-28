# CardTrail Database Architecture (Auth Deferred Edition)

**Version:** 2.0  
**Last Updated:** December 5, 2025  
**Owner:** Database Architecture Team  
**Status:** Core schema (Phase 01) approved; user tables staged for Phase 09.

> ⚠️ `card_jp` is production data managed externally. Absolutely no ALTER/UPDATE/DELETE. Only SELECT, foreign keys, or views are allowed.

---

## 1. Architecture Overview
- **Engine:** Supabase (PostgreSQL 15) with Row-Level Security.
- **Phased Approach:**
  1. **Phase 01 – Core Market Tables**: `price_history`, `market_indices`, `transactions`, optional `card_extensions` view. Public read-only.  
  2. **Phases 05-06 – Local Storage**: In-browser schemas for collections/watchlists that mimic future Supabase tables.  
  3. **Phase 08 – Authentication:** Better Auth + phone OTP; still no user tables yet.  
  4. **Phase 09 – User Tables & Migration:** Create `collections`, `watchlists`, `price_alerts`, `users`, `user_settings`, `migration_events`. Run migration wizard to lift local data.  
  5. **Phase 10 – Social:** `wechat_accounts` mapping for WeChat login.

### Table Groups Summary
| Group | Phase | Tables | RLS |
|-------|-------|--------|-----|
| Core Market Data | 01 | `price_history`, `market_indices`, `transactions`, `card_extensions` | SELECT-only policies `USING (TRUE)` |
| Local Storage (client) | 05-06 | `LocalCollectionItem`, `LocalWatchlistItem` (not in DB) | N/A |
| User Data 🔐 | 09+ | `users`, `user_settings`, `collections`, `watchlists`, `price_alerts`, `migration_events` | Strict `auth.uid() = user_id` |
| WeChat 🔐 | 10 | `wechat_accounts` | `auth.uid() = user_id` |

---

## 2. Phase 01 – Core Market Tables
### 2.1 `price_history`
- Stores per-card daily prices (raw + grades) + volume counts.
- Public read-only.
```sql
CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES card_jp(id),
  date DATE NOT NULL,
  price_raw DECIMAL(10,2),
  price_psa9 DECIMAL(10,2),
  price_psa10 DECIMAL(10,2),
  volume INTEGER DEFAULT 0,
  data_source TEXT DEFAULT 'ebay',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, date, data_source)
);
CREATE INDEX idx_price_history_card_date ON price_history(card_id, date DESC);
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_price_history" ON price_history FOR SELECT USING (TRUE);
```

### 2.2 `market_indices`
- CTI + sub-index history.
```sql
CREATE TABLE market_indices (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  index_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  change_24h DECIMAL(5,2),
  change_7d DECIMAL(5,2),
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, index_type)
);
CREATE INDEX idx_market_indices_type_date ON market_indices(index_type, date DESC);
ALTER TABLE market_indices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_market_indices" ON market_indices FOR SELECT USING (TRUE);
```

### 2.3 `transactions`
- Normalized eBay sold listings powering CT Price + dashboards.
```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT REFERENCES card_jp(id),
  ebay_item_id TEXT UNIQUE,
  title TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  sold_date TIMESTAMPTZ,
  condition TEXT,
  grade TEXT,
  grading_company TEXT,
  seller TEXT,
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transactions_card_date ON transactions(card_id, sold_date DESC);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_transactions" ON transactions FOR SELECT USING (TRUE);
```

### 2.4 `card_extensions` (Optional)
- Cache CT Price + popularity metrics without touching `card_jp`. See data-model spec.

### 2.5 Index & Vacuum Strategy
- Run `ANALYZE` after bulk imports.
- Partition `price_history` monthly if size > 10M rows (future).

---

## 3. Local Storage (Phases 05-06)
- **Not stored in DB yet.** Interfaces defined in `planning/local-storage.md` and `implementation/phase-05/06` tasks.
- Keys: `cardtrail_collection_v1`, `cardtrail_watchlist_v1`, `cardtrail_settings_v1`.
- IndexedDB fallback engaged automatically after 100 entries or quota errors.
- `migrationStatus` property indicates Phase 09 sync state.

---

## 4. Phase 09 – User Tables & Migration 🔐
> Deployed only after Better Auth (Phase 08) succeeds. Keep migrations staged.

### 4.1 `users` & `user_settings`
- `users` extends Supabase Auth (username, avatar, bio).
- `user_settings` stores currency/language/theme/notifications.
- RLS: `auth.uid() = user_id` for SELECT/INSERT/UPDATE.

### 4.2 `collections`
- Mirrors local schema; includes `quantity`, `purchase_price`, `grade`, `notes`, `migration_status` (optional) for auditing.
- Unique constraint `(user_id, card_id, grading_company, grade, purchase_date)`.
- RLS: `auth.uid() = user_id` for all actions.

### 4.3 `watchlists` & `price_alerts`
- `watchlists` holds base entries; `price_alerts` allows multiple thresholds per card.
- Both reference `card_jp(id)` and enforce `auth.uid() = user_id`.

### 4.4 `migration_events`
- Tracks migration attempts (status, counts, error).

### 4.5 Migration Workflow
1. **Backup local data** (`*_backup_v1`).
2. **Validate** with Zod + Supabase constraints.
3. **Batch upload** (≤50 rows) using `insert`/`upsert` wrapped in RPC transaction.
4. **Verify** counts + sample data.
5. **Clear local storage** only after success.
6. **Log** success/failure in `migration_events`.

---

## 5. Phase 10 – WeChat Accounts 🔐
```sql
CREATE TABLE wechat_accounts (
  wechat_unionid TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE wechat_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_wechat" ON wechat_accounts USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 6. Row-Level Security Summary
| Table | Policy |
|-------|--------|
| price_history / market_indices / transactions | `USING (TRUE)` – SELECT only |
| users / user_settings / collections / watchlists / price_alerts | `USING (auth.uid() = user_id)` for SELECT/INSERT/UPDATE/DELETE |
| migration_events | `USING (auth.uid() = user_id)`; admin read via role-based condition |
| wechat_accounts | `USING (auth.uid() = user_id)` |

Implement RLS immediately after creating user tables. Use Supabase SQL editor or migrations.

---

## 7. Command Reference
```bash
# Apply Phase 01 migrations
pnpm supabase db push --env dev

# Generate types (core tables only)
task db:types

# After Phase 09 migrations, regenerate types
TASK_ENV=prod task db:types
```

---

## 8. Checklists
### Phase 01 Launch
- [ ] `price_history`, `market_indices`, `transactions` tables deployed.
- [ ] Public SELECT policies verified with anon key.
- [ ] Supabase types generated.
- [ ] CTI placeholder data seeded if eBay integration not ready.

### Phase 09 Launch
- [ ] Better Auth live.
- [ ] User tables created + RLS tested.
- [ ] Migration wizard dry-run with fixture data.
- [ ] `migration_events` audit logging enabled.
- [ ] Local storage backups documented.

---

## 9. References
- `planning/data-models.md`
- `planning/local-storage.md`
- `planning/data-migration.md`
- `planning/authentication-research.md`
- `implementation/phase-01` / `phase-09` task files
