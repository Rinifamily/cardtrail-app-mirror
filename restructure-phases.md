# Task: Restructure Development Phases - Auth Deferred

**Task ID:** restructure-phases  
**Priority:** High  
**Estimated Time:** 2-3 hours

---

## 🎯 Objective

重新规划 CardTrail 的开发阶段顺序，将 Authentication 推迟到后期阶段，优先实现核心 App 功能。

**核心原则：**
- 先做能立即使用的功能（搜卡、持仓、大盘、榜单）
- 使用本地存储 (localStorage/IndexedDB) 暂存用户数据
- Authentication 作为独立的后期阶段
- Auth 完成后再迁移本地数据到云端

---

## 📋 Current Phase Structure (TO BE CHANGED)

```
Phase 00: Foundation ✅ (Completed)
Phase 01: Database + Authentication  ← 需要拆分
Phase 02: Search & Card Display
Phase 03: Collection Management
Phase 04: Market Dashboard
Phase 05: Rankings
Phase 06: Profile & Settings
Phase 07: eBay Integration
```

---

## 🆕 New Phase Structure (TARGET)

```
Phase 00: Foundation ✅ (Completed)

=== CORE APP FEATURES (No Auth Required) ===

Phase 01: Database Schema (Core Tables Only)
├── Create price_history table
├── Create market_indices table  
├── Create transactions table (eBay data cache)
├── Skip: user, session, account tables (Auth phase)
├── Skip: collections, watchlists (Auth phase)
├── RLS: Public read-only for card_jp, price data
└── TypeScript types generation

Phase 02: Search & Card Display
├── Full-text search for card_jp (28K cards)
├── Filter panel (set, rarity, year)
├── Card grid with infinite scroll
├── Card detail page with price display
├── Price history chart (Recharts)
├── Recent transactions list
└── E2E tests for search flow

Phase 03: Market Dashboard (大盘)
├── CTI index display (placeholder data first)
├── K-line/candlestick chart
├── Market overview cards
├── Top gainers/losers
├── Volume statistics
└── Real-time feel (future: actual real-time)

Phase 04: Rankings (榜单)
├── Price change rankings (涨幅榜/跌幅榜)
├── Volume rankings (成交量榜)
├── Popular cards ranking
├── Card comparison feature
├── Filtering by timeframe (24h, 7d, 30d)
└── Share card/ranking feature

Phase 05: Local Collection (本地持仓)
├── Add cards to collection (localStorage)
├── Collection list view
├── Portfolio value calculation
├── P&L display (paper profit/loss)
├── Export/Import collection (JSON)
├── IndexedDB for larger storage
└── Note: Will migrate to cloud after Auth

Phase 06: Local Watchlist & Alerts (本地关注)
├── Add cards to watchlist (localStorage)
├── Watchlist management
├── Local price alerts (check on app load)
├── Push notification prep (PWA)
└── Note: Will migrate to cloud after Auth

=== EXTERNAL INTEGRATIONS ===

Phase 07: eBay Integration
├── eBay API connection
├── Real price data fetching
├── CT Price algorithm implementation
├── Transaction history sync
├── Price history population
└── Cron job for price updates

=== AUTHENTICATION (DEFERRED) ===

Phase 08: Authentication (Better Auth)
├── Better Auth setup
├── Phone Number plugin
├── SMS provider integration (Aliyun/Tencent)
├── Login/Register UI
├── Protected routes middleware
├── User profile basic
└── Reference: planning/authentication-research.md

Phase 09: User Data Cloud Sync
├── Create collections table (with user_id)
├── Create watchlists table (with user_id)
├── Create price_alerts table (with user_id)
├── Migrate localStorage → Supabase
├── Real-time sync setup
├── Conflict resolution strategy
└── Delete local data after migration

Phase 10: WeChat Login & Social
├── WeChat Open Platform setup
├── Generic OAuth integration
├── Account linking (phone + WeChat)
├── Profile enhancement
└── Social sharing features
```

---

## 📁 Files to Update

### 1. Update `implementation/README.md`

Create/update the implementation readme with new phase structure.

### 2. Create Phase Task Files

```
implementation/tasks/
├── phase-01/
│   └── 01-core-database-schema.md
├── phase-02/
│   ├── 01-search-api-and-ui.md
│   └── 02-card-detail-page.md
├── phase-03/
│   └── 01-market-dashboard.md
├── phase-04/
│   └── 01-rankings-feature.md
├── phase-05/
│   └── 01-local-collection.md
├── phase-06/
│   └── 01-local-watchlist.md
├── phase-07/
│   └── 01-ebay-integration.md
├── phase-08/
│   └── 01-better-auth-setup.md
├── phase-09/
│   └── 01-cloud-data-migration.md
└── phase-10/
    └── 01-wechat-login.md
```

### 3. Update `planning/` Documents

- `planning/feature-breakdown.md` - Update phase assignments
- `planning/data-models.md` - Mark auth tables as "Phase 08+"
- `planning/database-architecture.md` - Separate core vs auth tables

---

## 🔧 Implementation Details

### Phase 01: Core Database Schema

**Tables to Create NOW:**
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

-- Market indices (no user dependency)
CREATE TABLE market_indices (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  index_type TEXT NOT NULL, -- 'cti_overall', 'cti_vintage', etc.
  value DECIMAL(10,2) NOT NULL,
  change_24h DECIMAL(5,2),
  change_7d DECIMAL(5,2),
  volume BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, index_type)
);

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

