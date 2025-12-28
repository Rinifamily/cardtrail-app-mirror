# CardTrail Deployment & Operations

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Owner:** DevOps Team  
**Related Docs:** [Monorepo Architecture](monorepo-architecture.md), [Backend Architecture](backend-architecture.md), [Security & Privacy](security-privacy.md)

---

## 📖 Overview

This document defines the comprehensive deployment and operations strategy for CardTrail, a Pokemon TCG price tracking application. Our deployment strategy prioritizes simplicity, reliability, and rapid iteration while maintaining zero-downtime deployments.

### Deployment Philosophy

**Ship Fast, Ship Safe**

We balance speed and stability:
1. **Automated CI/CD**: Every commit is tested and deployable
2. **Preview Deployments**: Every PR gets its own deployment
3. **Zero Downtime**: Users never experience outages
4. **Instant Rollback**: Bad deploys can be reverted in seconds
5. **Infrastructure as Code**: All infrastructure is version-controlled

### Why Operations Matter

**Reliability is a feature, not an afterthought.**

Operations excellence enables us to:
- Deploy multiple times per day with confidence
- Detect and resolve issues before users notice
- Maintain 99.9% uptime
- Scale automatically to handle traffic spikes
- Recover quickly from incidents

---

## 🎯 Deployment Architecture

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Repository                            │
│                  (cardtrail-app monorepo)                       │
└────────────┬────────────────────────┬──────────────────────────┘
             │                        │
             │ Push to main          │ Pull Request
             ▼                        ▼
    ┌────────────────┐      ┌────────────────────┐
    │ GitHub Actions │      │  GitHub Actions    │
    │  CI Pipeline   │      │   PR Checks        │
    └────────┬───────┘      └────────┬───────────┘
             │                       │
             │ ✅ Tests Pass         │ ✅ Tests Pass
             ▼                       ▼
    ┌─────────────────┐     ┌──────────────────┐
    │ Vercel Deploy   │     │ Preview Deploy   │
    │  (Production)   │     │  (Temporary)     │
    └────────┬────────┘     └──────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │     Production Environment           │
    │  • apps/web → Vercel Edge Network    │
    │  • Supabase PostgreSQL (managed)     │
    │  • Vercel KV (Redis)                 │
    │  • Sentry (monitoring)               │
    └──────────────────────────────────────┘
```

### Three Environments

| Environment | Purpose | Deployment Trigger | URL | Database |
|-------------|---------|-------------------|-----|----------|
| **Development** | Local development | Manual (`pnpm dev`) | `localhost:3000` | Local Supabase or Dev instance |
| **Preview** | PR testing | Automatic on PR | `cardtrail-pr-123.vercel.app` | Staging Supabase |
| **Production** | Live app | Merge to `main` | `cardtrail.com` | Production Supabase |

---

## 🏗️ Environment Configuration

### Development Environment

**Setup:**

```bash
# 1. Clone repository
git clone https://github.com/your-org/cardtrail-app.git
cd cardtrail-app

# 2. Install pnpm
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Copy environment template
cp .env.example .env.local

# 5. Configure local Supabase (optional)
pnpm supabase init
pnpm supabase start

# 6. Generate database types
pnpm db:types

# 7. Start development server
pnpm dev
```

**.env.local (Development):**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...local_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...local_service_key

# eBay API (sandbox)
EBAY_APP_ID=dev_app_id
EBAY_DEV_ID=dev_dev_id
EBAY_CERT_ID=dev_cert_id
EBAY_SANDBOX_MODE=true

# Monitoring (optional for local)
SENTRY_DSN=https://...@sentry.io/dev
SENTRY_ENVIRONMENT=development

# Internal API
INTERNAL_API_KEY=dev_internal_key
```

### Preview Environment

**Automatic Setup:**
- Created automatically for each PR
- Temporary URL: `https://cardtrail-pr-{number}-{hash}.vercel.app`
- Uses staging database
- Auto-deleted after PR merge/close

**Environment Variables (Vercel Dashboard):**

```bash
# Supabase (Staging)
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...staging_service_key

# eBay API (sandbox)
EBAY_APP_ID=staging_app_id
EBAY_SANDBOX_MODE=true

# Monitoring
SENTRY_DSN=https://...@sentry.io/staging
SENTRY_ENVIRONMENT=preview

# Rate limiting (lower limits for preview)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### Production Environment

**Environment Variables (Vercel Dashboard):**

```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...prod_service_key

