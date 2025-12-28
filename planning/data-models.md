# CardTrail Data Models (Auth Deferred Plan)

**Document Version:** 2.0  
**Last Updated:** December 5, 2025  
**Status:** Golden Source – Core tables ready, user tables deferred  
**Owner:** Database Architecture Team

> ⚠️ `card_jp` remains READ-ONLY. Never alter structure or data. Extend via foreign keys or views only.

---

## Overview
- **Phase 01 (Core Tables):** Public, read-only market data powering search, dashboards, and rankings. Includes `price_history`, `market_indices`, `transactions`, plus optional `card_extensions` view. **No auth dependency.**
- **Phases 05-06 (Local Schemas):** Local storage interfaces mirror future Supabase tables. Stored in `localStorage`/IndexedDB until migration.
- **Phases 08-09 (User Tables):** Auth-dependent tables (`collections`, `watchlists`, `price_alerts`, `users`, `user_settings`) created only after Better Auth lands. Documented here for future implementation.

### Table Groups
| Group | Phase | Tables | Notes |
|-------|-------|--------|-------|
| Core Market Data | 01 | `price_history`, `market_indices`, `transactions`, `card_extensions` (optional) | Public read-only (RLS allows SELECT only). |
| Local Storage | 05-06 | `LocalCollectionItem`, `LocalWatchlistItem`, `LocalSettings` (in-browser only) | Mirrors Supabase schema for Phase 09 migration. |
| User Data 🔐 | 08-09 | `users`, `user_settings`, `collections`, `watchlists`, `price_alerts`, `migration_events`, `wechat_accounts` | Created only after auth credentials available. RLS gated. |

---

## Core Tables (Phase 01 – No Auth)

### `card_jp` (Existing, Read-Only)
External master dataset (28,154 JP Pokémon cards). Query directly or via optional view. **Never ALTER/UPDATE.**

### `card_extensions` (Optional View/Table)
Stores cached CT prices + popularity metrics without touching `card_jp`.
```sql
CREATE TABLE card_extensions (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id) ON DELETE CASCADE,
  current_price_raw DECIMAL(10,2),
  current_price_psa9 DECIMAL(10,2),
  current_price_psa10 DECIMAL(10,2),
  price_updated_at TIMESTAMPTZ,
  popularity_score INTEGER DEFAULT 0,
  sales_volume_30d INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
(Enable triggers + indexes per original spec. Optional view `cards` can alias `card_jp` + `card_extensions`.)

### `price_history`
Tracks per-card daily prices (raw + grades) + volume metrics.
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

### `market_indices`
Stores CTI + sub-index time series.
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

### `transactions`
Caches normalized eBay sold listings feeding CT Price.
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

---

## Local Storage Schemas (Phases 05-06)
> See `planning/local-storage.md` for full strategy.

```typescript
export interface LocalCollectionItem {
  cardId: number;
  quantity: number;
  purchasePrice: number;
  purchaseCurrency: 'CNY' | 'USD' | 'JPY';
  purchaseDate: string;
  grade?: 'raw' | 'psa8' | 'psa9' | 'psa10';
  gradingCompany?: 'PSA' | 'BGS' | 'CGC';
  notes?: string;
  addedAt: string;
  updatedAt?: string;
  migrationStatus?: 'pending' | 'synced';
}

export interface LocalWatchlistItem {
  cardId: number;
  targetPrice?: number;
  targetCurrency?: 'CNY' | 'USD' | 'JPY';
  alertEnabled: boolean;
  addedAt: string;
  updatedAt?: string;
  migrationStatus?: 'pending' | 'synced';
}
```
- Stored under `STORAGE_KEYS.COLLECTION` / `WATCHLIST`.
- IndexedDB fallback when >100 entries or quota errors.
- Export format: `{ schemaVersion: 1, exportedAt, items: [...] }`.
- `migrationStatus` used by Phase 09 wizard.

---

## User Data Tables 🔐 (Phases 08-09)
These tables are **not** created until Better Auth is configured. Specs preserved here for future migration.

### `users`
Extends Supabase Auth.
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `user_settings`
Preferences per user (currency, theme, notifications, localization).

### `collections`, `watchlists`, `price_alerts`
Use schemas previously defined (see original doc). Key updates:
- Foreign keys point to `card_jp(id)`.
- Unique constraints align with local schema (`user_id, card_id, grade, purchase_date`).
- RLS policies `auth.uid() = user_id` enforced for SELECT/INSERT/UPDATE/DELETE.
- Insertions only occur after Phase 09 migration or post-auth actions.

### `migration_events`
Audit log for migration wizard.
```sql
CREATE TABLE migration_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('started','succeeded','failed')),
  collection_count INTEGER DEFAULT 0,
  watchlist_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `wechat_accounts` (Phase 10)
Stores WeChat unionid → user mapping for account linking.

---

## Migration Stages
1. **Stage A (Phase 01):** Deploy core tables + RLS for public read-only access. No auth or user tables involved.
2. **Stage B (Phases 05-06):** Ship local storage repositories + IndexedDB fallback. Ensure schemas match planned Supabase columns and include `migrationStatus` metadata.
3. **Stage C (Phase 08):** Introduce Better Auth + `users`/`user_settings` tables, but keep `collections/watchlists` creation staged until migration day.
4. **Stage D (Phase 09):** Create `collections`, `watchlists`, `price_alerts`, `migration_events`; enable RLS; run migration wizard per `planning/data-migration.md`.
5. **Stage E (Phase 10):** Add `wechat_accounts`, share features.

---

## Row-Level Security Snapshot
| Table | Phase | Policy |
|-------|-------|--------|
| price_history | 01 | `USING (TRUE)` (read-only) |
| market_indices | 01 | `USING (TRUE)` |
| transactions | 01 | `USING (TRUE)` |
| collections | 09 | `USING (auth.uid() = user_id)` (all actions) |
| watchlists | 09 | same as collections |
| price_alerts | 09 | same as collections |
| user_settings | 08 | `USING (auth.uid() = user_id)` |

---

## Type Generation
- Run `task db:types` after Phase 01 migrations to capture core tables.
- After Phase 09, rerun to include user tables.
- Local storage schemas exported separately for client-side validation (`packages/shared-types/local-storage.ts`).

---

## References
- `planning/database-architecture.md`
- `planning/local-storage.md`
- `planning/data-migration.md`
- `planning/feature-breakdown.md`
- `implementation/phase-0*/` folders for tactical tasks