-- Indexes
CREATE INDEX idx_price_history_card_date ON price_history(card_id, date DESC);
CREATE INDEX idx_market_indices_type_date ON market_indices(index_type, date DESC);
CREATE INDEX idx_transactions_card_date ON transactions(card_id, sold_date DESC);
```

**Tables to Create in Phase 08-09 (Auth):**
```sql
-- User tables (Better Auth managed)
-- user, session, account, verification

-- User data tables
-- collections, watchlists, price_alerts
```

### Phase 05-06: Local Storage Strategy

**localStorage Schema:**
```typescript
// Collection item
interface LocalCollectionItem {
  cardId: number;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  grade?: string;
  gradingCompany?: string;
  notes?: string;
  addedAt: string;
}

// Watchlist item
interface LocalWatchlistItem {
  cardId: number;
  targetPrice?: number;
  alertEnabled: boolean;
  addedAt: string;
}

// Storage keys
const STORAGE_KEYS = {
  COLLECTION: 'cardtrail_collection',
  WATCHLIST: 'cardtrail_watchlist',
  SETTINGS: 'cardtrail_settings',
};
```

**Migration Strategy (Phase 09):**
```typescript
// When user logs in for first time
async function migrateLocalDataToCloud(userId: string) {
  // 1. Read local data
  const localCollection = getLocalCollection();
  const localWatchlist = getLocalWatchlist();
  
  // 2. Upload to Supabase
  await supabase.from('collections').insert(
    localCollection.map(item => ({ ...item, user_id: userId }))
  );
  
  await supabase.from('watchlists').insert(
    localWatchlist.map(item => ({ ...item, user_id: userId }))
  );
  
  // 3. Clear local storage
  localStorage.removeItem(STORAGE_KEYS.COLLECTION);
  localStorage.removeItem(STORAGE_KEYS.WATCHLIST);
  
  // 4. Show success message
  toast.success('数据已同步到云端');
}
```

---

## ✅ Acceptance Criteria

### Document Updates
- [ ] `implementation/README.md` - New phase structure documented
- [ ] Phase directories created (phase-01 through phase-10)
- [ ] Each phase has at least one task file with clear scope
- [ ] `planning/` docs updated to reflect new phase assignments

### Phase 01 Task Ready
- [ ] `phase-01/01-core-database-schema.md` complete
- [ ] SQL migrations ready (price_history, market_indices, transactions)
- [ ] TypeScript types defined
- [ ] RLS policies for public read access

### Local Storage Design
- [ ] localStorage schema documented
- [ ] IndexedDB fallback for large collections documented
- [ ] Migration strategy to cloud documented

### Auth Phase Isolated
- [ ] Phase 08 task file references `planning/authentication-research.md`
- [ ] Clear dependency: Phase 08 blocks Phase 09
- [ ] Phase 09 includes data migration strategy

---

## 🚫 Constraints

Based on `planning/agents.md`:

1. **No `eslint-disable` comments**
2. **No `any` types** - use proper TypeScript
3. **No hardcoded credentials** - use environment variables
4. **All queries must use `.limit()`** 
5. **UUIDs for user-related IDs** (Phase 08+)
6. **BIGINTs for card/transaction IDs**

### Local Storage Constraints

- Maximum localStorage: ~5MB per domain
- Use IndexedDB for collections > 100 items
- Always handle storage quota errors gracefully
- Provide export/import as backup mechanism

---

## 📊 Phase Dependencies

```
Phase 00 ────┬──→ Phase 01 ──→ Phase 02 ──→ Phase 03
             │                    │
             │                    ├──→ Phase 04
             │                    │
             │                    └──→ Phase 05 ──→ Phase 06
             │
             └──→ Phase 07 (parallel after Phase 02)
             
Phase 05/06 ──→ Phase 08 ──→ Phase 09 ──→ Phase 10
```

**Parallel Work Possible:**
- Phase 03 (Market) and Phase 04 (Rankings) can be parallel
- Phase 05 (Collection) and Phase 06 (Watchlist) can be parallel
- Phase 07 (eBay) can start after Phase 02

**Sequential Dependencies:**
- Phase 02 (Search) requires Phase 01 (Database)
- Phase 08 (Auth) should wait until Phase 05/06 complete
- Phase 09 (Migration) requires Phase 08 (Auth)
- Phase 10 (WeChat) requires Phase 08 (Auth)

---

## 📝 Deliverables

1. **Updated `implementation/README.md`** with new phase structure
2. **Task files** for each phase (at least one per phase)
3. **Updated planning docs** reflecting new assignments
4. **Local storage design document** in `planning/local-storage.md`
5. **Migration strategy document** in `planning/data-migration.md`

---

## 🔗 Reference Documents

- `planning/authentication-research.md` - Better Auth research
- `planning/data-models.md` - Database schema
- `planning/agents.md` - AI coding constraints
- `planning/feature-breakdown.md` - Feature list
- `PROJECT_CONFIG.md` - Project configuration

---

## 🚀 Execution

After this restructure is complete:

1. **Phase 01 becomes immediately actionable** (no auth blockers)
2. **Phase 02-06 can proceed** without waiting for SMS/WeChat setup
3. **Phase 07 (eBay)** is independent of auth
4. **Phase 08-10 (Auth)** can be done when ready with all credentials

This allows for **faster iteration** on core features while **deferring the auth complexity** to a later stage when all prerequisites (SMS account, WeChat platform) are ready.