# eBay API (production)
EBAY_APP_ID=prod_app_id
EBAY_DEV_ID=prod_dev_id
EBAY_CERT_ID=prod_cert_id
EBAY_SANDBOX_MODE=false

# Monitoring
SENTRY_DSN=https://...@sentry.io/prod
SENTRY_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=...

# Rate limiting
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Internal API
INTERNAL_API_KEY=prod_internal_key

# Analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=...
```

**Configuring Environment Variables in Vercel:**

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable with appropriate scope:
   - **Production**: For `main` branch only
   - **Preview**: For all preview deployments
   - **Development**: For local development (optional)
3. Mark sensitive variables as "Encrypted"
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client

---

## 🏗️ CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

env:
  PNPM_VERSION: 8

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run ESLint
        run: pnpm lint
      
      - name: Run TypeScript type check
        run: pnpm type-check

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.STAGING_SUPABASE_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Build app
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
      
      - name: Run Playwright tests
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
  
  performance:
    name: Performance Check
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build app
        run: pnpm build
      
      - name: Run Lighthouse CI
        run: |
          pnpm add -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: [lint, test, e2e]
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-comment: true
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### Vercel Deployment

**Automatic Deployment:**
- Vercel automatically deploys on push to `main`
- No manual action needed
- Deployment status visible in GitHub PR

**Manual Deployment (if needed):**

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# Inspect logs
vercel logs
```

---

## 🏗️ Database Migrations

### Supabase Migration Workflow

**Creating Migrations:**

```bash
# Create new migration
pnpm supabase migration new add_watchlist_table

# This creates: supabase/migrations/YYYYMMDDHHMMSS_add_watchlist_table.sql
```

**Migration Example:**

```sql
-- supabase/migrations/20241204120000_add_watchlist_table.sql

-- Create watchlists table
CREATE TABLE watchlists (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id BIGINT NOT NULL REFERENCES card_jp(id) ON DELETE CASCADE,
  
  target_price DECIMAL(10,2),
  target_grade TEXT,
  alert_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, card_id)
);

-- Create indexes
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlists_card_id ON watchlists(card_id);
CREATE INDEX idx_watchlists_alert_enabled 
  ON watchlists(alert_enabled) 
  WHERE alert_enabled = TRUE;

-- Enable RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "watchlists_select_policy"
  ON watchlists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "watchlists_insert_policy"
  ON watchlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlists_update_policy"
  ON watchlists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlists_delete_policy"
  ON watchlists
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Rollback Migration:**

```sql
-- supabase/migrations/20241204120000_add_watchlist_table_rollback.sql

-- Drop policies
DROP POLICY IF EXISTS "watchlists_delete_policy" ON watchlists;
DROP POLICY IF EXISTS "watchlists_update_policy" ON watchlists;
DROP POLICY IF EXISTS "watchlists_insert_policy" ON watchlists;
DROP POLICY IF EXISTS "watchlists_select_policy" ON watchlists;

-- Drop indexes
DROP INDEX IF EXISTS idx_watchlists_alert_enabled;
DROP INDEX IF EXISTS idx_watchlists_card_id;
DROP INDEX IF EXISTS idx_watchlists_user_id;

-- Drop table
DROP TABLE IF EXISTS watchlists;
```

### Migration Process

#### 1. Development

```bash
# Create migration locally
pnpm supabase migration new my_migration

# Edit migration file
# supabase/migrations/YYYYMMDDHHMMSS_my_migration.sql

# Apply migration locally
pnpm supabase db reset

# Test migration
pnpm test:integration
```

#### 2. Staging

```bash
# Push to staging database
pnpm supabase db push --db-url $STAGING_DATABASE_URL

# Verify in Supabase dashboard
# Run smoke tests
pnpm test:e2e --project=staging
```

#### 3. Production

**⚠️ Critical: Always backup before production migrations**

```bash
# 1. Backup production database
pnpm supabase db backup --db-url $PRODUCTION_DATABASE_URL

# 2. Schedule maintenance window (if needed for breaking changes)
# Post notice on status page

