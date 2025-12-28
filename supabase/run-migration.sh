#!/bin/bash

# Migration Script: Apply Phase 01 Core Public Tables
# This script applies SQL migration via Supabase SQL Editor API

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/apps/web/.env.local" ]; then
  export $(cat "$PROJECT_DIR/apps/web/.env.local" | grep -v '^#' | xargs)
else
  echo "❌ Error: .env.local not found"
  exit 1
fi

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

echo "🚀 Phase 01 Migration: Core Public Tables"
echo "=========================================="
echo ""
echo "📋 This migration will create:"
echo "   • price_history table (per-card daily prices)"
echo "   • market_indices table (CTI and sub-indices)"
echo "   • transactions table (eBay sold listings cache)"
echo "   • Indexes for query optimization"
echo "   • RLS policies (public read-only)"
echo ""

# Extract project ID from URL
PROJECT_ID=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "📊 Project: $PROJECT_ID"
echo "📂 Migration: supabase/migrations/20251205000000_core_public_tables.sql"
echo ""

# Check if service role key is available
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
  echo "    Manual migration required via Supabase Dashboard"
  echo ""
  echo "📝 Instructions:"
  echo "   1. Open: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
  echo "   2. Copy SQL from: supabase/migrations/20251205000000_core_public_tables.sql"
  echo "   3. Paste into SQL Editor"
  echo "   4. Click 'Run'"
  echo "   5. Verify with: node supabase/verify-migration.js"
  echo ""
  echo "Or get service role key from:"
  echo "   https://supabase.com/dashboard/project/$PROJECT_ID/settings/api"
  echo "   Add to .env.local as: SUPABASE_SERVICE_ROLE_KEY=..."
  exit 0
fi

# If service key available, use SQL API
echo "🔑 Service role key found, attempting automated migration..."
echo ""

MIGRATION_SQL=$(cat "$SCRIPT_DIR/migrations/20251205000000_core_public_tables.sql")

# Use Supabase SQL API
RESPONSE=$(curl -s -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}" \
  2>&1)

if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Migration failed via API"
  echo "   Response: $RESPONSE"
  echo ""
  echo "Please apply manually via Supabase Dashboard (see instructions above)"
  exit 1
else
  echo "✅ Migration executed successfully!"
  echo ""
  echo "🔍 Running verification..."
  node "$SCRIPT_DIR/verify-migration.js"
fi
