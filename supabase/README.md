# Supabase Migrations

This directory contains SQL migrations for the CardTrail database schema.

## Phase 01: Core Public Tables

**Migration File:** `migrations/20251205000000_core_public_tables.sql`

**Tables Created:**
- `price_history` - Per-card daily prices (raw + PSA9 + PSA10)
- `market_indices` - CTI and sub-index time series
- `transactions` - eBay sold listings cache

**Features:**
- ✅ Foreign keys to `card_jp` table
- ✅ Composite indexes for query optimization
- ✅ Row-Level Security (public read-only)
- ✅ Unique constraints on business keys
- ✅ Comprehensive SQL comments

## How to Apply Migrations

### Method 1: Supabase Dashboard (Recommended)

1. Open the SQL Editor:
   ```
   https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new
   ```

2. Copy the contents of `migrations/20251205000000_core_public_tables.sql`

3. Paste into the SQL Editor

4. Click **Run** to execute

5. Verify success (see below)

### Method 2: Using psql (if you have connection string)

```bash
# Add to .env.local:
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.dmsvsfsbytemtbbqxqyi.supabase.co:5432/postgres

psql $DATABASE_URL < supabase/migrations/20251205000000_core_public_tables.sql
```

### Method 3: Using Node.js Script (if you have service role key)

```bash
# Add to apps/web/.env.local:
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

./supabase/run-migration.sh
```

## Verification

After applying the migration, verify it worked:

```bash
node supabase/verify-migration.js
```

**Expected Output:**
```
✅ Table 'price_history' exists and is queryable
✅ Table 'market_indices' exists and is queryable  
✅ Table 'transactions' exists and is queryable
✅ Anonymous read access works for all tables
✅ Anonymous write blocked (expected)
```

## Manual Verification Queries

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('price_history', 'market_indices', 'transactions');
```

### Check Indexes

```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('price_history', 'market_indices', 'transactions')
ORDER BY tablename, indexname;
```

### Check RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('price_history', 'market_indices', 'transactions');
```

### Test Anonymous Read (should succeed)

```sql
SET ROLE anon;
SELECT COUNT(*) FROM price_history;
SELECT COUNT(*) FROM market_indices;
SELECT COUNT(*) FROM transactions;
RESET ROLE;
```

### Test Anonymous Write (should fail)

```sql
SET ROLE anon;
INSERT INTO price_history (card_id, date, price_raw) 
VALUES (12, '2025-12-05', 100.00);
-- Expected: permission denied error
RESET ROLE;
```

## Rollback

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS market_indices CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
```

⚠️ **Warning:** This will delete all data in these tables!

## Next Steps

After successful migration:

1. **Generate TypeScript types:**
   ```bash
   cd apps/web
   pnpm db:types
   ```

2. **Create query helpers** in `packages/db/src/queries/`

3. **Write tests** in `packages/db/src/__tests__/`

4. **Update documentation** in `planning/database-architecture.md`

## Troubleshooting

### Error: relation "card_jp" does not exist

The `card_jp` table must exist before applying this migration. Verify:

```sql
SELECT COUNT(*) FROM card_jp;
-- Should return 28,154
```

### Error: permission denied

You need either:
- Service role key for programmatic access
- Dashboard access with sufficient permissions
- Direct database connection string

### Tables exist but queries fail

Check RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('price_history', 'market_indices', 'transactions');
```

All should show `rowsecurity = true`.