# 3. Push migration to production
pnpm supabase db push --db-url $PRODUCTION_DATABASE_URL

# 4. Verify migration
pnpm supabase db inspect --db-url $PRODUCTION_DATABASE_URL

# 5. Run smoke tests
pnpm test:e2e --project=production

# 6. Monitor error logs for 1 hour
# Check Sentry, Vercel logs
```

### Migration Checklist

**Pre-Migration:**
- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Rollback script prepared
- [ ] Database backup created
- [ ] Team notified of deployment time
- [ ] Monitoring alerts enabled

**During Migration:**
- [ ] Migration applied to production
- [ ] Schema changes verified
- [ ] RLS policies verified
- [ ] Indexes created
- [ ] Application deployed (if needed)

**Post-Migration:**
- [ ] Smoke tests passed
- [ ] No errors in Sentry
- [ ] Performance metrics normal
- [ ] Monitoring for 1 hour
- [ ] Document any issues

### Rollback Procedure

**If migration fails:**

```bash
# 1. Stop application (if causing errors)
# Set maintenance mode or disable affected endpoints

# 2. Restore from backup
pnpm supabase db restore backup_YYYYMMDDHHMMSS.sql --db-url $PRODUCTION_DATABASE_URL

# 3. Verify restore
pnpm supabase db inspect --db-url $PRODUCTION_DATABASE_URL

# 4. Restart application
# Remove maintenance mode

# 5. Post-mortem
# Document what went wrong, how to prevent it
```

---

## 🏗️ Deployment Procedures

### Standard Deployment Flow

```
1. Developer creates PR
   ↓
2. CI runs tests (lint, type-check, unit, integration, e2e)
   ↓
3. Vercel creates preview deployment
   ↓
4. Code review + approval
   ↓
5. Merge to main
   ↓
6. CI runs tests again on main
   ↓
7. Vercel auto-deploys to production
   ↓
8. Sentry creates release tracking
   ↓
9. Monitor for 30 minutes
```

### Hotfix Deployment

**For critical bugs in production:**

```bash
# 1. Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/critical-bug-fix

# 2. Fix bug
# Edit code...

# 3. Test locally
pnpm test

# 4. Commit and push
git add .
git commit -m "hotfix: fix critical bug"
git push origin hotfix/critical-bug-fix

# 5. Create PR
gh pr create --title "Hotfix: Fix critical bug" --base main

# 6. Fast-track review
# Get immediate approval from tech lead

# 7. Merge and deploy
gh pr merge --squash
# Vercel deploys automatically

# 8. Monitor closely
# Watch Sentry for errors
```

### Database Migration Rollback Scripts

**Every migration MUST have a corresponding rollback script.**

```typescript
// scripts/rollback-migration.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

interface RollbackOptions {
  migrationId: string;
  dryRun?: boolean;
}

async function rollbackMigration({ migrationId, dryRun = false }: RollbackOptions) {
  const supabase = createClient(
    process.env.DATABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  console.log(`🔄 Rolling back migration: ${migrationId}`);
  
  // Find rollback file
  const rollbackPath = path.join(
    process.cwd(),
    'supabase/migrations',
    `${migrationId}_rollback.sql`
  );
  
  if (!fs.existsSync(rollbackPath)) {
    throw new Error(`Rollback file not found: ${rollbackPath}`);
  }
  
  // Read rollback SQL
  const rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8');
  
  if (dryRun) {
    console.log('🔍 Dry run - would execute:');
    console.log(rollbackSQL);
    return;
  }
  
  // Backup current state
  const backupFilename = `backup_before_rollback_${migrationId}_${Date.now()}.sql`;
  console.log(`📦 Creating backup: ${backupFilename}`);
  await createBackup(backupFilename);
  
  // Execute rollback
  console.log('⚙️  Executing rollback...');
  const { error } = await supabase.rpc('exec_sql', { sql: rollbackSQL });
  
  if (error) {
    console.error('❌ Rollback failed:', error);
    throw new Error(`Rollback failed: ${error.message}`);
  }
  
  // Update migration tracking table
  await supabase
    .from('schema_migrations')
    .update({
      rolled_back: true,
      rolled_back_at: new Date().toISOString(),
      rollback_by: process.env.USER || 'automated',
    })
    .eq('version', migrationId);
  
  console.log('✅ Rollback completed successfully');
  console.log(`📦 Backup saved: ${backupFilename}`);
}

async function createBackup(filename: string) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  await execPromise(
    `pg_dump ${process.env.DATABASE_URL} > backups/${filename}`
  );
}

