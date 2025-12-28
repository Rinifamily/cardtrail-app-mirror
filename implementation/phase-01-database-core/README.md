# Phase 01: Database Core (No Auth)

## 🎯 Overview
Phase 01 creates the read-only market data foundation required for search, card detail views, and market dashboards. We focus exclusively on public tables—`price_history`, `market_indices`, and `transactions`—plus Supabase type generation and RLS configuration. Authentication, user tables, and any write access remain deferred to Phases 08-10.

## ✅ Goals
- Deliver production-ready SQL migrations for all public market tables without touching `card_jp`
- Enforce RLS policies that allow anonymous reads while preventing unauthorized writes
- Generate and publish Supabase TypeScript types so downstream packages stay strictly typed
- Document testing procedures (SQL + Supabase policies) to unblock immediate development of Phases 02-04

## 🔗 Prerequisites
- Phase 00 scaffold complete (monorepo, Supabase project, Taskfile commands)
- Access to Supabase CLI and anon key configured locally
- Planning docs reviewed: `planning/database-architecture.md`, `planning/agents.md`

## 📦 Deliverables
- [ ] SQL migrations for `price_history`, `market_indices`, `transactions` (with indexes + foreign keys)
- [ ] RLS enabled + public SELECT policies applied to each table
- [ ] Documentation for Supabase type generation (`task db:types` or equivalent)
- [ ] Testing checklist covering schema creation, uniqueness constraints, and RLS verification
- [ ] Updated task file `tasks/01-core-database-schema.md` with implementation blueprint

## 🧪 Testing Strategy
- Run Supabase migrations locally and verify tables + indexes exist via `supabase db remote commit --dry-run`
- Use `psql` or Supabase SQL editor to confirm RLS policies allow public SELECT but block INSERT/UPDATE/DELETE without service role
- Execute `task db:types` (or manual CLI command) and ensure generated typings include new tables with correct shapes
- Write smoke tests (Vitest/Playwright) that fetch limited rows ( `.limit(50)` ) from the new tables to validate client access

## ⚠️ Known Limitations
- No user-specific tables or auth flows exist yet; all data is global and read-only
- price history and market index data will use placeholder/backfilled values until Phase 07 eBay ingestion
- Local testing relies on Supabase CLI; ensure network connectivity to avoid false negatives
- Any schema change beyond tables listed here must be coordinated with Database Architecture team to maintain migration integrity

## 📚 References
- `planning/database-architecture.md`
- `planning/data-models.md`
- `planning/feature-breakdown.md`
- Supabase CLI docs: https://supabase.com/docs/guides/cli
