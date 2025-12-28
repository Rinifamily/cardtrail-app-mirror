# Phase 01 Migration Guide

## Overview

This guide explains how to apply the Phase 01 database migration for CardTrail's core public tables.

**Migration File:** `supabase/migrations/20251205000000_core_public_tables.sql`

**Created:** December 5, 2025  
**Task ID:** phase-01-task-01  
**Status:** ✅ Ready to apply

## What This Migration Does

### Tables Created

1. **`price_history`** - Per-card daily price tracking
   - Tracks raw, PSA 9, and PSA 10 prices
   - Includes sales volume
   - Supports multiple data sources

2. **`market_indices`** - CTI and sub-index time series
   - CardTrail Index (CTI) main index
   - Sub-indices: vintage, modern
   - 24h and 7d percentage changes

3. **`transactions`** - eBay sold listings cache
   - Raw transaction data for CT Price algorithm
   - Outlier detection support
   - Multi-currency support

### Features

- ✅ **Foreign keys** to `card_jp` table
- ✅ **Composite indexes** for optimal query performance
- ✅ **Row-Level Security** (public read-only access)
- ✅ **Unique constraints** on business keys
- ✅ **CHECK constraints** for data validation
- ✅ **Comprehensive SQL comments**

## How to Apply

### Prerequisites

- Access to Supabase Dashboard
- Admin permissions on the project
- Supabase project: `dmsvsfsbytemtbbqxqyi`

### Steps

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new
   ```

2. **Copy Migration SQL**
   - Open `supabase/migrations/20251205000000_core_public_tables.sql`
   - Copy entire file contents (150 lines)

3. **Execute Migration**
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for confirmation

4. **Verify Migration**
   ```bash
   cd apps/web
   node scripts/verify-migration.mjs
   ```

Expected output:
```
✅ Table 'price_history' exists and is queryable
✅ Table 'market_indices' exists and is queryable
✅ Table 'transactions' exists and is queryable
✅ Anonymous read access works
✅ Anonymous write blocked (expected)
```

5. **Generate TypeScript Types**
   ```bash
   cd apps/web
   pnpm db:types
   ```

## Verification Queries

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('price_history', 'market_indices', 'transactions');
```

**Expected:** 3 rows returned

### Check Indexes Created

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('price_history', 'market_indices', 'transactions')
ORDER BY tablename;
```

**Expected:** At least 6 indexes

### Check RLS Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('price_history', 'market_indices', 'transactions');
```

**Expected:** All show `rowsecurity = true`

### Check RLS Policies

```sql
SELECT tablename, policyname 
FROM pg_policies
WHERE tablename IN ('price_history', 'market_indices', 'transactions');
```

**Expected:** 3 policies (one per table)

### Test Anonymous Read (Should Succeed)

```sql
SET ROLE anon;
SELECT COUNT(*) FROM price_history;
SELECT COUNT(*) FROM market_indices;
SELECT COUNT(*) FROM transactions;
RESET ROLE;
```

**Expected:** Queries succeed (may return 0 if no data yet)

### Test Anonymous Write (Should Fail)

```sql
SET ROLE anon;
INSERT INTO price_history (card_id, date, price_raw) 
VALUES (12, CURRENT_DATE, 100.00);
```

**Expected:** Permission denied error

## Post-Migration Tasks

### 1. Update TypeScript Types

```bash
cd apps/web
pnpm db:types
```

This generates types in `lib/database.types.ts` from the new schema.

### 2. Verify Type Generation

Check that `database.types.ts` includes:
- `price_history` table definition
- `market_indices` table definition
- `transactions` table definition

### 3. Run Tests

```bash
# Test query helpers
cd ../../packages/db
pnpm test

# Test web app
cd ../../apps/web
pnpm test
```

### 4. Update Documentation (if needed)

If schema deviates from planning docs, update:
- `planning/database-architecture.md`
- `planning/data-models.md`

## Troubleshooting

### Error: "relation 'card_jp' does not exist"

**Problem:** Foreign key constraint fails because `card_jp` table doesn't exist.

**Solution:** Verify `card_jp` table exists:
```sql
SELECT COUNT(*) FROM card_jp;
-- Should return 28,154
```

### Error: "permission denied"

**Problem:** Insufficient permissions to create tables.

**Solutions:**
- Use service role key (not anon key)
- Request admin access from project owner
- Check you're logged into correct Supabase account

### Error: "duplicate key value violates unique constraint"

**Problem:** Migration already partially applied.

**Solution:** Rollback first:
```sql
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS market_indices CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
```

Then reapply migration.

### Types Not Generated

**Problem:** `pnpm db:types` fails or generates empty types.

**Solutions:**
1. Verify migration succeeded
2. Check .env.local has correct credentials
3. Run with verbose output:
   ```bash
   npx supabase gen types typescript --project-id dmsvsfsbytemtbbqxqyi --schema public
   ```

## Rollback

If you need to rollback this migration:

```sql
-- WARNING: This will delete all data in these tables!
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS market_indices CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
```

**Note:** Rollback is destructive. Only use in development or if migration fails.

## Migration File Details

- **File:** `supabase/migrations/20251205000000_core_public_tables.sql`
- **Size:** 6,973 bytes
- **Lines:** 150
- **Dependencies:** `card_jp` table (must exist)

## Next Steps

After successful migration:

1. ✅ Tables created and verified
2. ✅ Types generated
3. ✅ Query helpers available in `@cardtrail/db`
4. ✅ Tests passing

**Ready for Phase 02:** Search API and UI development can now begin!

## Support

For issues with this migration:

1. Check `supabase/README.md`
2. Review `planning/database-architecture.md`
3. Check verification scripts in `apps/web/scripts/`
4. Create GitHub issue with:
   - Error message
   - SQL query that failed
   - Supabase dashboard screenshot

## References

- **Planning:** `planning/database-architecture.md`
- **Data Models:** `planning/data-models.md`
- **Migration SQL:** `supabase/migrations/20251205000000_core_public_tables.sql`
- **Query Helpers:** `packages/db/README.md`
- **Task Spec:** `implementation/phase-01-database-core/tasks/01-core-database-schema.md`