// CLI usage
const args = process.argv.slice(2);
const migrationId = args.find(arg => arg.startsWith('--migration='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (!migrationId) {
  console.error('Usage: npm run db:rollback -- --migration=<migration_id> [--dry-run]');
  process.exit(1);
}

rollbackMigration({ migrationId, dryRun })
  .catch(error => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
```

**Example Rollback SQL:**

```sql
-- supabase/migrations/20241204120000_add_watchlist_table_rollback.sql

-- Drop policies first
DROP POLICY IF EXISTS "watchlists_delete_policy" ON watchlists;
DROP POLICY IF EXISTS "watchlists_update_policy" ON watchlists;
DROP POLICY IF EXISTS "watchlists_insert_policy" ON watchlists;
DROP POLICY IF EXISTS "watchlists_select_policy" ON watchlists;

-- Disable RLS
ALTER TABLE watchlists DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_watchlists_alert_enabled;
DROP INDEX IF EXISTS idx_watchlists_card_id;
DROP INDEX IF EXISTS idx_watchlists_user_id;

-- Drop table
DROP TABLE IF EXISTS watchlists;

-- Log rollback
INSERT INTO schema_migrations_log (action, migration_id, executed_at)
VALUES ('rollback', '20241204120000_add_watchlist_table', NOW());
```

**Usage:**

```bash
# Dry run (preview changes)
npm run db:rollback -- --migration=20241204120000_add_watchlist_table --dry-run

# Execute rollback
npm run db:rollback -- --migration=20241204120000_add_watchlist_table

# Verify database state
npm run db:status
```

### Application Rollback Procedures

**If production deployment has critical issues:**

#### Method 1: Instant Rollback (Vercel - FASTEST)

```bash
# List recent deployments
vercel ls cardtrail-app --prod

# Example output:
# Age    Deployment                           Status   URL
# 5m     cardtrail-app-abc123.vercel.app     Ready    https://cardtrail.com  ← Current
# 2h     cardtrail-app-def456.vercel.app     Ready    https://cardtrail-def456.vercel.app
# 1d     cardtrail-app-ghi789.vercel.app     Ready    https://cardtrail-ghi789.vercel.app

# Rollback to specific deployment
vercel rollback cardtrail-app-def456.vercel.app --prod

# Or via Vercel Dashboard:
# 1. Go to https://vercel.com/cardtrail/cardtrail-app/deployments
# 2. Find last working deployment (2h ago)
# 3. Click "..." menu → "Promote to Production"
# 4. Confirm promotion
# 5. New deployment goes live in ~30 seconds
```

#### Method 2: Git Revert (SAFEST)

```bash
# Identify problematic commit
git log --oneline -10

# Example output:
# abc123d Fix search bug     ← Current (BAD)
# def456e Add feature X      ← Last good
# ghi789f Update deps

# Revert problematic commit
git revert abc123d

# This creates a new commit that undoes abc123d
# Push to trigger new deployment
git push origin main

# Vercel automatically deploys reverted version
# Deployment completes in ~2 minutes
```

#### Method 3: Feature Flag Disable (QUICKEST)

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  newFeature: process.env.NEXT_PUBLIC_ENABLE_NEW_FEATURE === 'true',
  betaFeatures: process.env.NEXT_PUBLIC_ENABLE_BETA === 'true',
};

// Usage in components
import { featureFlags } from '@/lib/feature-flags';

export function NewFeature() {
  if (!featureFlags.newFeature) {
    return null; // Feature disabled
  }
  
  return <div>New Feature Content</div>;
}

// Emergency disable via Vercel:
# 1. Go to Vercel Dashboard → Settings → Environment Variables
# 2. Set NEXT_PUBLIC_ENABLE_NEW_FEATURE = false
# 3. Trigger redeploy
# 4. Feature disabled in ~30 seconds
```

#### Rollback Decision Matrix

| Situation | Method | Time | Risk | Use When |
|-----------|--------|------|------|----------|
| **Broken feature** | Feature Flag | 30s | Low | Feature can be toggled off |
| **Critical bug** | Vercel Rollback | 1min | Low | Recent deployment (<24h) |
| **Data corruption** | Git Revert | 3min | Medium | Need to preserve commit history |
| **Database issue** | DB Rollback | 5min | High | Migration caused problems |

---

## 🏗️ Monitoring & Logging

### Application Logs

**Vercel Logs:**

```bash
# View real-time logs
vercel logs

# Filter by function
vercel logs --function api/v1/cards

# Filter by time
vercel logs --since 1h

# Filter by status code
vercel logs --status 500
```

**Log Aggregation:**

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
    revision: process.env.VERCEL_GIT_COMMIT_SHA,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Usage in API routes
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  logger.info({ path: req.nextUrl.pathname }, 'API request received');
  
  try {
    const data = await fetchData();
    logger.info({ count: data.length }, 'Data fetched successfully');
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ error, path: req.nextUrl.pathname }, 'API request failed');
    throw error;
  }
}
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      externalAPIs: await checkExternalAPIs(),
    },
  };
  
  const allHealthy = Object.values(checks.checks).every((c) => c.status === 'ok');
  
  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}

