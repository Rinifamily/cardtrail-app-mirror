# Phase 09: User Data Cloud Sync

## 🎯 Overview
Phase 09 introduces Supabase user tables (collections, watchlists, price_alerts) and the migration path that lifts local data (Phases 05-06) into the cloud once users authenticate. It covers schema creation, migration tooling, conflict resolution, rollback plans, and user-facing progress indicators.

## ✅ Goals
- Create Supabase tables + RLS policies for collections/watchlists/price_alerts referencing `auth.users`
- Build migration services that read local storage, validate with Zod, and insert into Supabase in transactions
- Provide UI to guide users through migration (status steps, toasts, retry flows)
- Document conflict resolution + rollback strategy (local vs cloud data)

## 🔗 Prerequisites
- Phase 08 authentication complete
- Phase 05-06 storing data via documented schemas
- Planning docs `planning/data-migration.md`, `planning/data-models.md`, `planning/database-architecture.md`

## 📦 Deliverables
- [ ] SQL migrations for user tables + RLS
- [ ] Migration service + CLI/Taskfile entry
- [ ] UI wizard inside profile/settings guiding migration
- [ ] Monitoring hooks (logs, Sentry) capturing successes/failures

## 🧪 Testing Strategy
- Unit tests for migration helpers + conflict resolution logic
- Integration tests (Supabase) running migration with mock local payloads
- QA plan covering failure modes (network, partial insert, validation errors)

## ⚠️ Known Limitations
- Real-time sync limited to Supabase subscriptions after migration; offline edits still local until Phase 10 enhancements
- Large collections may need chunked inserts; highlight expectation in UI

## 📚 References
- `planning/data-models.md`
- `planning/data-migration.md`
- `planning/database-architecture.md`
- `planning/feature-breakdown.md`
