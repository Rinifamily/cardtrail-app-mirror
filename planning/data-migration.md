# Data Migration Strategy (Phase 09)

_Last updated: 2025-12-05_

## 🎯 Purpose
Define how CardTrail migrates local-only data (Phases 05-06) into Supabase once authentication is live (Phase 08) and user tables exist (Phase 09). Covers schema, sequencing, UX, conflict handling, rollback, and testing.

## 🧭 Migration Flow
1. **Pre-checks**
   - User authenticated (Better Auth session).
   - Supabase tables (`collections`, `watchlists`, `price_alerts`) exist with RLS.
   - Local stores detected; counts + estimated upload size displayed.
2. **Backup**
   - Dump `localStorage`/IndexedDB payloads to `*_backup_v1` keys before modifying.
3. **Validation**
   - Run Zod schemas (`localCollectionSchema`, `localWatchlistSchema`). Invalid entries flagged for user review.
4. **Upload**
   - Batch items (<=50 records) and call Supabase `.insert()` / `upsert` with `.limit()` on verification queries.
   - Wrap batches in RPC transaction when both collections & watchlists migrate together.
5. **Verification**
   - Query Supabase to confirm inserted counts + sample data.
6. **Cleanup**
   - Clear local stores, remove backups after explicit user confirmation.
7. **Post-migration**
   - Subscribe to Supabase changes (real-time sync for future edits).

## 🧱 Target Tables (summary)
See `implementation/phase-09-cloud-sync/tasks/01-cloud-data-migration.md` for full SQL. Highlights:
- `collections`: unique on `(user_id, card_id, grade, purchase_date)`.
- `watchlists`: unique on `(user_id, card_id)`.
- `price_alerts`: separate table to support future multi-alert flows.
- `migration_events`: audit log capturing status, counts, error messages.

## ⚖️ Conflict Resolution
| Scenario | Strategy |
|----------|----------|
| Collection item exists in cloud & local | Merge quantities if same `(card, grade, date)`, otherwise create separate row. Latest `updatedAt` wins for notes/prices. |
| Watchlist entry duplicate | Prefer cloud entry if updated within last 24h; else overwrite with local values. |
| Price alert duplicate | Append as new alert if threshold differs; otherwise toggle `alert_enabled` according to latest edit. |
| Partial failure mid-batch | Roll back entire batch via transaction; leave local data untouched and surface error. |

## 🧑‍💻 User Experience
- Settings → Data Sync shows summary cards: "本地持仓 120 条 / 5.2MB", "本地关注 40 条".
- CTA "同步到云端" triggers wizard with progress steps.
- Provide warning copy: "同步后可在所有设备访问。如失败可重新导入。"
- During upload show progress bar + counts; on success show celebratory state + option to delete backups.
- Provide "Download data" link (JSON) before syncing for peace of mind.

## 🧨 Error Handling & Rollback
- Network error: show retry CTA; keep backups intact.
- Supabase validation error: list offending entries with reason, allow user to edit locally before retry.
- Auth/session expired: prompt re-login, resume from last safe step.
- Unexpected crash: backups ensure no data loss; log to Sentry with anonymized user ID + counts.

## 🔄 Audit Logging
`migration_events` table shape:
```sql
CREATE TABLE migration_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started','succeeded','failed')),
  collection_count INTEGER DEFAULT 0,
  watchlist_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
- Every attempt inserts "started" event.
- Update to "succeeded" or "failed" with counts/error.
- Use for analytics + support.

## 🧪 Testing Plan
- **Unit:** migration helpers (validation, batching, conflict merge) using mocked Supabase client.
- **Integration:** Supabase test project running full migration via CLI with fixture payloads.
- **E2E:** Playwright script creating local data → login → sync → verify remote data via API stub.
- **Load:** script generating 5k collection entries to test batching + rate limiting.
- **Manual:** Simulate offline toggle mid-migration to confirm rollback + messaging.

## 📋 Rollback Procedure
1. Detect failure.
2. Restore `*_backup_v1` payloads into primary keys.
3. Delete any partially inserted rows (based on `migration_events` + timestamps) via admin script / RPC.
4. Surface "Rollback complete" toast with support link.
5. Allow user to retry.

## 🔐 Security Notes
- Migration runs client-side using anon key (RLS ensures user boundary).
- Service-role operations (bulk cleanup) only via secure RPC invoked by backend on behalf of user.
- No sensitive info stored in logs; use hashed user ID when logging events.

## 📚 References
- `planning/local-storage.md`
- `planning/data-models.md`
- `implementation/phase-09-cloud-sync/tasks/01-cloud-data-migration.md`
- Supabase docs: [upsert](https://supabase.com/docs/reference/javascript/upsert), [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