async function checkDatabase() {
  try {
    const { error } = await supabase.from('card_jp').select('id').limit(1);
    return { status: error ? 'unhealthy' : 'ok', latency: '< 50ms' };
  } catch {
    return { status: 'unhealthy', latency: 'N/A' };
  }
}
```

### Uptime Monitoring

**UptimeRobot Configuration:**

```yaml
monitors:
  - name: CardTrail Homepage
    url: https://cardtrail.com
    type: HTTP(S)
    interval: 300 # 5 minutes
    alert_contacts:
      - email: devops@cardtrail.com
      - slack: #alerts
  
  - name: CardTrail API Health
    url: https://cardtrail.com/api/health
    type: HTTP(S)
    interval: 300
    expected_status: 200
```

---

## 🏗️ Scaling Strategy

### Automatic Scaling

**Vercel automatically scales:**
- Serverless functions: Unlimited concurrent executions
- Edge Network: Global CDN with automatic replication
- No configuration needed

### Database Scaling

**Supabase Scaling Plan:**

```
Phase 1 (MVP - 0-1K users):
  Tier: Free/Starter
  Resources: 500MB database, 50 connections
  Cost: $0-25/month
  
Phase 2 (Growth - 1K-10K users):
  Tier: Pro
  Resources: Unlimited database, 100+ connections
  Add read replicas for analytics queries
  Cost: $25-100/month
  
Phase 3 (Scale - 10K-100K users):
  Tier: Team/Enterprise
  Resources: Dedicated CPU, 200+ connections
  Add connection pooler (PgBouncer)
  Add read replicas in multiple regions
  Cost: $100-500/month
```

**Connection Pooling:**

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

// Use connection pooler URL for high concurrency
const POOLER_URL = process.env.SUPABASE_POOLER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabase = createClient(
  POOLER_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Serverless environments
    },
  }
);
```

### Caching Strategy

```typescript
// Vercel KV (Redis) for caching
import { kv } from '@vercel/kv';

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // Check cache
  const cached = await kv.get<T>(key);
  if (cached) return cached;
  
  // Cache miss - fetch and cache
  const data = await fetcher();
  await kv.set(key, data, { ex: ttl });
  
  return data;
}

// Usage
const card = await getCachedData(
  `card:${cardId}`,
  () => getCardById(cardId),
  86400 // 24 hours
);
```

---

## 🏗️ Incident Management

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 (Critical)** | Site down, data loss | < 5 minutes | Database offline, full outage |
| **P1 (High)** | Major feature broken | < 30 minutes | Search not working, login failing |
| **P2 (Medium)** | Minor feature broken | < 4 hours | Chart not loading, slow performance |
| **P3 (Low)** | Cosmetic issue | Next sprint | UI glitch, typo |

### Incident Response Playbook

#### 1. Detection (0-5 min)

**How incidents are detected:**
- Sentry alerts (error rate spike)
- Uptime Robot (site down)
- User reports (Twitter, email)
- Manual discovery (team member notices)

#### 2. Acknowledgment (0-5 min)

