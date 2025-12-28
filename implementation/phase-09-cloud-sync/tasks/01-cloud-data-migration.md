# Task: Local → Cloud Data Migration

**Task ID:** `phase-09-task-01`  
**Phase:** 09 – User Data Cloud Sync  
**Priority:** High  
**Estimated Time:** 20 hours  
**Dependencies:** Phase 08 authentication, Phases 05-06 local storage, Phase 01 schema

---

## 🎯 Objective
Create Supabase user tables (collections, watchlists, price_alerts) with RLS, implement the migration pipeline that lifts localStorage/IndexedDB data into the cloud after authentication, and provide user-facing tooling for progress, conflict resolution, and rollback.

---

## 📋 Context
Now that Better Auth exists, we can sync local data to Supabase. This requires carefully crafted tables with RLS, a deterministic migration process, conflict rules, and UX that builds trust. Once migration completes, local stores can be deleted (or marked synced) to avoid divergence.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Create Supabase tables: `collections`, `watchlists`, `price_alerts` referencing `auth.users`
- [ ] Enable RLS policies (users can only access their data)
- [ ] Implement migration service (`migrateLocalDataToCloud`) following provided template
- [ ] Provide progress UI (steps: analyze → upload → verify → cleanup)
- [ ] Conflict strategy: choose newest `updatedAt` wins, duplicates merged by `(card_id, grade, purchase_date)`
- [ ] Rollback ability: if migration fails mid-way, restore previous local data and mark attempt as failed

### Technical Requirements
- [ ] SQL migrations include indexes + constraints + `.limit()` usage in any helper queries
- [ ] Use Supabase `insert` with `onConflict` and `merge` logic where possible
- [ ] Wrap migration inserts in Supabase transaction via RPC or batched inserts with manual rollback tracking
- [ ] Store migration audit log (table `migration_events`) capturing status per user
- [ ] Unit tests for migration helpers + conflict resolution
- [ ] Manual QA plan for failure scenarios (network down, partial data, invalid entries)

---

## 📝 Implementation Details

### SQL Schema
```sql
CREATE TABLE collections (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id BIGINT NOT NULL REFERENCES card_jp(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purchase_price DECIMAL(10,2) NOT NULL CHECK (purchase_price >= 0),
  purchase_currency TEXT NOT NULL DEFAULT 'CNY',
  purchase_date DATE NOT NULL,
  grade TEXT,
  grading_company TEXT,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, grade, purchase_date)
);

CREATE INDEX idx_collections_user_card ON collections(user_id, card_id);

CREATE TABLE watchlists (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id BIGINT NOT NULL REFERENCES card_jp(id),
  target_price DECIMAL(10,2),
  target_currency TEXT DEFAULT 'CNY',
  alert_enabled BOOLEAN DEFAULT TRUE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX idx_watchlists_user_card ON watchlists(user_id, card_id);

CREATE TABLE price_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id BIGINT NOT NULL REFERENCES card_jp(id),
  direction TEXT NOT NULL CHECK (direction IN ('above','below')),
  threshold DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  alert_enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections"
  ON collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own watchlists"
  ON watchlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own price_alerts"
  ON price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Migration Function Template
```typescript
async function migrateLocalDataToCloud(userId: string): Promise<MigrationResult> {
  const localCollection = getLocalCollection();
  const localWatchlist = getLocalWatchlist();

  const validCollection = localCollection.filter(item => 
    addCollectionSchema.safeParse(item).success
  );

  const { data: collections, error: collectionError } = await supabase
    .from('collections')
    .insert(validCollection.map(item => ({ ...item, user_id: userId })))
    .select();

  if (collectionError) throw new Error(`Migration failed: ${collectionError.message}`);

  const { data: watchlists, error: watchlistError } = await supabase
    .from('watchlists')
    .insert(localWatchlist.map(item => ({ ...item, user_id: userId })));

  if (watchlistError) throw new Error(`Migration failed: ${watchlistError.message}`);

  localStorage.removeItem(STORAGE_KEYS.COLLECTION);
  localStorage.removeItem(STORAGE_KEYS.WATCHLIST);

  return {
    success: true,
    collectionCount: validCollection.length,
    watchlistCount: localWatchlist.length,
  };
}
```
Enhancements:
- Wrap inserts in RPC/stored procedure so both tables migrate atomically.
- Record migration event rows with status + counts.
- Only clear local storage after verifying inserts succeeded.

### Conflict Resolution
- Use `upsert` with `onConflict: 'user_id,card_id,grade,purchase_date'` for collections; merge quantities and keep latest `updated_at`.
- For watchlists, prefer cloud entry if `updated_at` newer; otherwise override with local.
- Provide UI summary showing merges/skipped entries.

### Rollback Strategy
- Keep backup copy of local data before migration: `localStorage.setItem('cardtrail_collection_backup_v1', JSON.stringify(...))`
- If migration fails, restore from backup and log event
- Provide "Retry" button; after success, delete backups

### UI Flow
1. User visits Settings → Data Sync
2. Wizard steps: Scan local data → Validate → Upload → Verify → Clean up
3. Display progress bar + counters; show success toast on completion
4. Provide "Download before syncing" button for peace of mind

---

## 🧪 Testing Strategy

### Unit Tests
- Validate SQL generation via Supabase CLI integration test
- Migration helper tests mocking Supabase client (success, partial failure, rollback)
- Conflict resolution tests for duplicate entries

### E2E Tests
- Playwright: Create local data, log in, trigger migration, verify Supabase tables via API mock, ensure local storage cleared
- Failure scenario: force network error to confirm rollback + warning banner

### Manual QA
- Simulate thousands of entries (load test) to ensure chunked uploads (batch size 50) work
- Validate multi-tab behavior (migration locked to single tab via mutex flag)
- Confirm RLS prevents cross-user data access post-migration

---

## ✅ Acceptance Criteria
- [ ] Supabase tables + RLS deployed and documented
- [ ] Migration service migrates both collections + watchlists atomically with conflict resolution
- [ ] UI wizard communicates progress, success counts, and warnings clearly
- [ ] Local storage cleared only after successful verification; backups removed after user confirmation
- [ ] Tests (unit + e2e) cover success + failure modes

---

## 📚 References
- `planning/data-migration.md`
- `planning/data-models.md`
- `planning/database-architecture.md`
- Supabase docs on `upsert` + RLS

---

## 🚧 Known Limitations
- Large datasets may require pagination/chunking; initial implementation uses batch size 50
- Real-time sync after migration depends on Supabase subscriptions (to be configured post-task)
- If user clears cookies between migration steps, backup restore required

---

## 📊 Success Metrics
- 95% of migrations complete in < 30 seconds (collections <= 500 entries)
- Error rate < 2%; automatic rollback triggered on 100% of failures
- Post-migration retention: < 5% of users opt out after seeing preview counts