```
1. Acknowledge alert in Sentry/PagerDuty
2. Post in #incidents Slack channel:
   "🚨 INCIDENT: [Brief description]
    Severity: P0/P1/P2/P3
    Owner: @your-name
    Status: Investigating"
3. Update status page (if customer-facing)
```

#### 3. Investigation (5-15 min)

**Investigation Checklist:**

```bash
# 1. Check recent deployments
vercel ls --prod
# Look for deployments in last 2 hours

# 2. Check error rate in Sentry
# Go to https://sentry.io/cardtrail → Issues
# Filter by: last 1 hour, production environment

# 3. Check Vercel logs
vercel logs --since 1h --filter 5xx

# 4. Check database health
# Go to Supabase Dashboard → Logs
# Check connection pool usage, slow queries

# 5. Check external dependencies
# eBay API status, Upstash status, Vercel status

# 6. Reproduce issue
curl -I https://cardtrail.com/api/v1/cards
# Check response status and headers
```

**Questions to Answer:**
- What is the impact? (% users affected, features broken)
- When did it start? (check Sentry timeline, correlate with deployment)
- What changed recently? (last 3 deployments, migrations, config changes)
- Is it still happening? (reproduce the issue)
- What's the blast radius? (specific feature vs entire site)

#### 4. Mitigation (15-30 min)

**Decision Tree:**

```
Is site completely down?
├─ YES → Immediate rollback (Method 1)
└─ NO → Is it a new feature?
    ├─ YES → Disable feature flag (Method 3)
    └─ NO → Is it recent deployment (<2h)?
        ├─ YES → Rollback deployment (Method 1)
        └─ NO → Apply hotfix (Method 2)
```

**Quick Mitigation Options:**

```bash
# Option 1: Instant Rollback (30 seconds)
vercel rollback cardtrail-app-def456.vercel.app --prod

# Option 2: Feature Flag Disable (1 minute)
# Go to Vercel Dashboard → Settings → Environment Variables
# Set NEXT_PUBLIC_ENABLE_FEATURE_X = false
# Trigger redeploy

# Option 3: Maintenance Mode (2 minutes)
# Create maintenance page
vercel env add MAINTENANCE_MODE true
# Shows maintenance page to users while fixing

# Option 4: Scale Up (if performance issue)
# Upgrade Supabase tier temporarily
# Increase connection pool limits
```

**Mitigation Script:**

```typescript
// scripts/emergency-mitigation.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function emergencyMitigation(action: 'rollback' | 'maintenance' | 'disable-feature') {
  console.log(`🚨 Executing emergency mitigation: ${action}`);
  
  switch (action) {
    case 'rollback':
      // Find last working deployment
      const { stdout } = await execAsync('vercel ls --prod --json');
      const deployments = JSON.parse(stdout);
      const lastWorking = deployments.find((d: any) => 
        d.state === 'READY' && d.created < Date.now() - 3600000 // >1h old
      );
      
      if (lastWorking) {
        console.log(`Rolling back to: ${lastWorking.url}`);
        await execAsync(`vercel rollback ${lastWorking.url} --prod`);
        console.log('✅ Rollback complete');
      }
      break;
      
    case 'maintenance':
      console.log('Enabling maintenance mode...');
      await execAsync('vercel env add MAINTENANCE_MODE true --prod');
      await execAsync('vercel --prod --force'); // Force redeploy
      console.log('✅ Maintenance mode enabled');
      break;
      
    case 'disable-feature':
      console.log('Disabling new feature...');
      await execAsync('vercel env rm NEXT_PUBLIC_ENABLE_NEW_FEATURE --prod');
      await execAsync('vercel --prod --force');
      console.log('✅ Feature disabled');
      break;
  }
}

// Usage: npm run emergency -- rollback
const action = process.argv[2] as any;
emergencyMitigation(action);
```

#### 5. Resolution (30+ min)

**Permanent Fix Procedure:**

```bash
# 1. Create hotfix branch
git checkout main
git pull
git checkout -b hotfix/incident-inc-2024-001

# 2. Implement fix
# Edit code...

# 3. Add test to prevent regression
# Write E2E test that would have caught this bug

# 4. Test locally
pnpm test
pnpm build

# 5. Push and create PR
git add .
git commit -m "hotfix: fix search API timeout issue"
git push origin hotfix/incident-inc-2024-001
gh pr create --title "Hotfix: Fix search API timeout" --base main

# 6. Fast-track review
# Get immediate approval from tech lead

# 7. Merge and deploy
gh pr merge --squash

# 8. Verify fix in production
curl -I https://cardtrail.com/api/v1/cards?q=pikachu
# Check response time < 300ms

# 9. Monitor for 1 hour
# Watch Sentry, Vercel logs
```

#### 6. Communication

**Status Page Updates:**

```markdown
## Incident Update - Search Outage

**Status:** 🟢 Resolved
**Started:** Dec 4, 2024 14:30 UTC
**Resolved:** Dec 4, 2024 15:15 UTC
**Duration:** 45 minutes

### What Happened
The card search feature was returning errors (HTTP 500) due to a database query timeout.

### Impact
- Search feature unavailable
- ~1,250 users affected
- Other features (collection, profile) working normally

### Resolution
1. 14:32 - Issue detected via monitoring
2. 14:40 - Rolled back to previous deployment
3. 14:50 - Search feature restored
4. 15:00 - Deployed proper fix with database query optimization
5. 15:15 - Verified fix, monitoring period ended

### Prevention
- Added database query timeout limits
- Added missing database index
- Enhanced E2E tests for search performance

We apologize for the disruption. If you continue to experience issues, please contact support@cardtrail.com
```

**User Email Template (for P0/P1):**

```
Subject: [Resolved] Service Disruption - CardTrail

Dear CardTrail User,

We're writing to inform you about a service disruption that occurred on December 4, 2024.

WHAT HAPPENED:
Between 14:30-15:15 UTC, the card search feature was unavailable due to a database query timeout.

IMPACT:
- Card search returned errors
- Other features (collection, profile) were not affected
- No data was lost

RESOLUTION:
Our team identified and fixed the issue within 45 minutes. The search feature is now fully operational.

PREVENTION:
We've implemented additional database optimizations and monitoring to prevent similar issues.

We sincerely apologize for any inconvenience. If you have questions, please reply to this email.

Best regards,
CardTrail Team
```

#### 7. Post-Mortem (Within 48 hours)

```markdown
## Post-Mortem: Search Outage (2024-12-04)

**Incident ID:** INC-2024-001
**Date:** December 4, 2024 14:30-15:15 UTC (45 minutes)
**Severity:** P1 (High)
**Owner:** @developer-name

### Summary
Search API returned 500 errors due to missing database index.

### Timeline
- 14:30 - Deployment to production
- 14:32 - Sentry alert for API errors
- 14:35 - Incident acknowledged
- 14:45 - Root cause identified (missing index)
- 14:50 - Rollback initiated
- 15:00 - Rollback complete, search working
- 15:15 - Database index added, proper fix deployed

### Impact
- 1,250 users affected
- 100% of search requests failed
- 45 minute downtime

### Root Cause
Migration script did not include index on card_name column.

### What Went Well
- Fast detection (2 minutes)
- Quick rollback (15 minutes)
- Clear communication

### What Could Be Improved
- Migration should have been tested on staging with production data volume
- Missing E2E test for search performance

### Action Items
- [ ] Add E2E test for search performance
- [ ] Add staging environment with production-like data
- [ ] Require staging testing before production migration
- [ ] Add automated index checks in CI

### Lessons Learned
Always test migrations with realistic data volume.
```

---

## 🏗️ Disaster Recovery

### Backup Strategy

**Automated Backups:**
- Supabase: Daily automatic backups (7 days retention)
- Custom backups: Weekly full backups (30 days retention)
- Critical data: Real-time replication (Point-in-time recovery)

**Manual Backup:**

```bash
# Backup production database
pg_dump $PRODUCTION_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup to S3
aws s3 cp backup_*.sql s3://cardtrail-backups/

# Test restore (on staging)
psql $STAGING_DATABASE_URL < backup_20241204_120000.sql
```

### Recovery Procedures

#### Scenario 1: Database Corruption

```
1. Detect issue (data loss, corruption)
2. Stop all write operations
3. Identify last known good backup
4. Restore from backup to staging
5. Verify data integrity
6. Switch DNS to staging (temporary)
7. Restore to production
8. Switch DNS back to production
9. Re-apply missing transactions (if possible)
```

#### Scenario 2: Vercel Outage

```
1. Check Vercel status page
2. If extended outage:
   - Deploy to backup hosting (Cloudflare Pages)
   - Update DNS to point to backup
3. Communicate with users
4. Once Vercel restored, switch back
```

#### Scenario 3: Complete Data Loss

```
1. PANIC (briefly)
2. Restore from latest backup
3. Contact Supabase support
4. Restore from point-in-time backup (if available)
5. Manually reconstruct missing data (if possible)
6. Communicate transparently with users
7. Offer compensation (free premium, etc.)
```

### Recovery Time Objectives (RTO)

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Database failure | < 5 min | < 1 min | Automatic Supabase failover |
| Vercel outage | < 10 min | 0 | Wait or switch to backup hosting |
| Data corruption | < 30 min | < 24 hours | Restore from daily backup |
| Complete data loss | < 1 hour | < 7 days | Restore from weekly backup |

---

## ✅ Implementation Checklist

### Initial Setup
- [ ] Create GitHub repository
- [ ] Set up Vercel project
- [ ] Configure Vercel environment variables (dev, preview, prod)
- [ ] Set up Supabase projects (staging, production)
- [ ] Configure GitHub Actions workflows
- [ ] Set up Sentry projects (dev, staging, prod)
- [ ] Configure uptime monitoring (UptimeRobot)

### CI/CD
- [ ] Implement lint + type-check job
- [ ] Implement unit test job
- [ ] Implement integration test job
- [ ] Implement E2E test job
- [ ] Implement performance check job
- [ ] Configure automatic preview deployments
- [ ] Configure automatic production deployments
- [ ] Set up deployment notifications (Slack)

### Database
- [ ] Set up migration workflow
- [ ] Create rollback scripts for all migrations
- [ ] Set up automated backups
- [ ] Test restore procedure
- [ ] Document migration checklist
- [ ] Create database access documentation

### Monitoring
- [ ] Configure Sentry error tracking
- [ ] Set up performance monitoring
- [ ] Configure uptime monitoring
- [ ] Create health check endpoint
- [ ] Set up log aggregation
- [ ] Configure alert rules
- [ ] Test incident response procedures

### Documentation
- [ ] Document deployment process
- [ ] Create rollback runbook
- [ ] Document incident response procedures
- [ ] Create post-mortem template
- [ ] Document backup/restore procedures
- [ ] Train team on deployment process

---

## 🚨 Common Pitfalls

**Pitfall 1: Skipping Staging Testing**
**Problem:** Bugs reach production
**Solution:** Always test on staging with production-like data

**Pitfall 2: No Rollback Plan**
**Problem:** Stuck with broken deployment
**Solution:** Always have rollback strategy before deploying

**Pitfall 3: Unclear Ownership During Incidents**
**Problem:** Confusion about who is handling incident
**Solution:** Clear incident owner from the start

**Pitfall 4: Ignoring Logs**
**Problem:** Issues go unnoticed until users complain
**Solution:** Proactive monitoring with alerts

**Pitfall 5: No Post-Mortem**
**Problem:** Same issues repeat
**Solution:** Always conduct post-mortem and implement action items

---

## 📚 References

**External Resources:**
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Incident Management Best Practices](https://www.atlassian.com/incident-management)

**Internal Documentation:**
- [Monorepo Architecture](monorepo-architecture.md)
- [Backend Architecture](backend-architecture.md)
- [Security & Privacy](security-privacy.md)
- [Testing Strategy](testing-strategy.md)

---

## 🔄 Review & Updates

**Review Schedule:** Quarterly (every 3 months)

**Update Triggers:**
- Production incident occurs
- New deployment strategy adopted
- Team feedback on deployment pain points
- Infrastructure changes

**Quarterly Review Checklist:**
- [ ] Review deployment success rate
- [ ] Analyze incident response times
- [ ] Update runbooks based on lessons learned
- [ ] Test backup/restore procedures
- [ ] Review and rotate secrets
- [ ] Update team training

---

**Document Version:** 1.0  
**Created:** December 4, 2025  
**Contributors:** DevOps Team, Development Team  
**Next Review:** March 4, 2026

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Deployment & Operations
